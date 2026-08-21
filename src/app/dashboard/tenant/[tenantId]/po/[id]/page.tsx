import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import Link from "next/link";
import {
  ArrowLeft,
  Truck,
  Package,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
  User as UserIcon,
  AlertCircle,
  Send,
  Save,
} from "lucide-react";
import { PoActionButtons } from "./PoActionButtons";

interface PoDetailPageProps {
  params: Promise<{ tenantId: string; id: string }>;
}

export const dynamic = "force-dynamic";

function formatCurrency(amount: number | null | undefined) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount || 0);
}

const STATUS_CONFIG: Record<
  string,
  { label: string; icon: React.ReactNode; color: string; bg: string }
> = {
  Pending: {
    label: "Menunggu",
    icon: <Clock className="w-5 h-5" />,
    color: "text-warning",
    bg: "bg-warning/10 border-warning/30",
  },
  Sent: {
    label: "Dikirim",
    icon: <Send className="w-5 h-5" />,
    color: "text-primary",
    bg: "bg-primary/10 border-primary/30",
  },
  Received: {
    label: "Diterima",
    icon: <CheckCircle className="w-5 h-5" />,
    color: "text-income",
    bg: "bg-income/10 border-income/30",
  },
  Cancelled: {
    label: "Dibatalkan",
    icon: <XCircle className="w-5 h-5" />,
    color: "text-error",
    bg: "bg-error/10 border-error/30",
  },
};

