"use server";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createNotificationAction } from "../notifikasi/actions";

interface ActionResult {
  ok: boolean;
  message?: string;
  errors?: Record<string, string[]>;
  poId?: number;
}

interface PoItemInput {
  inventoryId: number;
  quantity: number;
  unitPrice: number;
}

async function requireRetailAccess(tenantId: number) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (
    session.user.role !== "Pimpinan" &&
    session.user.role !== "Manager" &&
    session.user.role !== "Superadmin"
  ) {
    throw new Error("Hanya Pimpinan/Manager yang bisa mengelola PO");
  }
  if (
    session.user.role !== "Superadmin" &&
    session.user.tenantId !== tenantId
  ) {
    throw new Error("Akses ditolak");
  }
  return session;
}

async function getUnitRetailStatus(tenantId: number, unitId: number) {
  const unit = await prisma.unit.findUnique({
    where: { id: unitId },
    select: { type: true, retailEnabled: true },
  });
  return unit;
}

// ─── Create Purchase Order —────────────────────────────

export async function createPoAction(
  tenantId: number,
  unitId: number,
  supplierId: number,
  formData: FormData
): Promise<ActionResult> {
  let session;
  try {
    session = await requireRetailAccess(tenantId);
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }

  const unit = await getUnitRetailStatus(tenantId, unitId);
  if (!unit) return { ok: false, message: "Unit tidak ditemukan" };
  if (!unit.retailEnabled && unit.type !== "Retail") {
    return {
      ok: false,
      message: "Unit ini tidak mendukung fitur purchase order. Aktifkan retail mode.",
    };
  }

  const itemsRaw = formData.get("items") as string;
  const orderDate = formData.get("orderDate") as string;
  const notes = ((formData.get("notes") as string) || "").trim() || null;

  if (!itemsRaw) return { ok: false, message: "Item kosong" };

  let items: PoItemInput[];
  try {
    items = JSON.parse(itemsRaw);
  } catch {
    return { ok: false, message: "Format item tidak valid" };
  }

  if (!Array.isArray(items) || items.length === 0) {
    return { ok: false, message: "Minimal 1 item" };
  }

  const orderDateParsed = orderDate ? new Date(orderDate) : new Date();

  const supplier = await prisma.supplier.findUnique({
    where: { id: supplierId },
    select: { tenantId: true, unitId: true },
  });

  if (!supplier || supplier.tenantId !== tenantId) {
    return { ok: false, message: "Supplier tidak ditemukan" };
  }

  let totalAmount = 0;
  const validatedItems: Array<{ inventoryId: number; quantity: number; unitPrice: number; subtotal: number }> = [];

  for (const item of items) {
    if (item.quantity <= 0) return { ok: false, message: `Jumlah harus > 0 untuk item ${item.inventoryId}` };
    if (item.unitPrice <= 0) return { ok: false, message: `Harga harus > 0 untuk item ${item.inventoryId}` };

    const inv = await prisma.inventoryItem.findUnique({
      where: { id: item.inventoryId },
      select: { id: true, name: true, tenantId: true, unitId: true },
    });

    if (!inv || inv.tenantId !== tenantId) {
      return { ok: false, message: `Produk ID ${item.inventoryId} tidak valid` };
    }
    if (inv.unitId !== unitId) {
      return { ok: false, message: `Produk "${inv.name}" bukan dari unit ini` };
    }

    const subtotal = Number(item.unitPrice) * item.quantity;
    totalAmount += subtotal;
    validatedItems.push({
      inventoryId: item.inventoryId,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      subtotal,
    });
  }

  const po = await prisma.purchaseOrder.create({
    data: {
      tenantId,
      unitId,
      supplierId,
      orderDate: orderDateParsed,
      totalAmount,
      notes,
      createdById: Number(session.user.id),
      items: {
        create: validatedItems.map((i) => ({
          inventoryId: i.inventoryId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          subtotal: i.subtotal,
        })),
      },
    },
    select: { id: true },
  });

  // Notify Pimpinan about new PO
  if (session.user.role === "Manager" || session.user.role === "Staff") {
    await notifyPimpinan(tenantId, unitId, session.user.name || "Staff", po.id, supplier.name, totalAmount);
  }

  revalidatePath(`/dashboard/tenant/${tenantId}/po`);

  return { ok: true, poId: po.id, message: `PO #${po.id} dibuat. Total: ${formatIDR(totalAmount)}` };
}

// ─── Receive PO — triggers stock IN ─────────────────────

