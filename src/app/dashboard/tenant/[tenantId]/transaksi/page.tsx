import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Plus, Filter, Search, ChevronDown, Download, FileText, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface TransaksiPageProps {
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

function TransactionRow({ tx }: {
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
            <span className="font-caption text-caption text-on-surface-variant">{tx.method}</span>
          </div>
          <p className="font-body text-body text-on-surface mt-1 truncate">{tx.category}</p>
          {tx.description && <p className="font-caption text-caption text-on-surface-variant mt-0.5 line-clamp-1">{tx.description}</p>}
          <p className="font-caption text-caption text-on-surface-variant mt-0.5">{format(new Date(tx.transactionDate), "dd MMM yyyy", { locale: id })}</p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <p className={cn("font-mono-num font-semibold text-lg", tx.type === "Debit" ? "text-income" : "text-expense")}>
            {formatCurrency(Number(tx.amount))}
          </p>
          <span className={cn("inline-flex px-2 py-0.5 rounded-xl-custom font-caption text-caption",
            tx.status === "Approved" ? "bg-income/10 text-income" :
            tx.status === "Rejected" ? "bg-expense/10 text-expense" :
            tx.status === "Draft" ? "bg-surface-container-high text-on-surface-variant" :
            "bg-warning/10 text-warning")}>
            {tx.status}
          </span>
        </div>
      </div>
    </div>
  );
}

export default async function TransaksiPage({ params, searchParams }: TransaksiPageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { tenantId } = await params;
  const tenantIdNum = parseInt(tenantId);
  const urlParams = await searchParams;

  const user = session.user;

  if (user.role !== "Superadmin" && user.tenantId !== tenantIdNum) {
    redirect("/dashboard/tenant-selector");
  }

  // Parse filters
  const unitFilter = urlParams.unit as string;
  const typeFilter = urlParams.type as string;
  const statusFilter = urlParams.status as string;
  const search = urlParams.q as string;

  const where: Record<string, unknown> = { tenantId: tenantIdNum };

  if (unitFilter) where.unitId = parseInt(unitFilter);
  if (typeFilter) where.type = typeFilter;
  if (statusFilter) where.status = statusFilter;
  if (user.role === "Manager" && user.unitId) where.unitId = user.unitId;
  if (user.role === "Staff" && user.unitId) where.unitId = user.unitId;

  if (search) {
    where.OR = [
      { category: { contains: search } },
      { description: { contains: search } },
    ];
  }

  const [transactions, units, categories] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { transactionDate: "desc" },
      take: 50,
      include: { unit: true, user: { select: { name: true } } },
    }),
    prisma.unit.findMany({
      where: { tenantId: tenantIdNum },
      select: { id: true, name: true, type: true },
    }),
    prisma.category.findMany({
      where: { tenantId: tenantIdNum },
      select: { id: true, name: true, type: true },
    }),
  ]);

  const pendingCount = user.role === "Pimpinan" || user.role === "Manager"
    ? await prisma.transaction.count({
        where: {
          tenantId: tenantIdNum,
          status: { in: ["Submitted", "Pending"] },
          ...(user.role === "Manager" && user.unitId ? { unitId: user.unitId } : {}),
        },
      })
    : 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-h2 text-h2 text-on-surface">Transaksi</h1>
          <p className="font-caption text-caption text-on-surface-variant mt-0.5">
            Kelola transaksi keuangan
          </p>
        </div>
        {user.role !== "Pimpinan" && (
          <Link
            href={`/dashboard/tenant/${tenantId}/transaksi/new`}
            className="bg-primary hover:bg-primary/90 text-on-primary px-4 py-2.5 rounded-xl-custom font-medium text-sm flex items-center gap-2 touch-target"
          >
            <Plus className="w-4 h-4" />
            Tambah Transaksi
          </Link>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-surface-container-lowest rounded-xl-custom p-4 shadow-sm border border-outline-variant space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant" />
          <input
            type="text"
            placeholder="Cari kategori, keterangan..."
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

          <select
            defaultValue={typeFilter}
            onChange={(e) => {
              const params = new URLSearchParams(window.location.search);
              if (e.target.value) params.set("type", e.target.value); else params.delete("type");
              window.history.pushState(null, "", `${window.location.pathname}?${params.toString()}`);
              window.location.reload();
            }}
            className="px-3 py-2.5 border border-outline-variant rounded-xl-custom text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-surface-container-lowest"
          >
            <option value="">Semua Jenis</option>
            <option value="Debit">Pemasukan (Debit)</option>
            <option value="Kredit">Pengeluaran (Kredit)</option>
          </select>

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
            <option value="Draft">Draft</option>
            <option value="Submitted">Diajukan</option>
            <option value="Pending">Menunggu</option>
            <option value="Approved">Disetujui</option>
            <option value="Rejected">Ditolak</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface-container-lowest rounded-xl-custom shadow-sm border border-outline-variant overflow-hidden">
        {transactions.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="w-12 h-12 text-on-surface-variant/30 mx-auto mb-3" />
            <p className="font-body text-body text-on-surface-variant">Belum ada transaksi</p>
            {user.role !== "Pimpinan" && (
              <Link
                href={`/dashboard/tenant/${tenantId}/transaksi/new`}
                className="mt-3 inline-flex items-center gap-1 text-primary font-medium text-sm"
              >
                Buat transaksi pertama <ArrowRight className="w-3 h-3" />
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-surface-container-low border-b border-outline-variant text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">
                    <th className="p-4">Tanggal</th>
                    <th className="p-4">Unit</th>
                    <th className="p-4">Jenis</th>
                    <th className="p-4">Kategori</th>
                    <th className="p-4">Metode</th>
                    <th className="p-4 text-right">Nominal</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-surface-container-low/50">
                      <td className="p-4 font-caption text-caption text-on-surface-variant">
                        {format(new Date(tx.transactionDate), "dd MMM yyyy", { locale: id })}
                      </td>
                      <td className="p-4 font-body text-body text-on-surface">{tx.unit.name}</td>
                      <td className="p-4">
                        <span className={cn("inline-flex px-2 py-1 rounded-xl-custom font-caption text-caption", tx.type === "Debit" ? "bg-income/10 text-income" : "bg-expense/10 text-expense")}>
                          {tx.type}
                        </span>
                      </td>
                      <td className="p-4 font-caption text-caption text-on-surface">{tx.category}</td>
                      <td className="p-4 font-caption text-caption text-on-surface-variant">{tx.method}</td>
                      <td className={`p-4 text-right font-mono-num font-semibold ${tx.type === "Debit" ? "text-income" : "text-expense"}`}>
                        {formatCurrency(Number(tx.amount))}
                      </td>
                      <td className="p-4">
                        <span className={cn("inline-flex px-2 py-0.5 rounded-xl-custom font-caption text-caption",
                          tx.status === "Approved" ? "bg-income/10 text-income" :
                          tx.status === "Rejected" ? "bg-expense/10 text-expense" :
                          tx.status === "Draft" ? "bg-surface-container-high text-on-surface-variant" :
                          "bg-warning/10 text-warning")}>
                          {tx.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/dashboard/tenant/${tenantId}/transaksi/${tx.id}`}
                            className="p-2 text-on-surface-variant hover:text-primary rounded-xl-custom touch-target"
                            title="Detail"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t border-outline-variant flex items-center justify-between">
              <p className="font-caption text-caption text-on-surface-variant">
                Menampilkan {transactions.length} transaksi
              </p>
              <div className="flex items-center gap-2">
                <button className="px-3 py-1.5 border border-outline-variant rounded-xl-custom text-sm font-medium text-on-surface hover:bg-surface-container-low transition-colors touch-target">
                  <Download className="w-4 h-4 mr-1" />
                  Ekspor
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}