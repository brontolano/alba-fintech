import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Building2, TrendingUp, TrendingDown, Wallet, CreditCard, AlertTriangle, ArrowRight, Plus, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

interface BerandaPageProps {
  params: Promise<{ tenantId: string }>;
}

export const dynamic = "force-dynamic";

function formatCurrency(amount: number | null | undefined) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount || 0);
}

function StatCard({ title, value, icon, bgColor, onClick }: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  bgColor: string;
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
        <div className={cn("p-3 rounded-xl-custom", bgColor)}>
          {icon}
        </div>
      </div>
    </button>
  );
}

function UnitCard({ unit, balance, onClick }: {
  unit: { id: number; name: string; type: string };
  balance: number;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn("bg-surface-container-lowest rounded-xl-custom p-4 shadow-sm border border-outline-variant flex items-center justify-between touch-target", onClick && "active:bg-surface-container-low transition-colors")}
    >
      <div className="flex items-center gap-3">
        <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center text-on-primary font-bold", unit.type === "Retail" ? "bg-income" : "bg-primary")}>
          {unit.name.charAt(0)}
        </div>
        <div>
          <p className="font-body text-body text-on-surface">{unit.name}</p>
          <p className="font-caption text-caption text-on-surface-variant capitalize">{unit.type.toLowerCase()}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="font-mono-num text-lg font-bold text-on-surface">{formatCurrency(balance)}</p>
        <p className="font-caption text-caption text-on-surface-variant">Saldo terkini</p>
      </div>
    </button>
  );
}

function TransactionRow({ tx }: {
  tx: {
    id: number;
    transactionDate: Date;
    unit: { name: string };
    type: string;
    category: string;
    amount: number;
    status: string;
  };
}) {
  return (
    <div className="bg-surface-container-lowest rounded-xl-custom p-4 shadow-sm border border-outline-variant">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn("inline-flex px-2 py-1 rounded-xl-custom font-caption text-caption", tx.type === "Debit" ? "bg-income/10 text-income" : "bg-expense/10 text-expense")}>
              {tx.type}
            </span>
            <span className="font-caption text-caption text-on-surface-variant">{tx.unit.name}</span>
          </div>
          <p className="font-body text-body text-on-surface mt-1 truncate">{tx.category}</p>
          <p className="font-caption text-caption text-on-surface-variant mt-0.5">{format(new Date(tx.transactionDate), "dd MMM yyyy", { locale: id })}</p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <p className={cn("font-mono-num font-semibold text-lg", tx.type === "Debit" ? "text-income" : "text-expense")}>
            {formatCurrency(Number(tx.amount))}
          </p>
          <span className={cn("inline-flex px-2 py-0.5 rounded-xl-custom font-caption text-caption",
            tx.status === "Approved" ? "bg-income/10 text-income" :
            tx.status === "Rejected" ? "bg-expense/10 text-expense" :
            "bg-warning/10 text-warning")}>
            {tx.status}
          </span>
        </div>
      </div>
    </div>
  );
}

