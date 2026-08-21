import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import Link from "next/link";
import { Filter, Search, Check, X, Eye, AlertTriangle, Clock, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface PersetujuanPageProps {
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

function ApprovalCard({ tx }: {
  tx: {
    id: number;
    transactionDate: Date;
    unit: { name: string };
    type: string;
    category: string;
    method: string;
    amount: number;
    description: string | null;
    status: string;
    user: { name: string };
    createdAt: Date;
  };
}) {
  const isPending = tx.status === "Submitted" || tx.status === "Pending";

  return (
    <div className="bg-surface-container-lowest rounded-xl-custom p-4 shadow-sm border border-outline-variant">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn("inline-flex px-2 py-1 rounded-xl-custom font-caption text-caption", tx.type === "Debit" ? "bg-income/10 text-income" : "bg-expense/10 text-expense")}>
              {tx.type}
            </span>
            <span className="font-caption text-caption text-on-surface-variant">{tx.unit.name}</span>
            <span className="font-caption text-caption text-on-surface-variant">{tx.method}</span>
          </div>
          <p className="font-body text-body text-on-surface mt-1 truncate">{tx.category}</p>
          {tx.description && <p className="font-caption text-caption text-on-surface-variant mt-0.5 line-clamp-1">{tx.description}</p>}
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span className="font-caption text-caption text-on-surface-variant flex items-center gap-1">
              <FileText className="w-3 h-3" />
              {tx.user.name}
            </span>
            <span className="font-caption text-caption text-on-surface-variant flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {format(new Date(tx.createdAt), "dd MMM HH:mm", { locale: id })}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <p className={cn("font-mono-num font-semibold text-lg", tx.type === "Debit" ? "text-income" : "text-expense")}>
            {formatCurrency(Number(tx.amount))}
          </p>
          <span className={cn("inline-flex px-2 py-1 rounded-xl-custom font-caption text-capitalize",
            tx.status === "Approved" ? "bg-income/10 text-income" :
            tx.status === "Rejected" ? "bg-expense/10 text-expense" :
            tx.status === "Draft" ? "bg-surface-container-high text-on-surface-variant" :
            "bg-warning/10 text-warning")}>
            {tx.status}
          </span>
        </div>
      </div>

      {isPending && (
        <div className="mt-4 pt-4 border-t border-outline-variant flex flex-col sm:flex-row gap-3">
          <Link
            href={`/dashboard/tenant/${tenantId}/persetujuan/${tx.id}`}
            className="flex-1 sm:w-auto bg-primary hover:bg-primary/90 text-on-primary py-2.5 rounded-xl-custom font-medium text-sm flex items-center justify-center gap-2 touch-target transition-colors"
          >
            <Eye className="w-4 h-4" />
            Detail
          </Link>
        </div>
      )}
    </div>
  );
}

export default async function PersetujuanPage({ params, searchParams }: PersetujuanPageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { tenantId } = await params;
  const tenantIdNum = parseInt(tenantId);
  const urlParams = await searchParams;

  const user = session.user;

  if (user.role !== "Superadmin" && user.tenantId !== tenantIdNum) {
    redirect("/dashboard/tenant-selector");
  }

  // Pimpinan sees all pending in tenant, Manager sees only their unit
  const where: Record<string, unknown> = {
    tenantId: tenantIdNum,
    status: { in: ["Submitted", "Pending"] },
  };

  if (user.role === "Manager" && user.unitId) {
    where.unitId = user.unitId;
  }
  if (user.role === "Staff" && user.unitId) {
    where.unitId = user.unitId;
  }

  const statusFilter = urlParams.status as string;
  if (statusFilter) {
    where.status = statusFilter;
  }

  const unitFilter = urlParams.unit as string;
  if (unitFilter) {
    where.unitId = parseInt(unitFilter);
  }

  const search = urlParams.q as string;
  if (search) {
    where.OR = [
      { category: { contains: search } },
      { description: { contains: search } },
      { user: { name: { contains: search } } },
    ];
  }

  const [transactions, units, stats] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { unit: true, user: { select: { name: true } } },
    }),
    prisma.unit.findMany({
      where: { tenantId: tenantIdNum },
      select: { id: true, name: true, type: true },
    }),
    prisma.transaction.groupBy({
      by: ["status"],
      where: { tenantId: tenantIdNum, status: { in: ["Submitted", "Pending"] } },
      _count: { status: true },
    }),
  ]);

  const pendingCount = stats.find((s) => s.status === "Pending")?._count.status || 0;
  const submittedCount = stats.find((s) => s.status === "Submitted")?._count.status || 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-h2 text-h2 text-on-surface">Persetujuan</h1>
          <p className="font-caption text-caption text-on-surface-variant mt-0.5">
            Review dan persetujuan transaksi
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("inline-flex px-2 py-1 rounded-xl-custom font-caption text-capitalize",
            pendingCount > 0 ? "bg-warning/10 text-warning" : "bg-income/10 text-income")}>
            {pendingCount > 0 ? `${pendingCount} menunggu` : "Tidak ada pending"}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-warning/10 border border-warning/30 rounded-xl-custom p-4">
          <p className="font-caption text-caption text-warning/80 uppercase tracking-wider">Menunggu Review</p>
          <p className="font-mono-num text-2xl font-bold text-warning mt-1">{pendingCount}</p>
        </div>
        <div className="bg-primary/10 border border-primary/30 rounded-xl-custom p-4">
          <p className="font-caption text-caption text-primary/80 uppercase tracking-wider">Diajukan</p>
          <p className="font-mono-num text-2xl font-bold text-primary mt-1">{submittedCount}</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-surface-container-lowest rounded-xl-custom p-4 shadow-sm border border-outline-variant space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant" />
          <input
            type="text"
            placeholder="Cari kategori, keterangan, pengaju..."
            defaultValue={search}
            onChange={(e) => {
              const params = new URLSearchParams(window.location.search);
              params.set("q", e.target.value);
              window.history.pushState(null, "", `${window.location.pathname}?${params.toString()}`);
              window.location.reload();
            }}
            className="w-full pl-10 pr-4 py-2.5 border border-outline-variant rounded-xl-custom text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-surface-container-lowest"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <select
            defaultValue={statusFilter}
            onChange={(e) => {
              const params = new URLSearchParams(window.location.search);
              if (e.target.value) params.set("status", e.target.value); else params.delete("status");
              window.history.pushState(null, "", `${window.location.pathname}?${params.toString()}`);
              window.location.reload();
            }}
            className="px-3 py-2.5 border border-outline-variant rounded-xl-custom text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-surface-container-lowest"
          >
            <option value="">Semua Status</option>
            <option value="Submitted">Diajukan</option>
            <option value="Pending">Menunggu Pimpinan</option>
          </select>

          <select
            defaultValue={unitFilter}
            onChange={(e) => {
              const params = new URLSearchParams(window.location.search);
              if (e.target.value) params.set("unit", e.target.value); else params.delete("unit");
              window.history.pushState(null, "", `${window.location.pathname}?${params.toString()}`);
              window.location.reload();
            }}
            className="px-3 py-2.5 border border-outline-variant rounded-xl-custom text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-surface-container-lowest"
          >
            <option value="">Semua Unit</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {transactions.length === 0 ? (
          <div className="bg-surface-container-lowest rounded-xl-custom p-8 text-center">
            <AlertTriangle className="w-12 h-12 text-on-surface-variant/30 mx-auto mb-3" />
            <p className="font-body text-body text-on-surface-variant">Belum ada transaksi menunggu persetujuan</p>
            <p className="font-caption text-caption text-on-surface-variant mt-1">Transaksi yang sudah disetujui akan muncul di halaman Transaksi</p>
          </div>
        ) : (
          transactions.map((tx) => (
            <ApprovalCard key={tx.id} tx={tx} />
          ))
        )}
      </div>
    </div>
  );
}