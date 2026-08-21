"use server";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

interface ActionResult {
  ok: boolean;
  message?: string;
  errors?: Record<string, string[]>;
  itemId?: number;
}

function formatIDR(n: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(n);
}

// ─── Create Inventory Item ─────────────────────────────

export async function createInventoryItemAction(
  tenantId: number,
  formData: FormData
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!session.user.unitId) return { ok: false, message: "User tidak terikat ke unit" };

  const unitId = session.user.unitId;
  const name = (formData.get("name") as string)?.trim();
  const sku = (formData.get("sku") as string)?.trim() || null;
  const category = (formData.get("category") as string)?.trim() || null;
  const sellPrice = parseFloat(formData.get("sellPrice") as string);
  const buyPrice = parseFloat((formData.get("buyPrice") as string) || "0") || null;
  const unitOfMeasure = (formData.get("unitOfMeasure") as string) || "pcs";
  const stock = parseInt((formData.get("stock") as string) || "0");
  const minStock = parseInt((formData.get("minStock") as string) || "0");

  const errors: Record<string, string[]> = {};
  if (!name) errors.name = ["Nama wajib diisi"];
  if (!sellPrice || sellPrice <= 0) errors.sellPrice = ["Harga jual harus > 0"];
  if (stock < 0) errors.stock = ["Stok tidak boleh negatif"];
  if (minStock < 0) errors.minStock = ["Min stok tidak boleh negatif"];

  if (Object.keys(errors).length > 0) {
    return { ok: false, message: "Validasi gagal", errors };
  }

  const existing = await prisma.inventoryItem.findUnique({
    where: { sku: sku || undefined },
    select: { id: true },
  }).catch(() => null);

  if (existing) {
    return { ok: false, message: "SKU sudah digunakan", errors: { sku: ["SKU sudah ada"] } };
  }

  const item = await prisma.inventoryItem.create({
    data: {
      tenantId,
      unitId,
      name,
      sku,
      category,
      sellPrice,
      buyPrice,
      unitOfMeasure,
      stock,
      minStock,
      createdById: Number(session.user.id),
    },
  });

  if (stock > 0) {
    await prisma.stockMovement.create({
      data: {
        inventoryId: item.id,
        type: "IN",
        quantity: stock,
        note: "Stok awal",
        createdById: Number(session.user.id),
      },
    });
  }

  revalidatePath(`/dashboard/tenant/${tenantId}/inventory`);

  return { ok: true, itemId: item.id, message: `Item "${name}" dibuat dengan stok ${stock}` };
}

// ─── Update Inventory Item ─────────────────────────────

export async function updateInventoryItemAction(
  tenantId: number,
  itemId: number,
  formData: FormData
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const item = await prisma.inventoryItem.findUnique({ where: { id: itemId } });
  if (!item || item.tenantId !== tenantId) {
    return { ok: false, message: "Item tidak ditemukan" };
  }

  const name = (formData.get("name") as string)?.trim();
  const sku = (formData.get("sku") as string)?.trim() || null;
  const category = (formData.get("category") as string)?.trim() || null;
  const sellPrice = parseFloat(formData.get("sellPrice") as string);
  const buyPrice = parseFloat((formData.get("buyPrice") as string) || "0") || null;
  const unitOfMeasure = (formData.get("unitOfMeasure") as string) || "pcs";
  const minStock = parseInt((formData.get("minStock") as string) || "0");

  const errors: Record<string, string[]> = {};
  if (!name) errors.name = ["Nama wajib diisi"];
  if (!sellPrice || sellPrice <= 0) errors.sellPrice = ["Harga jual harus > 0"];

  if (Object.keys(errors).length > 0) {
    return { ok: false, message: "Validasi gagal", errors };
  }

  await prisma.inventoryItem.update({
    where: { id: itemId },
    data: {
      name,
      sku,
      category,
      sellPrice,
      buyPrice,
      unitOfMeasure,
      minStock,
    },
  });

  revalidatePath(`/dashboard/tenant/${tenantId}/inventory`);
  revalidatePath(`/dashboard/tenant/${tenantId}/inventory/${itemId}`);

  return { ok: true, message: `Item "${name}" diperbarui` };
}