export async function receivePoAction(
  tenantId: number,
  poId: number
): Promise<ActionResult> {
  let session;
  try {
    session = await requireRetailAccess(tenantId);
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }

  const po = await prisma.purchaseOrder.findUnique({
    where: { id: poId },
    include: {
      items: { include: { inventory: { select: { name: true, unitOfMeasure: true } } } },
      supplier: { select: { name: true } },
      unit: { select: { name: true } },
    },
  });

  if (!po || po.tenantId !== tenantId) {
    return { ok: false, message: "PO tidak ditemukan" };
  }

  if (po.status !== "Pending") {
    return { ok: false, message: `PO sudah ${po.status}` };
  }

  // RBAC: Manager/Staff only kalo unit match
  if (
    session.user.role !== "Pimpinan" &&
    (session.user.role === "Manager" || session.user.role === "Staff")
  ) {
    if (po.unitId !== session.user.unitId) {
      return { ok: false, message: "PO ini milik unit lain" };
    }
  }

  // Update stock + create movement records
  for (const item of po.items) {
    await prisma.inventoryItem.update({
      where: { id: item.inventoryId },
      data: { stock: { increment: item.quantity } },
    });

    await prisma.stockMovement.create({
      data: {
        inventoryId: item.inventoryId,
        type: "IN",
        quantity: item.quantity,
        note: `PO #${poId} dari ${po.supplier.name}`,
        createdById: Number(session.user.id),
      },
    });
  }

  // Update PO status
  await prisma.purchaseOrder.update({
    where: { id: poId },
    data: {
      status: "Received",
      receivedAt: new Date(),
    },
  });

  // Notify supplier contact / system
  await createNotificationAction({
    tenantId,
    userId: Number(session.user.id),
    title: "PO Diterima",
    message: `PO #${poId} dari ${po.supplier.name} telah diterima. Stok diperbarui.`,
    type: "transaction",
  });

  revalidatePath(`/dashboard/tenant/${tenantId}/po`);
  revalidatePath(`/dashboard/tenant/${tenantId}/inventory`);
  revalidatePath(`/dashboard/tenant/${tenantId}/po/${poId}`);

  return {
    ok: true,
    message: `PO #${poId} diterima! ${po.items.length} item ditambahkan ke stok.`,
  };
}

// ─── Cancel PO ─────────────────────────────────────────

export async function cancelPoAction(
  tenantId: number,
  poId: number,
  reason?: string
): Promise<ActionResult> {
  let session;
  try {
    session = await requireRetailAccess(tenantId);
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }

  const po = await prisma.purchaseOrder.findUnique({
    where: { id: poId },
    select: { tenantId: true, status: true, unitId: true },
  });

  if (!po || po.tenantId !== tenantId) {
    return { ok: false, message: "PO tidak ditemukan" };
  }

  if (po.status !== "Pending" && po.status !== "Sent") {
    return { ok: false, message: "PO tidak bisa dibatalkan" };
  }

  await prisma.purchaseOrder.update({
    where: { id: poId },
    data: {
      status: "Cancelled",
      notes: reason ? `${po.notes || ""}\nCancellation: ${reason}`.trim() : po.notes,
    },
  });

  revalidatePath(`/dashboard/tenant/${tenantId}/po`);
  revalidatePath(`/dashboard/tenant/${tenantId}/po/${poId}`);

  return { ok: true, message: `PO #${poId} dibatalkan` };
}

// ─── Get PO Items for form validation ──────────────────

export async function getPoFormData(
  tenantId: number,
  unitId: number
): Promise<{
  ok: boolean;
  suppliers?: { id: number; name: string }[];
  inventoryItems?: { id: number; name: string; sellPrice: number; unitOfMeasure: string; stock: number }[];
}> {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [suppliers, items] = await Promise.all([
    prisma.supplier.findMany({
      where: { tenantId, unitId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.inventoryItem.findMany({
      where: { tenantId, unitId, stock: { lt: 10000 } },
      select: { id: true, name: true, sellPrice: true, unitOfMeasure: true, stock: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return { ok: true, suppliers, inventoryItems: items };
}

// ─── Internal helpers ──────────────────────────────────

function formatIDR(n: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(n);
}

async function notifyPimpinan(
  tenantId: number,
  unitId: number,
  requesterName: string,
  poId: number,
  supplierName: string,
  totalAmount: number
) {
  const pimpinan = await prisma.user.findFirst({
    where: { tenantId, role: "Pimpinan", isActive: true },
  });

  if (pimpinan) {
    await createNotificationAction({
      tenantId,
      userId: pimpinan.id,
      title: "PO Baru Dibuat",
      message: `${requesterName} membuat PO #${poId} ke ${supplierName} (Rp${formatIDR(totalAmount)})`,
      type: "transaction",
    });
  }
}
