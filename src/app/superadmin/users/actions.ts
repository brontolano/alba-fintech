"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth-utils";
import { logAction } from "@/lib/audit";
import bcrypt from "bcryptjs";

const ROLE_LABELS: Record<string, string> = {
  Pimpinan: "Pimpinan",
  Manager: "Manager",
  Staff: "Staff",
};

const userRoleSchema = z.enum(["Pimpinan", "Manager", "Staff", "Superadmin"]);

export type UserFormState = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string[]>;
};

export async function createUserAction(_prev: UserFormState, formData: FormData): Promise<UserFormState> {
  const user = await requireRole(["Superadmin"]);

  const raw = {
    name: (formData.get("name") as string) || "",
    email: (formData.get("email") as string) || "",
    password: (formData.get("password") as string) || "",
    role: formData.get("role") as string,
    tenantId: formData.get("tenantId") as string,
    unitId: formData.get("unitId") as string || null,
    isActive: formData.get("isActive") === "on",
  };

  if (!raw.name || raw.name.length < 2) {
    return { ok: false, message: "Nama minimal 2 karakter", errors: { name: ["Nama minimal 2 karakter"] } };
  }
  if (!raw.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw.email)) {
    return { ok: false, message: "Email tidak valid", errors: { email: ["Email tidak valid"] } };
  }
  if (!userRoleSchema.safeParse(raw.role).success) {
    return { ok: false, message: "Role tidak valid", errors: { role: ["Role tidak valid"] } };
  }
  if (!raw.tenantId) {
    return { ok: false, message: "Tenant wajib dipilih", errors: { tenantId: ["Tenant wajib dipilih"] } };
  }

  const roleVal = raw.role as z.infer<typeof userRoleSchema>;
  if ((roleVal === "Manager" || roleVal === "Staff") && !raw.unitId) {
    return { ok: false, message: "Unit wajib dipilih untuk Manager/Staff", errors: { unitId: ["Unit wajib"] } };
  }

  // Email uniqueness
  const dup = await prisma.user.findUnique({ where: { email: raw.email }, select: { id: true } });
  if (dup) return { ok: false, message: "Email sudah terdaftar", errors: { email: ["Email sudah terdaftar"] } };

  const passwordHash = await bcrypt.hash(raw.password || "password123", 10);

  const newUser = await prisma.user.create({
    data: {
      email: raw.email,
      name: raw.name,
      passwordHash,
      role: roleVal,
      tenantId: Number(raw.tenantId),
      unitId: raw.unitId ? Number(raw.unitId) : null,
      isActive: raw.isActive,
    },
  });

  await logAction({
    tenantId: Number(raw.tenantId),
    actorId: Number(user.id),
    action: "create",
    entity: "user",
    entityId: newUser.id,
    metadata: { email: raw.email, role: roleVal, name: raw.name },
  });

  revalidatePath("/superadmin");
  revalidatePath("/superadmin/managers");
  revalidatePath("/superadmin/staff");
  revalidatePath("/superadmin/pimpinan");
  redirect(roleVal === "Pimpinan" ? "/superadmin/pimpinan" : roleVal === "Manager" ? "/superadmin/managers" : "/superadmin/staff");
}