// ─── Stock Adjustment (manual IN/OUT) ─────────────────

export async function stockAdjustmentAction(
  tenantId: number,
  itemId: number,
  formData: FormData
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const type = formData.get("type") as string;
  const quantity = parseInt((formData.get("quantity") as string) || "0");
  const note = (formData.get("note") as string)?.trim() || null;

  if (!["IN", "OUT"].includes(type)) {
    return { ok: false, message: "Tipe tidak valid" };
  }
  if (quantity <= 0) {
    return { ok: false, message: "Jumlah harus > 0" };
  }

  const item = await prisma.inventoryItem.findUnique({ where: { id: itemId } });
  if (!item || item.tenantId !== tenantId) {
    return { ok: false, message: "Item tidak ditemukan" };
  }

  if (type === "OUT" && quantity > item.stock) {
    return { ok: false, message: `Stok tidak cukup (sisa ${item.stock} ${item.unitOfMeasure})` };
  }

  await prisma.$transaction([
    prisma.inventoryItem.update({
      where: { id: itemId },
      data: {
        stock: type === "IN" ? { increment: quantity } : { decrement: quantity },
      },
    }),
    prisma.stockMovement.create({
      data: {
        inventoryId: itemId,
        type,
        quantity,
        note: note || `Adjustment ${type === "IN" ? "masuk" : "keluar"}`,
        createdById: Number(session.user.id),
      },
    }),
  ]);

  revalidatePath(`/dashboard/tenant/${tenantId}/inventory`);
  revalidatePath(`/dashboard/tenant/${tenantId}/inventory/${itemId}`);

  const newStock = type === "IN" ? item.stock + quantity : item.stock - quantity;

  return {
    ok: true,
    message: `Stok ${type === "IN" ? "ditambah" : "dikurangi"} ${quantity}. Sisa: ${newStock} ${item.unitOfMeasure}`,
  };
}

// ─── Stock Opname ─────────────────────────────────────

export async function stockOpnameAction(
  tenantId: number,
  itemId: number,
  formData: FormData
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const physicalStock = parseInt((formData.get("physicalStock") as string) || "0");
  const note = (formData.get("note") as string)?.trim() || null;

  if (physicalStock < 0) {
    return { ok: false, message: "Stok fisik tidak boleh negatif" };
  }

  const item = await prisma.inventoryItem.findUnique({ where: { id: itemId } });
  if (!item || item.tenantId !== tenantId) {
    return { ok: false, message: "Item tidak ditemukan" };
  }

  const difference = physicalStock - item.stock;

  await prisma.$transaction([
    prisma.inventoryItem.update({
      where: { id: itemId },
      data: { stock: physicalStock },
    }),
    prisma.stockOpname.create({
      data: {
        inventoryId: itemId,
        physicalStock,
        difference,
        note,
        createdById: Number(session.user.id),
      },
    }),
    prisma.stockMovement.create({
      data: {
        inventoryId: itemId,
        type: difference >= 0 ? "IN" : "OUT",
        quantity: Math.abs(difference),
        note: `Stock opname adjustment`,
        createdById: Number(session.user.id),
      },
    }),
  ]);

  revalidatePath(`/dashboard/tenant/${tenantId}/inventory`);
  revalidatePath(`/dashboard/tenant/${tenantId}/inventory/${itemId}`);

  return {
    ok: true,
    message:
      difference === 0
        ? "Stok akurat, tidak ada selisih"
        : `Opname selesai. Selisih ${difference > 0 ? "lebih" : "kurang"} ${Math.abs(difference)} ${item.unitOfMeasure}`,
  };
}

// ─── Delete Inventory Item ────────────────────────────

export async function deleteInventoryItemAction(
  tenantId: number,
  itemId: number
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const item = await prisma.inventoryItem.findUnique({
    where: { id: itemId },
    select: { id: true, tenantId: true, name: true },
  });

  if (!item || item.tenantId !== tenantId) {
    return { ok: false, message: "Item tidak ditemukan" };
  }

  await prisma.inventoryItem.delete({ where: { id: itemId } });

  revalidatePath(`/dashboard/tenant/${tenantId}/inventory`);

  return { ok: true, message: `Item "${item.name}" dihapus` };
}
