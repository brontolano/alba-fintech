"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth-utils";
import { logAction } from "@/lib/audit";
import { SUPERADMIN_MODULES, isValidHexColor } from "@/lib/superadmin";

const tenantSchema = z.object({
  name: z.string().min(2, "Nama tenant minimal 2 karakter").max(80),
  appName: z.string().min(2, "Nama aplikasi minimal 2 karakter").max(80),
  primaryColor: z.string().refine(isValidHexColor, "Warna primary tidak valid"),
  secondaryColor: z.string().refine(isValidHexColor, "Warna secondary tidak valid"),
  subdomain: z.string().max(60).optional().or(z.literal("")),
  domain: z.string().max(120).optional().or(z.literal("")),
  activeModules: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
});

const MODULE_VALUES = SUPERADMIN_MODULES.map((m) => m.value) as [string, ...string[]];

export type TenantFormState = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string[]>;
};

export async function createTenantAction(
  _prev: TenantFormState,
  formData: FormData
): Promise<TenantFormState> {
  const user = await requireRole(["Superadmin"]);

  const activeModulesRaw = formData.getAll("activeModules") as string[];
  const raw = {
    name: (formData.get("name") as string | null) ?? "",
    appName: (formData.get("appName") as string | null) ?? "",
    primaryColor: (formData.get("primaryColor") as string | null) || "#1E3A5F",
    secondaryColor: (formData.get("secondaryColor") as string | null) || "#10B981",
    subdomain: ((formData.get("subdomain") as string | null) || "").trim(),
    domain: ((formData.get("domain") as string | null) || "").trim(),
    activeModules: activeModulesRaw.filter((m) =>
      (MODULE_VALUES as readonly string[]).includes(m)
    ),
    isActive: formData.get("isActive") === "on",
  };

  const parsed = tenantSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Data tidak valid",
      errors: parsed.error.flatten().fieldErrors,
    };
  }
  const data = parsed.data;

  // Uniqueness checks
  const existing = await prisma.tenant.findFirst({
    where: {
      OR: [
        { name: data.name },
        ...(data.subdomain ? [{ subdomain: data.subdomain }] : []),
      ],
    },
    select: { id: true, name: true, subdomain: true },
  });
  if (existing) {
    return {
      ok: false,
      message:
        existing.name === data.name
          ? "Nama tenant sudah dipakai"
          : `Subdomain sudah dipakai tenant ${existing.name}`,
    };
  }

  const tenant = await prisma.tenant.create({
    data: {
      name: data.name,
      appName: data.appName,
      primaryColor: data.primaryColor,
      secondaryColor: data.secondaryColor,
      subdomain: data.subdomain || null,
      domain: data.domain || null,
      activeModules: data.activeModules.join(","),
      isActive: data.isActive,
    },
  });

  await logAction({
    actorId: Number(user.id),
    action: "create",
    entity: "tenant",
    entityId: tenant.id,
    metadata: { name: tenant.name, appName: tenant.appName },
  });

  revalidatePath("/superadmin/tenants");
  revalidatePath("/superadmin");
  redirect("/superadmin/tenants");
}

export async function updateTenantAction(
  tenantId: number,
  _prev: TenantFormState,
  formData: FormData
): Promise<TenantFormState> {
  const user = await requireRole(["Superadmin"]);

  const activeModulesRaw = formData.getAll("activeModules") as string[];
  const raw = {
    name: (formData.get("name") as string | null) ?? "",
    appName: (formData.get("appName") as string | null) ?? "",
    primaryColor: (formData.get("primaryColor") as string | null) || "#1E3A5F",
    secondaryColor: (formData.get("secondaryColor") as string | null) || "#10B981",
    subdomain: ((formData.get("subdomain") as string | null) || "").trim(),
    domain: ((formData.get("domain") as string | null) || "").trim(),
    activeModules: activeModulesRaw.filter((m) =>
      (MODULE_VALUES as readonly string[]).includes(m)
    ),
    isActive: formData.get("isActive") === "on",
  };

  const parsed = tenantSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Data tidak valid",
      errors: parsed.error.flatten().fieldErrors,
    };
  }
  const data = parsed.data;

  const conflict = await prisma.tenant.findFirst({
    where: {
      NOT: { id: tenantId },
      OR: [
        { name: data.name },
        ...(data.subdomain ? [{ subdomain: data.subdomain }] : []),
      ],
    },
    select: { id: true, name: true },
  });
  if (conflict) {
    return {
      ok: false,
      message: `Nama atau subdomain sudah dipakai tenant lain (#${conflict.id})`,
    };
  }

  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      name: data.name,
      appName: data.appName,
      primaryColor: data.primaryColor,
      secondaryColor: data.secondaryColor,
      subdomain: data.subdomain || null,
      domain: data.domain || null,
      activeModules: data.activeModules.join(","),
      isActive: data.isActive,
    },
  });

  await logAction({
    actorId: Number(user.id),
    action: "update",
    entity: "tenant",
    entityId: tenantId,
    metadata: { name: data.name, appName: data.appName },
  });

  revalidatePath("/superadmin/tenants");
  revalidatePath(`/superadmin/tenants/${tenantId}`);
  redirect("/superadmin/tenants");
}

export async function toggleTenantActiveAction(tenantId: number): Promise<void> {
  const user = await requireRole(["Superadmin"]);
  const t = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { isActive: true, name: true },
  });
  if (!t) return;

  await prisma.tenant.update({
    where: { id: tenantId },
    data: { isActive: !t.isActive },
  });
  await logAction({
    actorId: Number(user.id),
    action: t.isActive ? "deactivate" : "activate",
    entity: "tenant",
    entityId: tenantId,
    metadata: { name: t.name },
  });
  revalidatePath("/superadmin/tenants");
}

export async function deleteTenantAction(tenantId: number): Promise<void> {
  const user = await requireRole(["Superadmin"]);

  // Block if tenant still has users (safer than cascade)
  const usedBy = await prisma.user.count({ where: { tenantId } });
  if (usedBy > 0) {
    throw new Error(
      `Tidak dapat menghapus: tenant masih dipakai oleh ${usedBy} pengguna`
    );
  }

  const t = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { name: true },
  });
  await prisma.tenant.delete({ where: { id: tenantId } });
  await logAction({
    actorId: Number(user.id),
    action: "delete",
    entity: "tenant",
    entityId: tenantId,
    metadata: { name: t?.name ?? "" },
  });
  revalidatePath("/superadmin/tenants");
}
