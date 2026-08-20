import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import Link from "next/link";
import { ArrowLeft, Bell, Check, X, AlertTriangle, TrendingUp, Wallet, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { revalidatePath } from "next/cache";

interface NotifikasiPageProps {
  params: Promise<{ tenantId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export const dynamic = "force-dynamic";

function formatRelativeTime(date: Date) {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Baru saja";
  if (minutes < 60) return `${minutes} menit lalu`;
  if (hours < 24) return `${hours} jam lalu`;
  if (days < 7) return `${days} hari lalu`;
  return format(new Date(date), "dd MMM yyyy", { locale: id });
}

function NotificationIcon({ type }: { type: string }) {
  const icons: Record<string, React.ReactNode> = {
    approval: <TrendingUp className="w-5 h-5 text-primary" />,
    stock: <AlertTriangle className="w-5 h-5 text-warning" />,
    transaction: <Wallet className="w-5 h-5 text-income" />,
    system: <Building2 className="w-5 h-5 text-on-surface-variant" />,
    reconciliation: <Building2 className="w-5 h-5 text-primary" />,
  };
  return icons[type] || <Bell className="w-5 h-5 text-on-surface-variant" />;
}

async function markAsReadAction(notifId: number, tenantId: string) {
  "use server";
  const session = await auth();
  if (!session?.user) redirect("/login");

  await prisma.notification.update({
    where: { id: notifId, userId: Number(session.user.id) },
    data: { read: true },
  });

  revalidatePath(`/dashboard/tenant/${tenantId}/notifikasi`);
}

async function markAllAsReadAction(tenantId: string) {
  "use server";
  const session = await auth();
  if (!session?.user) redirect("/login");

  await prisma.notification.updateMany({
    where: { tenantId: parseInt(tenantId), userId: Number(session.user.id), read: false },
    data: { read: true },
  });

  revalidatePath(`/dashboard/tenant/${tenantId}/notifikasi`);
}

async function deleteNotificationAction(notifId: number, tenantId: string) {
  "use server";
  const session = await auth();
  if (!session?.user) redirect("/login");

  await prisma.notification.delete({
    where: { id: notifId, userId: Number(session.user.id) },
  });

  revalidatePath(`/dashboard/tenant/${tenantId}/notifikasi`);
}

function NotificationItem({ notification, tenantId }: {
  notification: {
    id: number;
    title: string;
    message: string;
    type: string;
    read: boolean;
    createdAt: Date;
  };
  tenantId: string;
}) {
  const iconColor = notification.read ? "text-on-surface-variant/50" : "text-primary";

  return (
    <div className={cn("bg-surface-container-lowest rounded-xl-custom p-4 shadow-sm border border-outline-variant", notification.read ? "" : "ring-1 ring-primary/20 bg-primary/5")}>
      <div className="flex items-start gap-3">
        <div className={cn("p-2 rounded-xl-custom flex-shrink-0", notification.read ? "bg-surface-container-high" : "bg-primary/10")}>
          <NotificationIcon type={notification.type} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className={cn("font-body text-body", notification.read ? "text-on-surface" : "text-on-surface font-semibold")}>
              {notification.title}
            </h3>
            <span className="font-caption text-caption text-on-surface-variant whitespace-nowrap">
              {formatRelativeTime(notification.createdAt)}
            </span>
          </div>
          <p className={cn("font-caption text-caption mt-1", notification.read ? "text-on-surface-variant" : "text-on-surface")}>
            {notification.message}
          </p>
          <div className="flex items-center gap-2 mt-3">
            <span className={cn("inline-flex px-2 py-0.5 rounded-xl-custom font-caption text-caption capitalize",
              notification.type === "approval" ? "bg-primary/10 text-primary" :
              notification.type === "stock" ? "bg-warning/10 text-warning" :
              notification.type === "transaction" ? "bg-income/10 text-income" :
              "bg-surface-container-high text-on-surface-variant")}>
              {notification.type}
            </span>
            {!notification.read && (
              <form action={markAsReadAction.bind(null, notification.id, tenantId)}>
                <button type="submit" className="px-3 py-1 bg-primary text-on-primary rounded-xl-custom font-caption text-caption touch-target">
                  Tandai dibaca
                </button>
              </form>
            )}
          </div>
        </div>
        <form action={deleteNotificationAction.bind(null, notification.id, tenantId)}>
          <button type="submit" className="p-1 text-on-surface-variant/50 hover:text-on-surface transition-colors touch-target" aria-label="Hapus notifikasi">
            <X className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
}

export default async function NotifikasiPage({ params, searchParams }: NotifikasiPageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { tenantId } = await params;
  const tenantIdNum = parseInt(tenantId);
  const urlParams = await searchParams;

  const user = session.user;

  if (user.role !== "Superadmin" && user.tenantId !== tenantIdNum) {
    redirect("/dashboard/tenant-selector");
  }

  const filter = urlParams.filter as string;
  const status = urlParams.status as string;

  const where: Record<string, unknown> = { tenantId: tenantIdNum, userId: Number(user.id) };
  if (status === "read") where.read = true;
  if (status === "unread") where.read = false;
  if (filter) where.type = filter;

  const [notifications, stats] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.notification.groupBy({
      by: ["read"],
      where: { tenantId: tenantIdNum, userId: Number(user.id) },
      _count: { read: true },
    }),
  ]);

  const unreadCount = stats.find((s) => s.read === false)?._count.read || 0;
  const readCount = stats.find((s) => s.read === true)?._count.read || 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Link
          href={`/dashboard/tenant/${tenantId}/beranda`}
          className="flex items-center gap-2 text-on-surface-variant hover:text-on-surface transition-colors touch-target"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="font-h2 text-h2 text-on-surface flex-1 text-center">Notifikasi</h1>
        {unreadCount > 0 && (
          <span className="w-10 flex items-center justify-end">
            <span className="bg-error text-on-error text-xs font-semibold px-2 py-0.5 rounded-full">{unreadCount}</span>
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-error/10 border border-error/30 rounded-xl-custom p-4">
          <p className="font-caption text-caption text-error/80 uppercase tracking-wider">Belum Dibaca</p>
          <p className="font-mono-num text-2xl font-bold text-error mt-1">{unreadCount}</p>
        </div>
        <div className="bg-primary/10 border border-primary/30 rounded-xl-custom p-4">
          <p className="font-caption text-caption text-primary/80 uppercase tracking-wider">Sudah Dibaca</p>
          <p className="font-mono-num text-2xl font-bold text-primary mt-1">{readCount}</p>
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-xl-custom p-4 shadow-sm border border-outline-variant space-y-3">
        <div className="flex gap-2">
          <select
            defaultValue={status || ""}
            className="flex-1 px-3 py-2.5 border border-outline-variant rounded-xl-custom text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-surface-container-lowest"
          >
            <option value="">Semua Status</option>
            <option value="unread">Belum Dibaca</option>
            <option value="read">Sudah Dibaca</option>
          </select>
          <select
            defaultValue={filter || ""}
            className="flex-1 px-3 py-2.5 border border-outline-variant rounded-xl-custom text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-surface-container-lowest"
          >
            <option value="">Semua Jenis</option>
            <option value="approval">Persetujuan</option>
            <option value="stock">Stok</option>
            <option value="transaction">Transaksi</option>
            <option value="system">Sistem</option>
            <option value="reconciliation">Rekonsiliasi</option>
          </select>
        </div>
        {unreadCount > 0 && (
          <form action={markAllAsReadAction.bind(null, tenantId)}>
            <button type="submit" className="w-full bg-primary hover:bg-primary/90 text-on-primary py-2 rounded-xl-custom font-medium touch-target">
              Tandai semua dibaca
            </button>
          </form>
        )}
      </div>

      <div className="space-y-3">
        {notifications.length === 0 ? (
          <div className="bg-surface-container-lowest rounded-xl-custom p-8 text-center">
            <Bell className="w-12 h-12 text-on-surface-variant/30 mx-auto mb-3" />
            <p className="font-body text-body text-on-surface-variant">Belum ada notifikasi</p>
            <p className="font-caption text-caption text-on-surface-variant mt-1">Notifikasi akan muncul di sini saat ada aktivitas baru</p>
          </div>
        ) : (
          notifications.map((notif) => (
            <NotificationItem key={notif.id} notification={notif} tenantId={tenantId} />
          ))
        )}
      </div>
    </div>
  );
}
