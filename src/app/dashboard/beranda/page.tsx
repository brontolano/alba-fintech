import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { TrendingUp, TrendingDown, DollarSign, Wallet, CreditCard, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

function formatCurrency(amount: number | null | undefined) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount || 0);
}

function Card({ title, value, change, icon, className }: {
  title: string;
  value: string | number;
  change?: { value: number; label: string };
  icon: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("bg-white rounded-xl p-5 shadow-sm border border-slate-100", className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500 font-medium">{title}</p>
          <p className="mt-1 font-mono-num text-2xl font-bold text-slate-900">{value}</p>
          {change && (
            <p className={cn("mt-1 text-xs font-medium flex items-center gap-1", change.value >= 0 ? "text-emerald" : "text-rose")}>
              <TrendingUp className="w-3 h-3" />
              <span>{change.value >= 0 ? "+" : ""}{change.value}%</span>
              <span className="text-slate-500">{change.label}</span>
            </p>
          )}
        </div>
        <div className="p-2 bg-slate-50 rounded-lg text-navy">{icon}</div>
      </div>
    </div>
  );
}

export default async function BerandaPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user;
  const tenantId = user.tenantId;

  // Superadmin has no tenantId - redirect to tenant selector
  if (!tenantId) {
    redirect("/dashboard/tenant-selector");
  }

  // Fetch data
  const [units, recentTransactions, stats] = await Promise.all([
    prisma.unit.findMany({
      where: { tenantId },
      select: { id: true, name: true, type: true, balance: true },
    }),
    prisma.transaction.findMany({
      where: { tenantId, status: "Approved" },
      orderBy: { transactionDate: "desc" },
      take: 10,
      include: { unit: true, user: { select: { name: true } } },
    }),
    prisma.transaction.groupBy({
      by: ["type"],
      where: {
        tenantId,
        status: "Approved",
        transactionDate: { gte: new Date(new Date().setMonth(new Date().getMonth() - 1)) },
      },
      _sum: { amount: true },
    }),
  ]);

  const totalBalance = units.reduce((sum, u) => sum + Number(u.balance), 0);
  const incomeThisMonth = stats.find((s) => s.type === "Debit")?._sum.amount || 0;
  const expenseThisMonth = stats.find((s) => s.type === "Kredit")?._sum.amount || 0;

  const pendingCount = user.role === "Pimpinan" || user.role === "Manager"
    ? await prisma.transaction.count({
        where: {
          tenantId,
          status: { in: ["Submitted", "Pending"] },
          ...(user.role === "Manager" && user.unitId ? { unitId: user.unitId } : {}),
        },
      })
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Beranda</h1>
          <p className="text-sm text-slate-500">
            Selamat datang, {user.name} · {format(new Date(), "EEEE, d MMMM yyyy", { locale: id })}
          </p>
        </div>
        {pendingCount > 0 && (
          <div className="bg-amber/10 border border-amber/30 text-amber/90 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            {pendingCount} transaksi menunggu persetujuan
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card title="Total Saldo Keseluruhan" value={formatCurrency(totalBalance)} icon={<DollarSign className="w-6 h-6" />} />
        <Card title="Pemasukan Bulan Ini" value={formatCurrency(Number(incomeThisMonth))} icon={<TrendingUp className="w-6 h-6" />} />
        <Card title="Pengeluaran Bulan Ini" value={formatCurrency(Number(expenseThisMonth))} icon={<TrendingDown className="w-6 h-6" />} />
        <Card title="Selisih" value={formatCurrency(Number(incomeThisMonth) - Number(expenseThisMonth))} icon={<Wallet className="w-6 h-6" />} />
      </div>

      {/* Unit Balances */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Saldo per Unit</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {units.map((unit) => (
            <div key={unit.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition">
              <div className="flex items-center gap-3">
                <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold", unit.type === "Retail" ? "bg-emerald" : "bg-navy")}>
                  {unit.name.charAt(0)}
                </div>
                <div>
                  <p className="font-medium text-slate-900">{unit.name}</p>
                  <p className="text-xs text-slate-500 capitalize">{unit.type.toLowerCase()}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-mono-num text-lg font-bold text-slate-900">{formatCurrency(Number(unit.balance))}</p>
                <p className="text-xs text-slate-500">Saldo terkini</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Transaksi Terbaru</h2>
          <a href="/dashboard/transaksi" className="text-sm text-navy hover:underline">Lihat semua</a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                <th className="p-3">Tanggal</th>
                <th className="p-3">Unit</th>
                <th className="p-3">Jenis</th>
                <th className="p-3">Kategori</th>
                <th className="p-3 text-right">Nominal</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">Belum ada transaksi</td>
                </tr>
              ) : (
                recentTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50">
                    <td className="p-3 text-sm text-slate-700">{format(new Date(tx.transactionDate), "dd MMM yyyy", { locale: id })}</td>
                    <td className="p-3 text-sm text-slate-700">{tx.unit.name}</td>
                    <td className="p-3">
                      <span className={cn("inline-flex px-2 py-0.5 rounded text-xs font-medium", tx.type === "Debit" ? "bg-emerald/10 text-emerald" : "bg-rose/10 text-rose")}>
                        {tx.type}
                      </span>
                    </td>
                    <td className="p-3 text-sm text-slate-600">{tx.category}</td>
                    <td className={`p-3 text-right font-mono-num font-medium ${tx.type === "Debit" ? "text-emerald" : "text-rose"}`}>
                      {formatCurrency(Number(tx.amount))}
                    </td>
                    <td className="p-3">
                      <span className={cn("inline-flex px-2 py-0.5 rounded text-xs font-medium",
                        tx.status === "Approved" ? "bg-emerald/10 text-emerald" :
                        tx.status === "Rejected" ? "bg-rose/10 text-rose" :
                        "bg-amber/10 text-amber")}>
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <a href="/dashboard/transaksi" className="bg-white rounded-xl p-4 border border-slate-100 hover:border-navy/30 hover:shadow-md transition flex flex-col items-center gap-2 text-center">
          <div className="p-3 bg-emerald/10 text-emerald rounded-lg"><CreditCard className="w-5 h-5" /></div>
          <span className="text-sm font-medium text-slate-700">Input Transaksi</span>
        </a>
        <a href="/dashboard/persetujuan" className="bg-white rounded-xl p-4 border border-slate-100 hover:border-navy/30 hover:shadow-md transition flex flex-col items-center gap-2 text-center">
          <div className="p-3 bg-navy/10 text-navy rounded-lg"><Wallet className="w-5 h-5" /></div>
          <span className="text-sm font-medium text-slate-700">Persetujuan</span>
        </a>
        <a href="/dashboard/rekonsiliasi" className="bg-white rounded-xl p-4 border border-slate-100 hover:border-navy/30 hover:shadow-md transition flex flex-col items-center gap-2 text-center">
          <div className="p-3 bg-amber/10 text-amber rounded-lg"><AlertTriangle className="w-5 h-5" /></div>
          <span className="text-sm font-medium text-slate-700">Rekonsiliasi</span>
        </a>
        <a href="/dashboard/laporan" className="bg-white rounded-xl p-4 border border-slate-100 hover:border-navy/30 hover:shadow-md transition flex flex-col items-center gap-2 text-center">
          <div className="p-3 bg-slate/10 text-slate rounded-lg"><TrendingUp className="w-5 h-5" /></div>
          <span className="text-sm font-medium text-slate-700">Laporan</span>
        </a>
      </div>
    </div>
  );
}