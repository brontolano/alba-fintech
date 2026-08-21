import { redirect } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  Building2,
  Users,
  Warehouse,
  TrendingUp,
  ShoppingBag,
  ShieldCheck,
  Activity,
  ChevronRight,
  Plus,
  Wallet,
  AlertCircle,
} from "lucide-react";
import { requireRole } from "@/lib/auth-utils";
import { prisma } from "@/lib/db";
import { formatCurrencyIDR, formatDateID, formatRelative } from "@/lib/superadmin";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SuperadminDashboard() {
  const user = await requireRole(["Superadmin"]);

  const since = new Date();
  since.setDate(since.getDate() - 30);

  const [
    tenantsActive,
    tenantsTotal,
    userCounts,
    unitSummary,
    txMonth,
    posMonth,
    auditLogs,
    pendingApprovals,
    lowStockAgg,
  ] = await Promise.all([
    prisma.tenant.count({ where: { isActive: true } }),
    prisma.tenant.count(),
    prisma.user.groupBy({
      by: ["role"],
      _count: { _all: true },
    }),
    prisma.unit.aggregate({
      _sum: { balance: true },
      _count: { _all: true },
    }),
    prisma.transaction.aggregate({
      where: { transactionDate: { gte: since } },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.posSale.aggregate({
      where: { createdAt: { gte: since } },
      _sum: { totalAmount: true },
      _count: { _all: true },
    }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: {
        actor: { select: { name: true, email: true } },
        tenant: { select: { name: true, appName: true } },
      },
    }),
    prisma.transaction.count({ where: { status: { in: ["Submitted", "Pending"] } } }),
    prisma.inventoryItem.findMany({
      select: { stock: true, minStock: true },
      where: { minStock: { gt: 0 } },
    }),
  ]);

  const totalBalance = Number(unitSummary._sum.balance ?? 0);
  const totalUnits = unitSummary._count._all;

  const userCountByRole: Record<string, number> = {};
  for (const row of userCounts) userCountByRole[row.role] = row._count._all;
  const totalUsers = userCounts.reduce((sum, r) => sum + r._count._all, 0);

  const lowStockCount = lowStockAgg.filter((i) => i.stock <= i.minStock).length;

  const recentTenants = await prisma.tenant.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    include: {
      _count: { select: { units: true, users: true } },
    },
  });

  const stats = [
    {
      label: "Tenant Aktif",
      value: tenantsActive,
      sub: `${tenantsTotal} total`,
      icon: Building2,
      tone: "primary",
    },
    {
      label: "Pengguna",
      value: totalUsers,
      sub: `${userCountByRole.Manager ?? 0} Manager · ${userCountByRole.Staff ?? 0} Staff`,
      icon: Users,
      tone: "secondary",
    },
    {
      label: "Unit",
      value: totalUnits,
      sub: `${userCountByRole.Pimpinan ?? 0} Pimpinan`,
      icon: Warehouse,
      tone: "tertiary",
    },
    {
      label: "Total Saldo Unit",
      value: formatCurrencyIDR(totalBalance),
      sub: "Agregat semua unit",
      icon: Wallet,
      tone: "income",
      isCurrency: true,
    },
  ];

  return (
    <div className="space-y-6 max-w-screen-2xl">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-on-surface">Dashboard Super Admin</h2>
          <p className="font-body text-body text-on-surface-variant mt-1">
            {format(new Date(), "EEEE, d MMMM yyyy", { locale: idLocale })} · Pantauan
            seluruh pesantren mitra
         </p>
       </div>
        <div className="flex gap-2">
          <Link
            href="/superadmin/tenants/new"
            className="inline-flex items-center gap-2 bg-primary text-on-primary px-4 py-2.5 rounded-xl-custom font-medium text-sm hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Tenant Baru
         </Link>
       </div>
     </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
     </div>

      {/* Activity + Approval queue */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-surface-container-lowest rounded-xl-custom border border-outline-variant overflow-hidden">
          <div className="px-5 py-4 border-b border-outline-variant flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              <h3 className="font-h3 text-h3 text-on-surface">Aktivitas Audit Terbaru</h3>
           </div>
            <span className="font-caption text-caption text-on-surface-variant">
              8 entri terakhir
           </span>
         </div>
          <ul className="divide-y divide-outline-variant">
            {auditLogs.length === 0 && (
              <li className="px-5 py-10 text-center text-on-surface-variant">
                Belum ada aktivitas tercatat
             </li>
            )}
            {auditLogs.map((log) => (
              <li key={log.id} className="px-5 py-3.5 flex items-start gap-3">
                <div className="mt-0.5 w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center flex-shrink-0">
                  <ShieldCheck className="w-4 h-4 text-primary" />
               </div>
                <div className="flex-1 min-w-0">
                  <p className="font-body text-body text-on-surface">
                    <span className="font-medium">{log.actor.name}</span>{' '}
                    <span className="text-on-surface-variant">
                      {log.action} {log.entity}
                   </span>{" "}
                    {log.tenant && (
                      <span className="text-on-surface-variant">
                        di <span className="font-medium">{log.tenant.appName || log.tenant.name}</span>
                     </span>
                    )}
                 </p>
                  <p className="font-caption text-caption text-on-surface-variant mt-0.5">
                    {formatRelative(log.createdAt)}
                 </p>
               </div>
             </li>
            ))}
         </ul>
       </div>

        <div className="bg-surface-container-lowest rounded-xl-custom border border-outline-variant overflow-hidden">
          <div className="px-5 py-4 border-b border-outline-variant">
            <h3 className="font-h3 text-h3 text-on-surface">Antrian Global</h3>
         </div>
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl-custom bg-warning/10 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-warning" />
             </div>
              <div className="flex-1">
                <p className="font-body text-body text-on-surface">Transaksi Pending</p>
                <p className="font-caption text-caption text-on-surface-variant">
                  Menunggu approval Manager/Pimpinan
               </p>
             </div>
              <p className="font-h3 text-h3 text-on-surface font-mono-num">
                {pendingApprovals}
             </p>
           </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl-custom bg-expense/10 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-expense" />
             </div>
              <div className="flex-1">
                <p className="font-body text-body text-on-surface">Stok Menipis</p>
                <p className="font-caption text-caption text-on-surface-variant">
                  Item di bawah stok minimum
               </p>
             </div>
              <p className="font-h3 text-h3 text-on-surface font-mono-num">
                {lowStockCount}
             </p>
           </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl-custom bg-income/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-income" />
             </div>
              <div className="flex-1">
                <p className="font-body text-body text-on-surface">Transaksi 30 Hari</p>
                <p className="font-caption text-caption text-on-surface-variant">
                  {txMonth._count._all} entri
               </p>
             </div>
              <p className="font-h3 text-h3 text-on-surface font-mono-num">
                {formatCurrencyIDR(txMonth._sum.amount ?? 0)}
             </p>
           </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl-custom bg-secondary/10 flex items-center justify-center">
                <ShoppingBag className="w-5 h-5 text-secondary" />
             </div>
              <div className="flex-1">
                <p className="font-body text-body text-on-surface">POS 30 Hari</p>
                <p className="font-caption text-caption text-on-surface-variant">
                  {posMonth._count._all} transaksi
               </p>
             </div>
              <p className="font-h3 text-h3 text-on-surface font-mono-num">
                {formatCurrencyIDR(posMonth._sum.totalAmount ?? 0)}
             </p>
           </div>
         </div>
       </div>
     </div>

      {/* Tenants table */}
      <div className="bg-surface-container-lowest rounded-xl-custom border border-outline-variant overflow-hidden">
        <div className="px-5 py-4 border-b border-outline-variant flex items-center justify-between">
          <div>
            <h3 className="font-h3 text-h3 text-on-surface">Tenant Terbaru</h3>
            <p className="font-caption text-caption text-on-surface-variant mt-0.5">
              5 tenant terakhir didaftarkan
           </p>
         </div>
          <Link
            href="/superadmin/tenants"
            className="inline-flex items-center gap-1 text-primary hover:text-primary/80 font-medium text-sm"
          >
            Lihat semua
            <ChevronRight className="w-4 h-4" />
         </Link>
       </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-surface-container-low text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">
                <th className="px-5 py-3">Tenant</th>
                <th className="px-5 py-3">App Name</th>
                <th className="px-5 py-3">Domain</th>
                <th className="px-5 py-3 text-right">Unit</th>
                <th className="px-5 py-3 text-right">Pengguna</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Dibuat</th>
             </tr>
           </thead>
            <tbody className="divide-y divide-outline-variant">
              {recentTenants.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-on-surface-variant">
                    Belum ada tenant terdaftar
                 </td>
               </tr>
              )}
              {recentTenants.map((t) => (
                <tr key={t.id} className="hover:bg-surface-container-low/50">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-xl-custom flex items-center justify-center text-on-primary font-bold text-sm"
                        style={{ backgroundColor: t.primaryColor }}
                      >
                        {t.name.charAt(0).toUpperCase()}
                     </div>
                      <span className="font-medium text-on-surface">{t.name}</span>
                   </div>
                 </td>
                  <td className="px-5 py-3.5 text-on-surface-variant">{t.appName}</td>
                  <td className="px-5 py-3.5 text-on-surface-variant">
                    {t.subdomain
                      ? `${t.subdomain}.alba.app`
                      : t.domain || "-"}
                 </td>
                  <td className="px-5 py-3.5 text-right font-mono-num text-on-surface">
                    {t._count.units}
                 </td>
                  <td className="px-5 py-3.5 text-right font-mono-num text-on-surface">
                    {t._count.users}
                 </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={cn(
                        "inline-flex px-2 py-0.5 rounded-xl-custom font-caption text-capitalize",
                        t.isActive
                          ? "bg-income/10 text-income"
                          : "bg-surface-container-high text-on-surface-variant"
                      )}
                    >
                      {t.isActive ? "Aktif" : "Non-aktif"}
                   </span>
                 </td>
                  <td className="px-5 py-3.5 text-on-surface-variant">
                    {formatDateID(t.createdAt)}
                 </td>
               </tr>
              ))}
           </tbody>
         </table>
       </div>
     </div>
   </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  tone,
  isCurrency,
}: {
  label: string;
  value: number | string;
  sub: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: "primary" | "secondary" | "tertiary" | "income";
  isCurrency?: boolean;
}) {
  const toneStyles: Record<string, { bg: string; text: string }> = {
    primary: { bg: "bg-primary-container", text: "text-on-primary-container" },
    secondary: { bg: "bg-secondary-container", text: "text-on-secondary-container" },
    tertiary: { bg: "bg-tertiary-container", text: "text-on-tertiary-container" },
    income: { bg: "bg-income/10", text: "text-income" },
  };
  const t = toneStyles[tone];
  return (
    <div className="bg-surface-container-lowest rounded-xl-custom border border-outline-variant p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-caption text-caption text-on-surface-variant uppercase tracking-wider">
            {label}
         </p>
          <p
            className={cn(
              "font-bold text-on-surface mt-2",
              isCurrency ? "text-h2" : "text-3xl"
            )}
          >
            {value}
         </p>
          <p className="font-caption text-caption text-on-surface-variant mt-1 truncate">
            {sub}
         </p>
       </div>
        <div className={cn("w-11 h-11 rounded-xl-custom flex items-center justify-center flex-shrink-0", t.bg)}>
          <Icon className={cn("w-5 h-5", t.text)} />
       </div>
     </div>
   </div>
  );
}