export default async function PoDetailPage({ params }: PoDetailPageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { tenantId, id } = await params;
  const tenantIdNum = parseInt(tenantId);
  const poId = parseInt(id);

  const user = session.user;
  if (user.role !== "Superadmin" && user.tenantId !== tenantIdNum) {
    redirect("/dashboard/tenant-selector");
  }

  const po = await prisma.purchaseOrder.findUnique({
    where: { id: poId },
    include: {
      supplier: true,
      unit: { select: { id: true, name: true, type: true } },
      createdBy: { select: { name: true, email: true } },
      items: {
        include: {
          inventory: { select: { id: true, name: true, unitOfMeasure: true, stock: true } },
        },
      },
    },
  });

  if (!po || po.tenantId !== tenantIdNum) {
    redirect(`/dashboard/tenant/${tenantId}/po`);
  }

  // RBAC
  if ((user.role === "Manager" || user.role === "Staff") && po.unitId !== user.unitId) {
    redirect(`/dashboard/tenant/${tenantId}/po`);
  }

  const statusCfg = STATUS_CONFIG[po.status] || STATUS_CONFIG.Pending;

  const canReceive =
    po.status === "Pending" &&
    ["Manager", "Staff", "Pimpinan", "Superadmin"].includes(user.role) &&
    (user.role === "Pimpinan" || user.role === "Superadmin" || po.unitId === user.unitId);

  const canCancel =
    (po.status === "Pending" || po.status === "Sent") &&
    ["Manager", "Pimpinan", "Superadmin"].includes(user.role) &&
    (user.role === "Pimpinan" || user.role === "Superadmin" || po.unitId === user.unitId);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={`/dashboard/tenant/${tenantId}/po`}
          className="p-2 hover:bg-surface-container-low rounded-xl-custom touch-target"
        >
          <ArrowLeft className="w-5 h-5" />
      </Link>
        <div className="flex-1">
          <h1 className="font-h2 text-h2 text-on-surface">PO #{po.id}</h1>
          <p className="font-caption text-caption text-on-surface-variant mt-0.5">
            {po.supplier.name} · {po.unit.name}
        </p>
      </div>
    </div>

      {/* Status Banner */}
      <div className={`rounded-xl-custom p-4 border ${statusCfg.bg} flex items-center gap-3`}>
        <div className={statusCfg.color}>{statusCfg.icon}</div>
        <div className="flex-1">
          <p className={`font-h3 text-h3 ${statusCfg.color}`}>{statusCfg.label}</p>
          <p className="font-caption text-caption text-on-surface-variant">
            Dibuat{" "}
            {format(new Date(po.createdAt), "dd MMM yyyy HH:mm", { locale: idLocale })}
            {po.receivedAt &&
              ` · Diterima ${format(
                new Date(po.receivedAt),
                "dd MMM yyyy HH:mm",
                { locale: idLocale }
              )}`}
        </p>
      </div>
    </div>

      {/* Supplier Info */}
      <div className="bg-surface-container-lowest rounded-xl-custom p-4 shadow-sm border border-outline-variant space-y-3">
        <h2 className="font-h3 text-h3 text-on-surface">Supplier</h2>
        <div className="space-y-2">
          <InfoRow icon={<Truck className="w-4 h-4" />} label="Nama" value={po.supplier.name} />
          {po.supplier.contact && (
            <InfoRow icon={<UserIcon className="w-4 h-4" />} label="PIC" value={po.supplier.contact} />
          )}
          {po.supplier.phone && (
            <InfoRow icon={<UserIcon className="w-4 h-4" />} label="Telepon" value={po.supplier.phone} />
          )}
          {po.supplier.address && (
            <InfoRow
              icon={<MapPin className="w-4 h-4" />}
              label="Alamat"
              value={po.supplier.address}
              multiline
            />
          )}
      </div>
    </div>

      {/* Order Info */}
      <div className="bg-surface-container-lowest rounded-xl-custom p-4 shadow-sm border border-outline-variant space-y-3">
        <h2 className="font-h3 text-h3 text-on-surface">Detail Pesanan</h2>
        <div className="space-y-2">
          <InfoRow
            icon={<Calendar className="w-4 h-4" />}
            label="Tanggal"
            value={format(new Date(po.orderDate), "dd MMMM yyyy", { locale: idLocale })}
          />
          <InfoRow
            icon={<Package className="w-4 h-4" />}
            label="Unit"
            value={`${po.unit.name} (${po.unit.type})`}
          />
          <InfoRow
            icon={<UserIcon className="w-4 h-4" />}
            label="Dibuat oleh"
            value={po.createdBy.name}
          />
          {po.notes && (
            <InfoRow
              icon={<AlertCircle className="w-4 h-4" />}
              label="Catatan"
              value={po.notes}
              multiline
            />
          )}
      </div>
    </div>

      {/* Items */}
      <div className="bg-surface-container-lowest rounded-xl-custom shadow-sm border border-outline-variant overflow-hidden">
        <div className="p-4 border-b border-outline-variant">
          <h2 className="font-h3 text-h3 text-on-surface">Item Pesanan</h2>
          <p className="font-caption text-caption text-on-surface-variant mt-0.5">
            {po.items.length} item
        </p>
      </div>
        <div className="divide-y divide-outline-variant">
          {po.items.map((item) => (
            <div key={item.id} className="p-4 flex items-start gap-3">
              <div className="w-10 h-10 bg-surface-container-high rounded-xl-custom flex items-center justify-center flex-shrink-0">
                <Package className="w-5 h-5 text-on-surface-variant" />
            </div>
              <div className="flex-1 min-w-0">
                <p className="font-body text-body text-on-surface truncate">
                  {item.inventory.name}
              </p>
                <p className="font-caption text-caption text-on-surface-variant mt-0.5">
                  {formatCurrency(Number(item.unitPrice))} / {item.inventory.unitOfMeasure} ×{" "}
                  {item.quantity}
               </p>
                {po.status === "Received" && (
                  <p className="font-caption text-caption text-income mt-1">
                    Stok sekarang: {item.inventory.stock} {item.inventory.unitOfMeasure}
                </p>
                )}
            </div>
              <div className="text-right shrink-0">
                <p className="font-mono-num text-lg font-bold text-on-surface">
                  {formatCurrency(Number(item.subtotal))}
              </p>
            </div>
          </div>
          ))}
          <div className="p-4 bg-surface-container-low flex items-center justify-between">
            <span className="font-h3 text-h3 text-on-surface">Total</span>
            <span className="font-mono-num text-2xl font-bold text-primary">
              {formatCurrency(Number(po.totalAmount))}
          </span>
        </div>
      </div>
    </div>

      {/* Actions */}
      {(canReceive || canCancel) && (
        <PoActionButtons
          tenantId={tenantIdNum}
          poId={po.id}
          status={po.status}
          canReceive={canReceive}
          canCancel={canCancel}
        />
      )}
  </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
  multiline,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-on-surface-variant mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="font-caption text-caption text-on-surface-variant uppercase tracking-wider">
          {label}
      </p>
        <p
          className={`font-body text-body text-on-surface ${multiline ? "whitespace-pre-wrap" : ""}`}
        >
          {value}
      </p>
    </div>
  </div>
  );
}