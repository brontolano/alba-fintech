"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth-utils";
import { logAction } from "@/lib/audit";

const unitSchema = z.object({
  name: z.string().min(2, "Nama unit minimal 2 karakter").max(80),
  type: z.enum(["Sederhana", "Retail"], { message: "Tipe unit tidak valid" }),
  retailEnabled: z.boolean().default(false),
  description: z.string().max(200).optional().nullable(),
  tenantId: z.coerce.number().int({ message: "Tenant wajib dipilih" }),
});

export type UnitFormState = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string[]>;
};

export async function createUnitAction(_prev: UnitFormState, formData: FormData): Promise<UnitFormState> {
  const user = await requireRole(["Superadmin"]);

  const raw = {
    name: (formData.get("name") as string) || "",
    type: formData.get("type") as string,
    retailEnabled: formData.get("retailEnabled") === "on",
    description: (formData.get("description") as string) || null,
    tenantId: formData.get("tenantId"),
  };

  const parsed = unitSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: "Data tidak valid", errors: parsed.error.flatten().fieldErrors };
  }
  const data = parsed.data;

  // Duplicate name within same tenant
  const exists = await prisma.unit.findUnique({
    where: { tenantId_name: { tenantId: data.tenantId, name: data.name } },
    select: { id: true },
  });
  if (exists) {
    return { ok: false, message: `Unit "${data.name}" sudah ada di tenant ini`, errors: { name: ["Duplikat"] } };
  }

  const unit = await prisma.unit.create({
    data: {
      name: data.name,
      type: data.type,
      retailEnabled: data.retailEnabled,
      description: data.description,
      tenant: { connect: { id: data.tenantId } },
    },
  });

  await logAction({
    tenantId: data.tenantId,
    actorId: Number(user.id),
    action: "create",
    entity: "unit",
    entityId: unit.id,
    metadata: { name: unit.name, type: unit.type },
  });

  revalidatePath("/superadmin/units");
  redirect("/superadmin/units");
}

export async function updateUnitAction(unitId: number, _prev: UnitFormState, formData: FormData): Promise<UnitFormState> {
  const user = await requireRole(["Superadmin"]);

  const raw = {
    name: (formData.get("name") as string) || "",
    type: formData.get("type") as string,
    retailEnabled: formData.get("retailEnabled") === "on",
    description: (formData.get("description") as string) || null,
    tenantId: formData.get("tenantId"),
  };

  const parsed = unitSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: "Data tidak valid", errors: parsed.error.flatten().fieldErrors };
  }
  const data = parsed.data;

  const existing = await prisma.unit.findUnique({
    where: { id: unitId },
    select: { id: true, tenantId: true },
  });
  if (!existing) return { ok: false, message: "Unit tidak ditemukan" };

  // Prevent changing tenant (move is destructive — must delete/recreate)
  if (data.tenantId !== existing.tenantId) {
    return { ok: false, message: "Tenant tidak dapat diubah — hapus & buat ulang", errors: { tenantId: ["Tidak dapat diubah"] } };
  }

  await prisma.unit.update({
    where: { id: unitId },
    data: {
      name: data.name,
      type: data.type,
      retailEnabled: data.retailEnabled,
      description: data.description,
    },
  });

  await logAction({
    tenantId: existing.tenantId,
    actorId: Number(user.id),
    action: "update",
    entity: "unit",
    entityId: unitId,
    metadata: data,
  });

  revalidatePath("/superadmin/units");
  redirect("/superadmin/units");
}

export async function deleteUnitAction(unitId: number): Promise<{ ok: boolean; message?: string }> {
  const user = await requireRole(["Superadmin"]);

  const usedBy = await prisma.$transaction([
    prisma.user.count({ where: { unitId: unitId } }),
    prisma.transaction.count({ where: { unitId: unitId } }),
    prisma.inventoryItem.count({ where: { unitId: unitId } }),
  ]);

  if (usedBy.some((c) => c > 0)) {
    return { ok: false, message: "Unit tidak dapat dihapus: masih ada data terkait" };
  }

  const u = await prisma.unit.findUnique({ where: { id: unitId }, select: { name: true, tenantId: true } });
  await prisma.unit.delete({ where: { id: unitId } });

  await logAction({
    tenantId: u?.tenantId ?? null,
    actorId: Number(user.id),
    action: "delete",
    entity: "unit",
    entityId: unitId,
    metadata: { name: u?.name ?? "" },
  });

  revalidatePath("/superadmin/units");
  return { ok: true };
}
