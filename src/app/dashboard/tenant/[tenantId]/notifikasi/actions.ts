"use server";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

interface ActionResult {
  ok: boolean;
  message?: string;
  count?: number;
}

// ─── Mark Single Read ──────────────────────────────────

export async function markReadAction(notificationId: number): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const notif = await prisma.notification.findUnique({
    where: { id: notificationId },
    select: { id: true, userId: true, tenantId: true },
  });

  if (!notif) return { ok: false, message: "Notifikasi tidak ditemukan" };
  if (notif.userId !== Number(session.user.id) && session.user.role !== "Superadmin") {
    return { ok: false, message: "Akses ditolak" };
  }

  await prisma.notification.update({
    where: { id: notificationId },
    data: { read: true },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/tenant");

  return { ok: true };
}

// ─── Mark All Read ─────────────────────────────────────

export async function markAllReadAction(tenantId: number): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const result = await prisma.notification.updateMany({
    where: {
      userId: Number(session.user.id),
      tenantId,
      read: false,
    },
    data: { read: true },
  });

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/tenant/${tenantId}/notifikasi`);

  return { ok: true, count: result.count, message: `${result.count} notifikasi ditandai dibaca` };
}

// ─── Delete Notification ───────────────────────────────

export async function deleteNotificationAction(notificationId: number): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const notif = await prisma.notification.findUnique({
    where: { id: notificationId },
    select: { userId: true },
  });

  if (!notif) return { ok: false, message: "Notifikasi tidak ditemukan" };
  if (notif.userId !== Number(session.user.id)) {
    return { ok: false, message: "Akses ditolak" };
  }

  await prisma.notification.delete({ where: { id: notificationId } });

  revalidatePath(`/dashboard`);

  return { ok: true, message: "Notifikasi dihapus" };
}

// ─── Clear All Read ────────────────────────────────────

export async function clearAllReadAction(tenantId: number): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const result = await prisma.notification.deleteMany({
    where: {
      userId: Number(session.user.id),
      tenantId,
      read: true,
    },
  });

  revalidatePath(`/dashboard/tenant/${tenantId}/notifikasi`);

  return { ok: true, count: result.count, message: `${result.count} notifikasi dihapus` };
}

// ─── Create Notification (Internal helper) ─────────────

interface CreateNotificationInput {
  tenantId: number;
  userId: number;
  title: string;
  message: string;
  type: "approval" | "stock" | "transaction" | "system" | "reconciliation" | "shift";
}

export async function createNotificationAction(
  input: CreateNotificationInput
): Promise<{ ok: boolean; id?: number }> {
  const notif = await prisma.notification.create({
    data: {
      tenantId: input.tenantId,
      userId: input.userId,
      title: input.title,
      message: input.message,
      type: input.type,
      read: false,
    },
    select: { id: true },
  });

  return { ok: true, id: notif.id };
}
