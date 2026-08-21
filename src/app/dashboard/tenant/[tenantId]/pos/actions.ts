"use server";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

// ─── Types ─────────────────────────────────────────────

interface SaleItemInput {
  inventoryId: number;
  quantity: number;
  priceAtSale: number;
}

interface ActionResult {
  ok: boolean;
  message?: string;
  saleId?: number;
  errors?: Record<string, string[]>;
}

// ─── Helpers ───────────────────────────────────────────

function formatIDR(n: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(n);
}

async function getOpenShift(tenantId: number, unitId: number) {
  return prisma.cashierShift.findFirst({
    where: { tenantId, unitId, status: "Open" },
    orderBy: { openedAt: "desc" },
  });
}

// ─── Create POS Sale ───────────────────────────────────

export async function createPosSaleAction(
  tenantId: number,
  formData: FormData
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!session.user.unitId && session.user.role !== "Pimpinan") {
    return { ok: false, message: "User tidak terikat ke unit manapun" };
  }
  const unitId = session.user.unitId!;

  const itemsRaw = formData.get("items") as string;
  const paymentMethod = (formData.get("paymentMethod") as string) || "Tunai";

  if (!itemsRaw) return { ok: false, message: "Item kosong" };

  let items: SaleItemInput[];
  try {
    items = JSON.parse(itemsRaw);
  } catch {
    return { ok: false, message: "Format item tidak valid" };
  }

  if (!Array.isArray(items) || items.length === 0) {
    return { ok: false, message: "Minimal 1 item" };
  }

  if (!["Tunai", "Transfer"].includes(paymentMethod)) {
    return { ok: false, message: "Metode pembayaran tidak valid" };
  }

  // Validate stock & compute total
  const inventoryIds = items.map((i) => i.inventoryId);
  const inventory = await prisma.inventoryItem.findMany({
    where: { id: { in: inventoryIds }, tenantId, unitId },
    select: { id: true, name: true, sellPrice: true, stock: true },
  });

  if (inventory.length !== items.length) {
    return { ok: false, message: "Ada item tidak ditemukan di inventory" };
  }

  let totalAmount = 0;
  for (const item of items) {
    const inv = inventory.find((i) => i.id === item.inventoryId);
    if (!inv) return { ok: false, message: `Item ID ${item.inventoryId} tidak ditemukan` };
    if (item.quantity <= 0) return { ok: false, message: "Jumlah item harus > 0" };
    if (item.quantity > inv.stock) {
      return { ok: false, message: `Stok ${inv.name} tidak cukup (sisa ${inv.stock})` };
    }
    if (Number(inv.sellPrice) !== item.priceAtSale) {
      return { ok: false, message: `Harga ${inv.name} berubah, refresh halaman` };
    }
    totalAmount += item.priceAtSale * item.quantity;
  }

  // Get or create shift
  let shift = await getOpenShift(tenantId, unitId);
  if (!shift) {
    shift = await prisma.cashierShift.create({
      data: {
        tenantId,
        unitId,
        openedBy: Number(session.user.id),
        openingCash: 0,
        status: "Open",
      },
    });
  }

  // Create sale + decrement stock + record movements
  const sale = await prisma.posSale.create({
    data: {
      tenantId,
      unitId,
      totalAmount,
      paymentMethod,
      status: "Completed",
      shiftId: shift.id,
      createdById: Number(session.user.id),
      items: {
        create: items.map((item) => ({
          inventoryId: item.inventoryId,
          quantity: item.quantity,
          priceAtSale: item.priceAtSale,
          subtotal: item.priceAtSale * item.quantity,
        })),
      },
    },
  });

  // Decrement stock + create movement records
  for (const item of items) {
    await prisma.inventoryItem.update({
      where: { id: item.inventoryId },
      data: { stock: { decrement: item.quantity } },
    });
    await prisma.stockMovement.create({
      data: {
        inventoryId: item.inventoryId,
        type: "OUT",
        quantity: item.quantity,
        note: `POS Sale #${sale.id}`,
        createdById: Number(session.user.id),
      },
    });
  }

  // Create transaction record (auto-approved for POS)
  await prisma.transaction.create({
    data: {
      tenantId,
      unitId,
      userId: Number(session.user.id),
      transactionDate: new Date(),
      type: "Debit",
      method: paymentMethod,
      category: "Penjualan POS",
      amount: totalAmount,
      description: `POS Sale #${sale.id} (${items.length} items)`,
      status: "Approved",
      approvedById: Number(session.user.id),
      approvedAt: new Date(),
    },
  });

  // Update unit balance
  await prisma.unit.update({
    where: { id: unitId },
    data: { balance: { increment: totalAmount } },
  });

  revalidatePath(`/dashboard/tenant/${tenantId}/pos`);

  return { ok: true, saleId: sale.id, message: `Penjualan ${formatIDR(totalAmount)} berhasil` };
}

