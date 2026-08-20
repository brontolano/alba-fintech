import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";

export type UserRole = "Superadmin" | "Pimpinan" | "Manager" | "Staff";

export interface SessionUser {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: UserRole;
  unitId: number | null;
  tenantId: number | null;
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user) return null;

  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    image: session.user.image,
    role: session.user.role as UserRole,
    unitId: session.user.unitId,
    tenantId: session.user.tenantId,
  };
}

export async function requireAuth(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

export async function requireRole(allowedRoles: UserRole[]): Promise<SessionUser> {
  const user = await requireAuth();
  if (!allowedRoles.includes(user.role)) {
    redirect("/unauthorized");
  }
  return user;
}

export async function requireTenant(): Promise<{ user: SessionUser; tenantId: number }> {
  const user = await requireAuth();
  if (!user.tenantId) {
    redirect("/unauthorized");
  }
  return { user, tenantId: user.tenantId };
}

export async function requireUnit(): Promise<{ user: SessionUser; unitId: number }> {
  const user = await requireAuth();
  if (!user.unitId) {
    redirect("/unauthorized");
  }
  return { user, unitId: user.unitId };
}

export async function canAccessUnit(unitId: number): Promise<boolean> {
  const { user } = await requireTenant();
  if (user.role === "Superadmin" || user.role === "Pimpinan") return true;
  return user.unitId === unitId;
}

export async function canAccessTenant(tenantId: number): Promise<boolean> {
  const { user } = await requireTenant();
  if (user.role === "Superadmin") return true;
  return user.tenantId === tenantId;
}