import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import Link from "next/link";
import {
  Download,
  Calendar,
  TrendingUp,
  TrendingDown,
  Wallet,
  Building2,
  Minus,
} from "lucide-react";
import { IncomeExpenseChart } from "@/components/charts/IncomeExpenseChart";
import { MonthlyTrendChart } from "@/components/charts/MonthlyTrendChart";
import { CategoryChart } from "@/components/charts/CategoryChart";
import { cn } from "@/lib/utils";

interface LaporanPageProps {
  params: Promise<{ tenantId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export const dynamic = "force-dynamic";

function formatCurrency(amount: number | null | undefined) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount || 0);
}

function StatCard({ title, value, icon, color, onClick }: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn("bg-surface-container-lowest rounded-xl-custom p-5 shadow-sm border border-outline-variant w-full touch-target", onClick && "active:bg-surface-container-low transition-colors")}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="font-caption text-caption text-on-surface-variant uppercase tracking-wider">{title}</p>
          <p className="mt-2 font-mono-num text-2xl font-bold text-on-surface">{value}</p>
        </div>
        <div className={cn("p-3 rounded-xl-custom", color)}>
          {icon}
        </div>
      </div>
    </button>
  );
}

export default async function LaporanPage({ params, searchParams }: LaporanPageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { tenantId } = await params;
  const tenantIdNum = parseInt(tenantId);
  const urlParams = await searchParams;

  const user = session.user;

  if (user.role !== "Superadmin" && user.tenantId !== tenantIdNum) {
    redirect("/dashboard/tenant-selector");
  }

  // Parse date range
  const endDate = urlParams.endDate ? new Date(urlParams.endDate as string) : new Date();
  const startDate = urlParams.startDate ? new Date(urlParams.startDate as string) : new Date(endDate.getFullYear(), endDate.getMonth() - 5, 1);

  // Fetch data
  const [units, transactions, categories] = await Promise.all([
    prisma.unit.findMany({
      where: { tenantId: tenantIdNum },
      select: { id: true, name: true, type: true, balance: true },
    }),
    prisma.transaction.findMany({
      where: {
        tenantId: tenantIdNum,
        status: "Approved",
        transactionDate: { gte: startDate, lte: endDate },
      },
      orderBy: { transactionDate: "asc" },
      include: { unit: true },
    }),
    prisma.category.findMany({
      where: { tenantId: tenantIdNum },
      select: { id: true, name: true, type: true },
    }),
  ]);

  // Process data for charts
  const unitIncomeExpense = units.map((unit) => {
    const unitStats = transactions.filter((t) => t.unitId === unit.id);
    const income = unitStats.filter((t) => t.type === "Debit").reduce((sum, t) => sum + Number(t.amount), 0);
    const expense = unitStats.filter((t) => t.type === "Kredit").reduce((sum, t) => sum + Number(t.amount), 0);
    return { name: unit.name, income, expense };
  });

  // Monthly trend data
  const monthlyData: Array<{ month: string; income: number; expense: number; balance: number }> = [];
  for (let i = 5; i >= 0; i--) {
    const date = new Date(endDate.getFullYear(), endDate.getMonth() - i, 1);
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);

    const monthTransactions = transactions.filter((t) => {
      const txDate = new Date(t.transactionDate);
      return txDate >= monthStart && txDate <= monthEnd;
    });

    const income = monthTransactions.filter((t) => t.type === "Debit").reduce((sum, t) => sum + Number(t.amount), 0);
    const expense = monthTransactions.filter((t) => t.type === "Kredit").reduce((sum, t) => sum + Number(t.amount), 0);
    
    let prevBalance = 0;
    const allPrevTransactions = transactions.filter((t) => new Date(t.transactionDate) < monthStart);
    prevBalance = allPrevTransactions.reduce((sum, t) => sum + (t.type === "Debit" ? Number(t.amount) : -Number(t.amount)), 0);

    monthlyData.push({
      month: format(date, "MMM yyyy", { locale: id }),
      income,
      expense,
      balance: prevBalance + income - expense,
    });
  }

  // Category breakdown
  const incomeCategories = categories
    .filter((c) => c.type === "Debit")
    .map((cat) => ({
      name: cat.name,
      value: transactions
        .filter((t) => t.type === "Debit" && t.category === cat.name)
        .reduce((sum, t) => sum + Number(t.amount), 0),
    }))
    .filter((c) => c.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const expenseCategories = categories
    .filter((c) => c.type === "Kredit")
    .map((cat) => ({
      name: cat.name,
      value: transactions
        .filter((t) => t.type === "Kredit" && t.category === cat.name)
        .reduce((sum, t) => sum + Number(t.amount), 0),
    }))
    .filter((c) => c.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const totalIncome = transactions.filter((t) => t.type === "Debit").reduce((sum, t) => sum + Number(t.amount), 0);
  const totalExpense = transactions.filter((t) => t.type === "Kredit").reduce((sum, t) => sum + Number(t.amount), 0);
  const totalBalance = units.reduce((sum, u) => sum + Number(u.balance), 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-h2 text-h2 text-on-surface">Laporan Keuangan</h1>
          <p className="font-caption text-caption text-on-surface-variant mt-0.5">
            Analisis pemasukan, pengeluaran, dan performa unit
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/tenant/${tenantId}/laporan/export`}
            className="bg-primary hover:bg-primary/90 text-on-primary px-4 py-2.5 rounded-xl-custom font-medium text-sm flex items-center gap-2 touch-target"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Ekspor
          </Link>
        </div>
      </div>

      {/* Date Range Picker */}
      <div className="bg-surface-container-lowest rounded-xl-custom p-4 shadow-sm border border-outline-variant">
        <form className="flex flex-col sm:flex-row items-center gap-3">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-on-surface-variant" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <label className="font-caption text-caption text-on-surface-variant">Dari</label>
            <input
              type="date"
              name="startDate"
              defaultValue={format(startDate, "yyyy-MM-dd")}
              onChange={(e) => {
                const params = new URLSearchParams(window.location.search);
                params.set("startDate", e.target.value);
                window.history.pushState(null, "", `${window.location.pathname}?${params.toString()}`);
                window.location.reload();
              }}
              className="px-3 py-2 border border-outline-variant rounded-xl-custom text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-surface-container-lowest"
            />
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-on-surface-variant" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <label className="font-caption text-caption text-on-surface-variant">Sampai</label>
            <input
              type="date"
              name="endDate"
              defaultValue={format(endDate, "yyyy-MM-dd")}
              onChange={(e) => {
                const params = new URLSearchParams(window.location.search);
                params.set("endDate", e.target.value);
                window.history.pushState(null, "", `${window.location.pathname}?${params.toString()}`);
                window.location.reload();
              }}
              className="px-3 py-2 border border-outline-variant rounded-xl-custom text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-surface-container-lowest"
            />
          </div>
        </form>
      </div>

{/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard title="Total Saldo" value={formatCurrency(totalBalance)} icon={<Wallet className="w-5 h-5" />} color="bg-primary/10 text-primary" />
        <StatCard title="Pemasukan" value={formatCurrency(totalIncome)} icon={<TrendingUp className="w-5 h-5" />} color="bg-income/10 text-income" />
        <StatCard title="Pengeluaran" value={formatCurrency(totalExpense)} icon={<TrendingDown className="w-5 h-5" />} color="bg-expense/10 text-expense" />
        <StatCard title="Selisih" value={formatCurrency(totalIncome - totalExpense)} icon={<Minus className="w-5 h-5" />} color="bg-primary/10 text-primary" />
      </div>

      {/* Charts */}
      <div className="space-y-5">
        <IncomeExpenseChart data={unitIncomeExpense} />
        <MonthlyTrendChart data={monthlyData} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <CategoryChart data={incomeCategories} title="Top Kategori Pemasukan" color="#10b981" />
          <CategoryChart data={expenseCategories} title="Top Kategori Pengeluaran" color="#ef4444" />
        </div>
      </div>

      {/* Unit Summary Table */}
      <div className="bg-surface-container-lowest rounded-xl-custom shadow-sm border border-outline-variant overflow-hidden">
        <div className="p-4 border-b border-outline-variant flex items-center justify-between">
          <h2 className="font-h3 text-h3 text-on-surface">Ringkasan per Unit</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">
                <th className="p-4">Unit</th>
                <th className="p-4">Tipe</th>
                <th className="p-4">Saldo</th>
                <th className="p-4">Pemasukan</th>
                <th className="p-4">Pengeluaran</th>
                <th className="p-4">Transaksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {units.map((unit) => {
                const unitTx = transactions.filter((t) => t.unitId === unit.id);
                const income = unitTx.filter((t) => t.type === "Debit").reduce((sum, t) => sum + Number(t.amount), 0);
                const expense = unitTx.filter((t) => t.type === "Kredit").reduce((sum, t) => sum + Number(t.amount), 0);
                return (
                  <tr key={unit.id} className="hover:bg-surface-container-low/50">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center text-on-primary font-bold", unit.type === "Retail" ? "bg-income" : "bg-primary")}>
                          {unit.name.charAt(0)}
                        </div>
                        <p className="font-body text-body text-on-surface">{unit.name}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={cn("inline-flex px-2 py-1 rounded-xl-custom font-caption text-caption", unit.type === "Retail" ? "bg-income/10 text-income" : "bg-primary/10 text-primary")}>
                        {unit.type}
                      </span>
                    </td>
                    <td className="p-4 font-mono-num font-medium text-on-surface">{formatCurrency(unit.balance)}</td>
                    <td className="p-4 font-mono-num text-income">{formatCurrency(income)}</td>
                    <td className="p-4 font-mono-num text-expense">{formatCurrency(expense)}</td>
                    <td className="p-4 font-caption text-caption text-on-surface-variant">{unitTx.length}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}