// ─── Void POS Sale ─────────────────────────────────────

export async function voidPosSaleAction(
  tenantId: number,
  saleId: number
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const sale = await prisma.posSale.findUnique({
    where: { id: saleId },
    include: { items: true },
  });

  if (!sale) return { ok: false, message: "Transaksi tidak ditemukan" };
  if (sale.tenantId !== tenantId) return { ok: false, message: "Akses ditolak" };
  if (sale.status !== "Completed") return { ok: false, message: "Hanya transaksi Completed yang bisa void" };

  // Void the sale
  await prisma.posSale.update({
    where: { id: saleId },
    data: { status: "Void" },
  });

  // Restore stock + create IN movements
  for (const item of sale.items) {
    await prisma.inventoryItem.update({
      where: { id: item.inventoryId },
      data: { stock: { increment: item.quantity } },
    });
    await prisma.stockMovement.create({
      data: {
        inventoryId: item.inventoryId,
        type: "IN",
        quantity: item.quantity,
        note: `Void POS Sale #${saleId}`,
        createdById: Number(session.user.id),
      },
    });
  }

  // Reverse transaction
  await prisma.transaction.create({
    data: {
      tenantId,
      unitId: sale.unitId,
      userId: Number(session.user.id),
      transactionDate: new Date(),
      type: "Kredit",
      method: sale.paymentMethod,
      category: "Void POS",
      amount: Number(sale.totalAmount),
      description: `Void POS Sale #${saleId}`,
      status: "Approved",
      approvedById: Number(session.user.id),
      approvedAt: new Date(),
    },
  });

  // Reverse unit balance
  await prisma.unit.update({
    where: { id: sale.unitId },
    data: { balance: { decrement: Number(sale.totalAmount) } },
  });

  revalidatePath(`/dashboard/tenant/${tenantId}/pos`);

  return { ok: true, message: "Transaksi dibatalkan, stok dikembalikan" };
}

// ─── Open Shift ────────────────────────────────────────

export async function openShiftAction(
  tenantId: number,
  formData: FormData
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!session.user.unitId) return { ok: false, message: "User tidak terikat ke unit" };

  const unitId = session.user.unitId;
  const openingCash = parseFloat((formData.get("openingCash") as string) || "0");

  if (isNaN(openingCash) || openingCash < 0) {
    return { ok: false, message: "Kas awal tidak valid" };
  }

  const existing = await getOpenShift(tenantId, unitId);
  if (existing) return { ok: false, message: "Shift sudah dibuka" };

  const shift = await prisma.cashierShift.create({
    data: {
      tenantId,
      unitId,
      openedBy: Number(session.user.id),
      openingCash,
      status: "Open",
    },
  });

  revalidatePath(`/dashboard/tenant/${tenantId}/pos/shift`);

  return { ok: true, message: `Shift dibuka dengan kas awal ${formatIDR(openingCash)}` };
}

// ─── Close Shift ───────────────────────────────────────

export async function closeShiftAction(
  tenantId: number,
  formData: FormData
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!session.user.unitId) return { ok: false, message: "User tidak terikat ke unit" };

  const unitId = session.user.unitId;
  const closingCash = parseFloat((formData.get("closingCash") as string) || "0");
  const note = (formData.get("note") as string) || null;

  if (isNaN(closingCash) || closingCash < 0) {
    return { ok: false, message: "Kas akhir tidak valid" };
  }

  const shift = await getOpenShift(tenantId, unitId);
  if (!shift) return { ok: false, message: "Tidak ada shift yang terbuka" };

  // Sum all completed sales for this shift
  const sales = await prisma.posSale.findMany({
    where: { shiftId: shift.id, status: "Completed" },
    select: { totalAmount: true, paymentMethod: true },
  });

  const cashSales = sales
    .filter((s) => s.paymentMethod === "Tunai")
    .reduce((sum, s) => sum + Number(s.totalAmount), 0);

  const expectedCash = Number(shift.openingCash) + cashSales;
  const difference = closingCash - expectedCash;

  await prisma.cashierShift.update({
    where: { id: shift.id },
    data: {
      closedBy: Number(session.user.id),
      closedAt: new Date(),
      closingCash,
      cashDifference: difference,
      note,
      status: "Closed",
    },
  });

  revalidatePath(`/dashboard/tenant/${tenantId}/pos/shift`);
  revalidatePath(`/dashboard/tenant/${tenantId}/pos`);

  const diffMsg =
    Math.abs(difference) < 100
      ? "Sesuai"
      : difference > 0
      ? `Selisih lebih ${formatIDR(difference)}`
      : `Selisih kurang ${formatIDR(Math.abs(difference))}`;

  return { ok: true, message: `Shift ditutup. Kas akhir ${formatIDR(closingCash)}. ${diffMsg}` };
}