export default async function BerandaPage({ params }: BerandaPageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { tenantId } = await params;
  const tenantIdNum = parseInt(tenantId);

  const user = session.user;

  // Validate tenant access
  if (user.role !== "Superadmin" && user.tenantId !== tenantIdNum) {
    redirect("/dashboard/tenant-selector");
  }

  // Fetch data
  const [units, recentTransactions, stats] = await Promise.all([
    prisma.unit.findMany({
      where: { tenantId: tenantIdNum },
      select: { id: true, name: true, type: true, balance: true },
    }),
    prisma.transaction.findMany({
      where: { tenantId: tenantIdNum, status: "Approved" },
      orderBy: { transactionDate: "desc" },
      take: 10,
      include: { unit: true, user: { select: { name: true } } },
    }),
    prisma.transaction.groupBy({
      by: ["type"],
      where: {
        tenantId: tenantIdNum,
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
          tenantId: tenantIdNum,
          status: { in: ["Submitted", "Pending"] },
          ...(user.role === "Manager" && user.unitId ? { unitId: user.unitId } : {}),
        },
      })
    : 0;

  const lowStockCount = user.role === "Manager" || user.role === "Staff" && user.unitId
    ? (await prisma.inventoryItem.findMany({
        where: { unitId: user.unitId!, stock: { gt: 0 } },
        select: { stock: true, minStock: true },
      })).filter(i => i.stock <= i.minStock).length
    : 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-h2 text-h2 text-on-surface">Beranda</h1>
          <p className="font-caption text-caption text-on-surface-variant mt-0.5">
            Selamat datang, {user.name} · {format(new Date(), "EEEE, d MMMM yyyy", { locale: id })}
          </p>
        </div>
        {(pendingCount > 0 || lowStockCount > 0) && (
          <div className="flex items-center gap-2">
            {pendingCount > 0 && (
              <Link
                href={`/dashboard/tenant/${tenantId}/persetujuan`}
                className="bg-warning/10 border border-warning/30 text-warning px-3 py-2 rounded-xl-custom text-sm font-medium flex items-center gap-2 touch-target"
              >
                <AlertTriangle className="w-4 h-4" />
                {pendingCount} menunggu persetujuan
              </Link>
            )}
            {lowStockCount > 0 && (
              <Link
                href={`/dashboard/tenant/${tenantId}/inventory`}
                className="bg-warning/10 border border-warning/30 text-warning px-3 py-2 rounded-xl-custom text-sm font-medium flex items-center gap-2 touch-target"
              >
                <AlertTriangle className="w-4 h-4" />
                {lowStockCount} stok menipis
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Total Balance Card */}
      <div className="bg-primary rounded-xl-custom p-5 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-caption text-caption text-on-primary/80 uppercase tracking-wider">Total Saldo Keseluruhan</p>
            <p className="mt-2 font-mono-num text-3xl font-bold text-on-primary">{formatCurrency(totalBalance)}</p>
          </div>
          <div className="p-3 bg-on-primary/10 rounded-xl-custom">
            <Wallet className="w-7 h-7 text-on-primary" />
          </div>
        </div>
      </div>

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          title="Pemasukan Bulan Ini"
          value={formatCurrency(Number(incomeThisMonth))}
          icon={<TrendingUp className="w-5 h-5" />}
          bgColor="bg-income/10 text-income"
          onClick={() => window.location.href = `/dashboard/tenant/${tenantId}/laporan?type=income`}
        />
        <StatCard
          title="Pengeluaran Bulan Ini"
          value={formatCurrency(Number(expenseThisMonth))}
          icon={<TrendingDown className="w-5 h-5" />}
          bgColor="bg-expense/10 text-expense"
          onClick={() => window.location.href = `/dashboard/tenant/${tenantId}/laporan?type=expense`}
        />
        <StatCard
          title="Selisih"
          value={formatCurrency(Number(incomeThisMonth) - Number(expenseThisMonth))}
          icon={<Wallet className="w-5 h-5" />}
          bgColor="bg-primary/10 text-primary"
        />
        <StatCard
          title="Unit Aktif"
          value={units.length}
          icon={<Building2 className="w-5 h-5" />}
          bgColor="bg-secondary/10 text-secondary"
        />
      </div>

      {/* Unit Balances */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-h3 text-h3 text-on-surface">Saldo per Unit</h2>
          <Link
            href={`/dashboard/tenant/${tenantId}/transaksi`}
            className="font-caption text-caption text-primary hover:underline flex items-center gap-1"
          >
            Lihat semua <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="space-y-2">
          {units.map((unit) => (
            <UnitCard
              key={unit.id}
              unit={unit}
              balance={Number(unit.balance)}
              onClick={() => window.location.href = `/dashboard/tenant/${tenantId}/transaksi?unit=${unit.id}`}
            />
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link
          href={`/dashboard/tenant/${tenantId}/transaksi`}
          className="bg-surface-container-lowest rounded-xl-custom p-4 shadow-sm border border-outline-variant flex flex-col items-center gap-2 text-center touch-target active:bg-surface-container-low transition-colors"
        >
          <div className="p-3 bg-income/10 text-income rounded-xl-custom"><CreditCard className="w-5 h-5" /></div>
          <span className="font-caption text-caption text-on-surface">Input Transaksi</span>
        </Link>
        <Link
          href={`/dashboard/tenant/${tenantId}/persetujuan`}
          className="bg-surface-container-lowest rounded-xl-custom p-4 shadow-sm border border-outline-variant flex flex-col items-center gap-2 text-center touch-target active:bg-surface-container-low transition-colors"
        >
          <div className="p-3 bg-primary/10 text-primary rounded-xl-custom"><Wallet className="w-5 h-5" /></div>
          <span className="font-caption text-caption text-on-surface">Persetujuan</span>
        </Link>
        <Link
          href={`/dashboard/tenant/${tenantId}/rekonsiliasi`}
          className="bg-surface-container-lowest rounded-xl-custom p-4 shadow-sm border border-outline-variant flex flex-col items-center gap-2 text-center touch-target active:bg-surface-container-low transition-colors"
        >
          <div className="p-3 bg-warning/10 text-warning rounded-xl-custom"><AlertTriangle className="w-5 h-5" /></div>
          <span className="font-caption text-caption text-on-surface">Rekonsiliasi</span>
        </Link>
        <Link
          href={`/dashboard/tenant/${tenantId}/laporan`}
          className="bg-surface-container-lowest rounded-xl-custom p-4 shadow-sm border border-outline-variant flex flex-col items-center gap-2 text-center touch-target active:bg-surface-container-low transition-colors"
        >
          <div className="p-3 bg-secondary/10 text-secondary rounded-xl-custom"><TrendingUp className="w-5 h-5" /></div>
          <span className="font-caption text-caption text-on-surface">Laporan</span>
        </Link>
      </div>

      {/* Recent Transactions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-h3 text-h3 text-on-surface">Transaksi Terbaru</h2>
          <Link
            href={`/dashboard/tenant/${tenantId}/transaksi`}
            className="font-caption text-caption text-primary hover:underline flex items-center gap-1"
          >
            Lihat semua <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="space-y-2">
          {recentTransactions.length === 0 ? (
            <div className="bg-surface-container-lowest rounded-xl-custom p-8 text-center">
              <p className="font-body text-body text-on-surface-variant">Belum ada transaksi</p>
              <Link
                href={`/dashboard/tenant/${tenantId}/transaksi`}
                className="mt-3 inline-flex items-center gap-1 text-primary font-medium text-sm"
              >
                Buat transaksi pertama <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          ) : (
            recentTransactions.map((tx) => (
              <TransactionRow key={tx.id} tx={tx} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}