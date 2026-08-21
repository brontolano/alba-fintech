"use server";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";

interface ActionResult {
  ok: boolean;
  message?: string;
  errors?: Record<string, string[]>;
}

const supplierSchema = z.object({
  name: z.string().min(1, "Nama wajib diisi").max(100),
  contact: z.string().max(100).optional().nullable(),
  email: z.string().email("Format email tidak valid").max(100).optional().nullable().or(z.literal("")),
  phone: z.string().max(20).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
});

async function requireSupplierAccess(tenantId: number) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (
    session.user.role !== "Pimpinan" &&
    session.user.role !== "Manager" &&
    session.user.role !== "Superadmin"
  ) {
    throw new Error("Hanya Pimpinan/Manager yang bisa mengelola supplier");
  }
  if (
    session.user.role !== "Superadmin" &&
    session.user.tenantId !== tenantId
  ) {
    throw new Error("Akses ditolak");
  }
  return session;
}

export async function createSupplierAction(
  tenantId: number,
  unitId: number,
  formData: FormData
): Promise<ActionResult> {
  let session;
  try {
    session = await requireSupplierAccess(tenantId);
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }

  const raw = {
    name: (formData.get("name") as string)?.trim(),
    contact: ((formData.get("contact") as string) || "").trim() || null,
    email: ((formData.get("email") as string) || "").trim() || null,
    phone: ((formData.get("phone") as string) || "").trim() || null,
    address: ((formData.get("address") as string) || "").trim() || null,
  };

  const parsed = supplierSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Validasi gagal",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const existing = await prisma.supplier.findFirst({
    where: { tenantId, unitId, name: parsed.data.name },
    select: { id: true },
  });

  if (existing) {
    return { ok: false, message: "Supplier sudah ada", errors: { name: ["Nama sudah dipakai"] } };
  }

  await prisma.supplier.create({
    data: {
      tenantId,
      unitId,
      name: parsed.data.name,
      contact: parsed.data.contact,
      email: parsed.data.email || null,
      phone: parsed.data.phone,
      address: parsed.data.address,
    },
  });

  revalidatePath(`/dashboard/tenant/${tenantId}/supplier`);

  return { ok: true, message: `Supplier "${parsed.data.name}" dibuat` };
}

export async function updateSupplierAction(
  tenantId: number,
  supplierId: number,
  formData: FormData
): Promise<ActionResult> {
  let session;
  try {
    session = await requireSupplierAccess(tenantId);
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }

  const raw = {
    name: (formData.get("name") as string)?.trim(),
    contact: ((formData.get("contact") as string) || "").trim() || null,
    email: ((formData.get("email") as string) || "").trim() || null,
    phone: ((formData.get("phone") as string) || "").trim() || null,
    address: ((formData.get("address") as string) || "").trim() || null,
  };

  const parsed = supplierSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Validasi gagal",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const existing = await prisma.supplier.findUnique({
    where: { id: supplierId },
    select: { tenantId: true },
  });

  if (!existing || existing.tenantId !== tenantId) {
    return { ok: false, message: "Supplier tidak ditemukan" };
  }

  await prisma.supplier.update({
    where: { id: supplierId },
    data: {
      name: parsed.data.name,
      contact: parsed.data.contact,
      email: parsed.data.email || null,
      phone: parsed.data.phone,
      address: parsed.data.address,
    },
  });

  revalidatePath(`/dashboard/tenant/${tenantId}/supplier`);

  return { ok: true, message: "Supplier diperbarui" };
}

export async function deleteSupplierAction(
  tenantId: number,
  supplierId: number
): Promise<ActionResult> {
  let session;
  try {
    session = await requireSupplierAccess(tenantId);
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }

  const existing = await prisma.supplier.findUnique({
    where: { id: supplierId },
    select: { tenantId: true, name: true, _count: { select: { purchaseOrders: true } } },
  });

  if (!existing || existing.tenantId !== tenantId) {
    return { ok: false, message: "Supplier tidak ditemukan" };
  }

  if (existing._count.purchaseOrders > 0) {
    return {
      ok: false,
      message: `Supplier "${existing.name}" masih dipakai di ${existing._count.purchaseOrders} purchase order`,
    };
  }

  await prisma.supplier.delete({ where: { id: supplierId } });

  revalidatePath(`/dashboard/tenant/${tenantId}/supplier`);

  return { ok: true, message: `Supplier "${existing.name}" dihapus` };
}
