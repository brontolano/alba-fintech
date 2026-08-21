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

const createSchema = z.object({
  name: z.string().min(1, "Nama wajib diisi").max(100),
  type: z.enum(["Debit", "Kredit"], { errorMap: () => ({ message: "Tipe tidak valid" }) }),
  unitId: z.coerce.number().int().optional(),
});

const updateSchema = createSchema.extend({
  id: z.coerce.number().int().positive(),
});

async function requirePimpinan(tenantId: number) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (
    session.user.role !== "Pimpinan" &&
    session.user.role !== "Superadmin" &&
    session.user.tenantId !== tenantId
  ) {
    throw new Error("Akses ditolak");
  }
  return session;
}

export async function createCategoryAction(
  tenantId: number,
  formData: FormData
): Promise<ActionResult> {
  let session;
  try {
    session = await requirePimpinan(tenantId);
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }

  const raw = {
    name: (formData.get("name") as string)?.trim(),
    type: formData.get("type") as string,
    unitId: formData.get("unitId") as string,
  };

  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Validasi gagal",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const unitId = parsed.data.unitId || undefined;

  const existing = await prisma.category.findFirst({
    where: {
      tenantId,
      name: parsed.data.name,
      type: parsed.data.type,
      unitId: unitId ?? null,
    },
    select: { id: true },
  });

  if (existing) {
    return { ok: false, message: "Kategori sudah ada", errors: { name: ["Kategori sudah ada untuk tipe/unit ini"] } };
  }

  await prisma.category.create({
    data: {
      tenantId,
      name: parsed.data.name,
      type: parsed.data.type,
      unitId,
    },
  });

  revalidatePath(`/dashboard/tenant/${tenantId}/kategori`);
  revalidatePath(`/dashboard/tenant/${tenantId}/transaksi/new`);

  return { ok: true, message: `Kategori "${parsed.data.name}" dibuat` };
}

export async function updateCategoryAction(
  tenantId: number,
  formData: FormData
): Promise<ActionResult> {
  let session;
  try {
    session = await requirePimpinan(tenantId);
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }

  const raw = {
    id: formData.get("id") as string,
    name: (formData.get("name") as string)?.trim(),
    type: formData.get("type") as string,
    unitId: formData.get("unitId") as string,
  };

  const parsed = updateSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Validasi gagal",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const existing = await prisma.category.findUnique({
    where: { id: parsed.data.id },
    select: { tenantId: true },
  });

  if (!existing || existing.tenantId !== tenantId) {
    return { ok: false, message: "Kategori tidak ditemukan" };
  }

  await prisma.category.update({
    where: { id: parsed.data.id },
    data: {
      name: parsed.data.name,
      type: parsed.data.type,
      unitId: parsed.data.unitId || null,
    },
  });

  revalidatePath(`/dashboard/tenant/${tenantId}/kategori`);
  revalidatePath(`/dashboard/tenant/${tenantId}/transaksi/new`);

  return { ok: true, message: "Kategori diperbarui" };
}

export async function deleteCategoryAction(
  tenantId: number,
  categoryId: number
): Promise<ActionResult> {
  let session;
  try {
    session = await requirePimpinan(tenantId);
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }

  const existing = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { tenantId: true, name: true },
  });

  if (!existing || existing.tenantId !== tenantId) {
    return { ok: false, message: "Kategori tidak ditemukan" };
  }

  const inUse = await prisma.transaction.count({
    where: { category: existing.name },
  });

  if (inUse > 0) {
    return {
      ok: false,
      message: `Kategori "${existing.name}" masih dipakai di ${inUse} transaksi`,
    };
  }

  await prisma.category.delete({ where: { id: categoryId } });

  revalidatePath(`/dashboard/tenant/${tenantId}/kategori`);
  revalidatePath(`/dashboard/tenant/${tenantId}/transaksi/new`);

  return { ok: true, message: `Kategori "${existing.name}" dihapus` };
}
