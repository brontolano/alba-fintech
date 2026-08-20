import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import Link from "next/link";
import { Plus, Search, Filter, Eye, Calendar, ShoppingCart, DollarSign, CreditCard, Wallet, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import PosClient from "./PosClient";

interface PosPageProps {
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

export default async function PosPage({ params, searchParams }: PosPageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { tenantId } = await params;
  const tenantIdNum = parseInt(tenantId);
  const urlParams = await searchParams;

  const user = session.user;

  if (user.role !== "Superadmin" && user.tenantId !== tenantIdNum) {
    redirect("/dashboard/tenant-selector");
  }

  // Manager/Staff only see their unit's sales
  const where: Record<string, unknown> = { tenantId: tenantIdNum };
  if ((user.role === "Manager" || user.role === "Staff") && user.unitId) {
    where.unitId = user.unitId;
  }

  const statusFilter = urlParams.status as string;
  if (statusFilter) where.status = statusFilter;

  const dateFilter = urlParams.date as string;
  if (dateFilter) {
    const date = new Date(dateFilter);
    const start = new Date(date.setHours(0, 0, 0, 0));
    const end = new Date(date.setHours(23, 59, 59, 999));
    where.createdAt = { gte: start, lte: end };
  }

  const [sales, stats, openShift] = await Promise.all([
    prisma.posSale.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        items: { include: { inventory: { select: { name: true } } } },
        shift: { select: { openingCash: true, closingCash: true } },
      },
    }),
    prisma.posSale.groupBy({
      by: ["status"],
      where: { tenantId: tenantIdNum, ...(user.unitId ? { unitId: user.unitId } : {}) },
      _sum: { totalAmount: true },
      _count: { status: true },
    }),
    prisma.cashierShift.findFirst({
      where: { tenantId: tenantIdNum, unitId: user.unitId || undefined, status: "Open" },
      orderBy: { openedAt: "desc" },
    }),
  ]);

  const todaySales = stats.find(s => s.status === "Completed")?._sum.totalAmount || 0;
  const todayCount = stats.find(s => s.status === "Completed")?._count.status || 0;
  const refundAmount = stats.find(s => s.status === "Refunded")?._sum.totalAmount || 0;
  const refundCount = stats.find(s => s.status === "Refunded")?._count.status || 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-h2 text-h2 text-on-surface">POS Kasir</h1>
          <p className="font-caption text-caption text-on-surface-variant mt-0.5">
            Kelola penjualan & transaksi kasir
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/tenant/${tenantId}/pos/new`}
            className="bg-primary hover:bg-primary/90 text-on-primary px-4 py-2.5 rounded-xl-custom font-medium text-sm flex items-center gap-2 touch-target"
          >
            <Plus className="w-4 h-4" />
            Penjualan Baru
          </Link>
          <Link
            href={`/dashboard/tenant/${tenantId}/pos/shift`}
            className="bg-secondary hover:bg-secondary/90 text-on-secondary px-4 py-2.5 rounded-xl-custom font-medium text-sm flex items-center gap-2 touch-target"
          >
            <ShoppingCart className="w-4 h-4" />
            Shift
          </Link>
        </div>
      </div>

      {/* Open Shift Alert */}
      {openShift && (
        <div className="bg-primary/10 border border-primary/30 rounded-xl-custom p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/20 rounded-xl-custom">
                <ShoppingCart className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-body text-body text-primary font-medium">Shift Kasir Sedang Buka</p>
                <p className="font-caption text-caption text-primary/80">
                  Dibuka: {format(new Date(openShift.openedAt), "dd MMM yyyy HH:mm", { locale: id })} • Kas awal: {formatCurrency(openShift.openingCash)}
                </p>
              </div>
            </div>
            <Link
              href={`/dashboard/tenant/${tenantId}/pos/shift`}
              className="bg-primary hover:bg-primary/90 text-on-primary px-4 py-2 rounded-xl-custom font-medium text-sm touch-target"
            >
              Kelola Shift
            </Link>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-income/10 border border-income/30 rounded-xl-custom p-4">
          <p className="font-caption text-caption text-income/80 uppercase tracking-wider">Penjualan Hari Ini</p>
          <p className="font-mono-num text-2xl font-bold text-income mt-1">{formatCurrency(todaySales)}</p>
          <p className="font-caption text-caption text-income/80 mt-1">{todayCount} transaksi</p>
        </div>
        <div className="bg-warning/10 border border-warning/30 rounded-xl-custom p-4">
          <p className="font-caption text-caption text-warning/80 uppercase tracking-wider">Refund</p>
          <p className="font-mono-num text-2xl font-bold text-warning mt-1">{formatCurrency(refundAmount)}</p>
          <p className="font-caption text-caption text-warning/80 mt-1">{refundCount} transaksi</p>
        </div>
        <div className="bg-primary/10 border border-primary/30 rounded-xl-custom p-4">
          <p className="font-caption text-caption text-primary/80 uppercase tracking-wider">Shift Aktif</p>
          <p className="font-mono-num text-2xl font-bold text-primary mt-1">{openShift ? "Buka" : "Tutup"}</p>
        </div>
        <div className="bg-secondary/10 border border-secondary/30 rounded-xl-custom p-4">
          <p className="font-caption text-caption text-secondary/80 uppercase tracking-wider">Metode Bayar</p>
          <p className="font-mono-num text-2xl font-bold text-secondary mt-1">Tunai/Transfer</p>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-surface-container-lowest rounded-xl-custom p-4 shadow-sm border border-outline-variant space-y-3">
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
            <option value="Completed">Selesai</option>
            <option value="Refunded">Refund</option>
            <option value="Void">Batal</option>
          </select>

          <input
            type="date"
            defaultValue={urlParams.date as string}
            onChange={(e) => {
              const params = new URLSearchParams(window.location.search);
              if (e.target.value) params.set("date", e.target.value); else params.delete("date");
              window.history.pushState(null, "", `${window.location.pathname}?${params.toString()}`);
              window.location.reload();
            }}
            className="px-3 py-2.5 border border-outline-variant rounded-xl-custom text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-surface-container-lowest"
          />

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant" />
            <input
              type="text"
              placeholder="Cari nota, item..."
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
        </div>
      </div>

      {/* Sales List */}
      <PosClient sales={sales} tenantId={tenantId} />
    </div>
  );
}