export async function updateUserAction(userId: number, _prev: UserFormState, formData: FormData): Promise<UserFormState> {
  const user = await requireRole(["Superadmin"]);

  const raw = {
    name: (formData.get("name") as string) || "",
    email: (formData.get("email") as string) || "",
    password: (formData.get("password") as string) || "",
    role: formData.get("role") as string,
    tenantId: formData.get("tenantId") as string,
    unitId: formData.get("unitId") as string || null,
    isActive: formData.get("isActive") === "on",
  };

  if (!raw.name || raw.name.length < 2) {
    return { ok: false, message: "Nama minimal 2 karakter", errors: { name: ["Nama minimal 2 karakter"] } };
  }
  if (!raw.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw.email)) {
    return { ok: false, message: "Email tidak valid", errors: { email: ["Email tidak valid"] } };
  }
  if (!userRoleSchema.safeParse(raw.role).success) {
    return { ok: false, message: "Role tidak valid", errors: { role: ["Role tidak valid"] } };
  }
  if (!raw.tenantId) {
    return { ok: false, message: "Tenant wajib dipilih", errors: { tenantId: ["Tenant wajib dipilih"] } };
  }

  const roleVal = raw.role as z.infer<typeof userRoleSchema>;
  if ((roleVal === "Manager" || roleVal === "Staff") && !raw.unitId) {
    return { ok: false, message: "Unit wajib dipilih untuk Manager/Staff", errors: { unitId: ["Unit wajib"] } };
  }

  const existing = await prisma.user.findUnique({ where: { id: userId }, select: { tenantId: true, email: true } });
  if (!existing) return { ok: false, message: "User tidak ditemukan" };

  // Email uniqueness (exclude self)
  const dup = await prisma.user.findFirst({
    where: { email: raw.email, NOT: { id: userId } },
    select: { id: true },
  });
  if (dup) return { ok: false, message: "Email sudah terdaftar pengguna lain", errors: { email: ["Email sudah terdaftar"] } };

  await prisma.user.update({
    where: { id: userId },
    data: {
      email: raw.email,
      name: raw.name,
      ...(raw.password ? { passwordHash: await bcrypt.hash(raw.password, 10) } : {}),
      role: roleVal,
      tenantId: Number(raw.tenantId),
      unitId: raw.unitId ? Number(raw.unitId) : null,
      isActive: raw.isActive,
    },
  });

  await logAction({
    tenantId: existing.tenantId,
    actorId: Number(user.id),
    action: "update",
    entity: "user",
    entityId: userId,
    metadata: { email: raw.email, role: roleVal, name: raw.name },
  });

  revalidatePath("/superadmin");
  revalidatePath("/superadmin/managers");
  revalidatePath("/superadmin/staff");
  revalidatePath("/superadmin/pimpinan");
  redirect(roleVal === "Pimpinan" ? "/superadmin/pimpinan" : roleVal === "Manager" ? "/superadmin/managers" : "/superadmin/staff");
}

export async function toggleUserActiveAction(userId: number): Promise<void> {
  const user = await requireRole(["Superadmin"]);
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { isActive: true, name: true, email: true, tenantId: true } });
  if (!u) return;

  await prisma.user.update({ where: { id: userId }, data: { isActive: !u.isActive } });
  await logAction({
    tenantId: u.tenantId,
    actorId: Number(user.id),
    action: u.isActive ? "deactivate" : "activate",
    entity: "user",
    entityId: userId,
    metadata: { email: u.email, name: u.name },
  });
  revalidatePath("/superadmin/managers");
  revalidatePath("/superadmin/staff");
  revalidatePath("/superadmin/pimpinan");
  redirect("/superadmin/managers");
}

export async function deleteUserAction(userId: number): Promise<{ ok: boolean; message?: string }> {
  const session = await requireRole(["Superadmin"]);
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, name: true, email: true, tenantId: true } });
  if (!u) return { ok: false, message: "User tidak ditemukan" };
  if (session.user.id === String(u?.id ?? "")) return { ok: false, message: "Tidak dapat menghapus akun sedang dipakai" };

  try {
    await prisma.user.delete({ where: { id: userId } });
    await logAction({
      tenantId: u.tenantId,
      actorId: Number(session.user.id),
      action: "delete",
      entity: "user",
      entityId: userId,
      metadata: { email: u.email, name: u.name, role: u.role },
    });
  } catch (err) {
    return { ok: false, message: "Gagal menghapus — mungkin ada data terkait" };
  }

  revalidatePath("/superadmin");
  revalidatePath("/superadmin/managers");
  revalidatePath("/superadmin/staff");
  revalidatePath("/superadmin/pimpinan");
  return { ok: true };
}
