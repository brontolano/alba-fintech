import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { PoToolbar } from "./PoToolbar";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { Truck, ShoppingBag, CheckCircle, XCircle, Clock, TrendingUp } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface PoPageProps {
  params: Promise<{ tenantId: string }>;
  searchParams: Promise<{ status?: string; unit?: string; q?: string; supplier?: string }>;
}

export const dynamic = "force-dynamic";

function formatCurrency(amount: number | null | undefined) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount || 0);
}

const STATUS_ICONS: Record<string, React.ReactNode> = {
  Pending: <Clock className="w-4 h-4 text-warning" />,
  Sent: <Truck className="w-4 h-4 text-primary" />,
  Received: <CheckCircle className="w-4 h-4 text-income" />,
  Cancelled: <XCircle className="w-4 h-4 text-error" />,
};

const STATUS_LABELS: Record<string, string> = {
  Pending: "Menunggu",
  Sent: "Dikirim",
  Received: "Diterima",
  Cancelled: "Dibatalkan",
};

export default async function PoPage({ params, searchParams }: PoPageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { tenantId } = await params;
  const tenantIdNum = parseInt(tenantId);
  const sp = await searchParams;

  const user = session.user;
  if (user.role !== "Superadmin" && user.tenantId !== tenantIdNum) {
    redirect("/dashboard/tenant-selector");
  }

  const canManage = ["Pimpinan", "Manager", "Superadmin"].includes(user.role);

  const where: Record<string, unknown> = { tenantId: tenantIdNum };
  if (sp.status && ["Pending", "Sent", "Received", "Cancelled"].includes(sp.status)) {
    where.status = sp.status;
  }
  if (sp.unit) where.unitId = parseInt(sp.unit);
  if (sp.supplier) where.supplierId = parseInt(sp.supplier);
  if (sp.q) {
    where.OR = [
      { supplier: { name: { contains: sp.q } } },
      { notes: { contains: sp.q } },
    ];
  }
  // Manager/Staff only see their unit's PO
  if ((user.role === "Manager" || user.role === "Staff") && user.unitId) {
    where.unitId = user.unitId;
  }

  const [pos, units, suppliers] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        supplier: { select: { id: true, name: true } },
        unit: { select: { id: true, name: true } },
        createdBy: { select: { name: true } },
        _count: { select: { items: true } },
      },
    }),
    prisma.unit.findMany({
      where: { tenantId: tenantIdNum },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.supplier.findMany({
      where: { tenantId: tenantIdNum },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const pendingCount = pos.filter((p) => p.status === "Pending").length;
  const receivedCount = pos.filter((p) => p.status === "Received").length;
  const totalAmount = pos.reduce((sum, p) => sum + Number(p.totalAmount), 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-h2 text-h2 text-on-surface">Purchase Order</h1>
          <p className="font-caption text-caption text-on-surface-variant mt-0.5">
            Kelola pesanan pembelian ke supplier
        </p>
      </div>
        {canManage && (
          <Link
            href={`/dashboard/tenant/${tenantId}/po/new`}
            className="bg-primary hover:bg-primary/90 text-on-primary px-4 py-2.5 rounded-xl-custom font-medium text-sm flex items-center gap-2 touch-target"
          >
            <Plus className="w-4 h-4" />
            PO Baru
          </Link>
        )}
    </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-surface-container-lowest rounded-xl-custom p-4 border border-outline-variant">
          <p className="font-caption text-caption text-on-surface-variant">Menunggu</p>
          <p className="font-mono-num text-2xl font-bold text-warning mt-1">{pendingCount}</p>
        </div>
        <div className="bg-surface-container-lowest rounded-xl-custom p-4 border border-outline-variant">
          <p className="font-caption text-caption text-on-surface-variant">Diterima</p>
          <p className="font-mono-nom text-2xl font-bold text-income mt-1">{receivedCount}</p>
        </div>
        <div className="bg-surface-container-lowest rounded-xl-custom p-4 border border-outline-variant">
          <p className="font-caption text-caption text-on-surface-variant">Total PO</p>
          <p className="font-mono-num text-2xl font-bold text-on-surface mt-1">{pos.length}</p>
        </div>
        <div className="bg-surface-container-lowest rounded-xl-custom p-4 border border-outline-variant">
          <p className="font-caption text-caption text-on-surface-variant">Total Nilai</p>
          <p className="font-mono-num text-2xl font-bold text-primary mt-1">{formatCurrency(totalAmount)}</p>
        </div>
      </div>

      {/* Toolbar */}
      <PoToolbar
        units={units}
        suppliers={suppliers}
        defaultUnit={sp.unit || ""}
        defaultSupplier={sp.supplier || ""}
        defaultStatus={sp.status || "all"}
        defaultSearch={sp.q || ""}
        showUnitFilter={user.role !== "Manager" && user.role !== "Staff"}
      />

      {/* List */}
      <div className="space-y-3">
        {pos.length === 0 ? (
          <div className="bg-surface-container-lowest rounded-xl-custom p-12 text-center">
            <ShoppingBag className="w-12 h-12 text-on-surface-variant/30 mx-auto mb-3" />
            <p className="font-body text-body text-on-surface-variant">
              {sp.q ? "Tidak ada PO yang cocok" : "Belum ada purchase order"}
          </p>
        </div>
        ) : (
          pos.map((po) => (
            <Link
              key={po.id}
              href={`/dashboard/tenant/${tenantId}/po/${po.id}`}
              className="block bg-surface-container-lowest rounded-xl-custom p-4 shadow-sm border border-outline-variant active:bg-surface-container-low transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={cn("font-body text-body text-on-surface font-medium", po.status === "Received" && "line-through")}>
                        PO #{po.id}
                      </span>
                      {STATUS_ICONS[po.status] || <Clock className="w-4 h-4 text-on-surface-variant" />}
                    </div>
                    <span className={cn(
                      "inline-flex px-2 py-0.5 rounded-xl-custom font-caption text-capitalize whitespace-nowrap",
                      po.status === "Pending" && "bg-warning/10 text-warning",
                      po.status === "Sent" && "bg-primary/10 text-primary",
                      po.status === "Received" && "bg-income/10 text-income",
                      po.status === "Cancelled" && "bg-error/10 text-error"
                    )}>
                      {STATUS_LABELS[po.status] || po.status}
                    </span>
                  </div>

                  <div className="mt-1 flex items-center gap-3 text-sm text-on-surface-variant flex-wrap">
                    <span className="flex items-center gap-1">
                      <Truck className="w-3 h-3" />
                      {po.supplier.name}
                    </span>
                    {po.unit && (
                      <span className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        {po.unit.name}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {format(new Date(po.createdAt), "dd MMM yyyy HH:mm", { locale: idLocale })}
                    </span>
                  </div>

                  {po.notes && (
                    <p className="font-caption text-caption text-on-surface-variant mt-2 line-clamp-1">
                      {po.notes}
                  </p>
                  )}
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0">
                  <p className="font-mono-num text-xl font-bold text-on-surface">
                    {formatCurrency(po.totalAmount)}
                  </p>
                  <p className="font-caption text-caption text-on-surface-variant">
                    {po._count.items} item
                  </p>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}