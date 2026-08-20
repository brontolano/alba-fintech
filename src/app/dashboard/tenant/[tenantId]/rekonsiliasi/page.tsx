import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import Link from "next/link";
import { Plus, Filter, Search, Eye, Check, X, AlertTriangle, Clock, Wallet, Download, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface RekonsiliasiPageProps {
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

function RekonsiliasiCard({ rec }: {
  rec: {
    id: number;
    reconciliationDate: Date;
    unit: { name: string; type: string };
    physicalCash: number;
    digitalBalance: number;
    difference: number;
    notes: string | null;
    status: string;
    user: { name: string };
    createdAt: Date;
  };
}) {
  const isPending = rec.status === "Pending";
  const diffClass = rec.difference > 0 ? "text-income" : rec.difference < 0 ? "text-expense" : "text-primary";

  return (
    <div className="bg-surface-container-lowest rounded-xl-custom p-4 shadow-sm border border-outline-variant">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-caption text-capitalize text-on-surface-variant">{rec.unit.name}</span>
            <span className={cn("inline-flex px-2 py-0.5 rounded-xl-custom font-caption text-caption",
              rec.unit.type === "Retail" ? "bg-income/10 text-income" : "bg-primary/10 text-primary")}>
              {rec.unit.type}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-2 text-sm">
            <div>
              <p className="font-caption text-caption text-on-surface-variant">Fisik</p>
              <p className="font-mono-num font-medium text-on-surface">{formatCurrency(rec.physicalCash)}</p>
            </div>
            <div>
              <p className="font-caption text-caption text-on-surface-variant">Digital</p>
              <p className="font-mono-num font-medium text-on-surface">{formatCurrency(rec.digitalBalance)}</p>
            </div>
            <div>
              <p className="font-caption text-caption text-on-surface-variant">Selisih</p>
              <p className={cn("font-mono-num font-medium", diffClass)}>
                {rec.difference >= 0 ? "+" : ""}{formatCurrency(rec.difference)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span className="font-caption text-caption text-on-surface-variant flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {format(new Date(rec.reconciliationDate), "dd MMM yyyy", { locale: id })}
            </span>
            <span className="font-caption text-caption text-on-surface-variant flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {format(new Date(rec.createdAt), "HH:mm", { locale: id })}
            </span>
            <span className="font-caption text-caption text-on-surface-variant flex items-center gap-1">
              <Wallet className="w-3 h-3" />
              {rec.user.name}
            </span>
          </div>
          {rec.notes && (
            <p className="font-caption text-caption text-on-surface-variant mt-2 line-clamp-1">
              {rec.notes}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <span className={cn("inline-flex px-3 py-1 rounded-xl-custom font-caption text-capitalize",
            rec.status === "Approved" ? "bg-income/10 text-income" :
            rec.status === "Validated" ? "bg-primary/10 text-primary" :
            "bg-warning/10 text-warning")}>
            {rec.status}
          </span>
        </div>
      </div>

      {isPending && (
        <div className="mt-4 pt-4 border-t border-outline-variant flex flex-col sm:flex-row gap-3">
          <Link
            href={`/dashboard/tenant/${rec.unit.name}/rekonsiliasi/${rec.id}`}
            className="flex-1 sm:w-auto bg-primary hover:bg-primary/90 text-on-primary py-2.5 rounded-xl-custom font-medium text-sm flex items-center justify-center gap-2 touch-target transition-colors"
          >
            <Eye className="w-4 h-4" />
            Detail & Validasi
          </Link>
        </div>
      )}
    </div>
  );
}

export default async function RekonsiliasiPage({ params, searchParams }: RekonsiliasiPageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { tenantId } = await params;
  const tenantIdNum = parseInt(tenantId);
  const urlParams = await searchParams;

  const user = session.user;

  if (user.role !== "Superadmin" && user.tenantId !== tenantIdNum) {
    redirect("/dashboard/tenant-selector");
  }

  // Pimpinan sees all, Manager/Staff see only their unit
  const where: Record<string, unknown> = { tenantId: tenantIdNum };

  if (user.role === "Manager" && user.unitId) where.unitId = user.unitId;
  if (user.role === "Staff" && user.unitId) where.unitId = user.unitId;

  const statusFilter = urlParams.status as string;
  if (statusFilter) where.status = statusFilter;

  const unitFilter = urlParams.unit as string;
  if (unitFilter) where.unitId = parseInt(unitFilter);

  const [reconciliations, units, stats] = await Promise.all([
    prisma.reconciliation.findMany({
      where,
      orderBy: { reconciliationDate: "desc" },
      take: 50,
      include: { unit: true, user: { select: { name: true } } },
    }),
    prisma.unit.findMany({
      where: { tenantId: tenantIdNum },
      select: { id: true, name: true, type: true, balance: true },
    }),
    prisma.reconciliation.groupBy({
      by: ["status"],
      where: { tenantId: tenantIdNum },
      _count: { status: true },
    }),
  ]);

  const pendingCount = stats.find((s) => s.status === "Pending")?._count.status || 0;
  const validatedCount = stats.find((s) => s.status === "Validated")?._count.status || 0;
  const approvedCount = stats.find((s) => s.status === "Approved")?._count.status || 0;

  // Total discrepancy
  const totalDiff = reconciliations.reduce((sum, r) => sum + Number(r.difference), 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-h2 text-h2 text-on-surface">Rekonsiliasi</h1>
          <p className="font-caption text-caption text-on-surface-variant mt-0.5">
            Validasi saldo fisik vs digital
          </p>
        </div>
        <Link
          href={`/dashboard/tenant/${tenantId}/rekonsiliasi/new`}
          className="bg-primary hover:bg-primary/90 text-on-primary px-4 py-2.5 rounded-xl-custom font-medium text-sm flex items-center gap-2 touch-target"
        >
          <Plus className="w-4 h-4" />
          Input Stor
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-warning/10 border border-warning/30 rounded-xl-custom p-4">
          <p className="font-caption text-caption text-warning/80 uppercase tracking-wider">Menunggu Validasi</p>
          <p className="font-mono-num text-2xl font-bold text-warning mt-1">{pendingCount}</p>
        </div>
        <div className="bg-primary/10 border border-primary/30 rounded-xl-custom p-4">
          <p className="font-caption text-caption text-primary/80 uppercase tracking-wider">Tervalidasi</p>
          <p className="font-mono-num text-2xl font-bold text-primary mt-1">{validatedCount}</p>
        </div>
        <div className="bg-income/10 border border-income/30 rounded-xl-custom p-4">
          <p className="font-caption text-caption text-income/80 uppercase tracking-wider">Disetujui</p>
          <p className="font-mono-num text-2xl font-bold text-income mt-1">{approvedCount}</p>
        </div>
        <div className={cn("rounded-xl-custom p-4", totalDiff !== 0 ? "bg-expense/10 border border-expense/30" : "bg-income/10 border border-income/30")}>
          <p className="font-caption text-caption text-on-surface-variant uppercase tracking-wider">Total Selisih</p>
          <p className={cn("font-mono-num text-2xl font-bold mt-1", totalDiff !== 0 ? "text-expense" : "text-income")}>
            {totalDiff >= 0 ? "+" : ""}{formatCurrency(totalDiff)}
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-surface-container-lowest rounded-xl-custom p-4 shadow-sm border border-outline-variant space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant" />
          <input
            type="text"
            placeholder="Cari catatan, unit..."
            defaultValue={urlParams.q as string}
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
            defaultValue={urlParams.status as string}
            onChange={(e) => {
              const params = new URLSearchParams(window.location.search);
              if (e.target.value) params.set("status", e.target.value); else params.delete("status");
              window.history.pushState(null, "", `${window.location.pathname}?${params.toString()}`);
              window.location.reload();
            }}
            className="px-3 py-2.5 border border-outline-variant rounded-xl-custom text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-surface-container-lowest"
          >
            <option value="">Semua Status</option>
            <option value="Pending">Menunggu</option>
            <option value="Validated">Tervalidasi</option>
            <option value="Approved">Disetujui</option>
          </select>

          <select
            defaultValue={urlParams.unit as string}
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
        {reconciliations.length === 0 ? (
          <div className="bg-surface-container-lowest rounded-xl-custom p-8 text-center">
            <AlertTriangle className="w-12 h-12 text-on-surface-variant/30 mx-auto mb-3" />
            <p className="font-body text-body text-on-surface-variant">Belum ada rekonsiliasi</p>
            <Link
              href={`/dashboard/tenant/${tenantId}/rekonsiliasi/new`}
              className="mt-3 inline-flex items-center gap-1 text-primary font-medium text-sm"
            >
              Buat rekonsiliasi pertama <Plus className="w-3 h-3" />
            </Link>
          </div>
        ) : (
          reconciliations.map((rec) => (
            <RekonsiliasiCard key={rec.id} rec={rec} />
          ))
        )}
      </div>
    </div>
  );
}