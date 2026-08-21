import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { SupplierToolbar } from "./SupplierToolbar";
import { SupplierForm } from "./SupplierForm";
import { Truck, Phone, Mail, MapPin, User, ShoppingBag } from "lucide-react";
import Link from "next/link";

interface SupplierPageProps {
  params: Promise<{ tenantId: string }>;
  searchParams: Promise<{ unit?: string; q?: string }>;
}

export const dynamic = "force-dynamic";

function formatCurrency(amount: number | null | undefined) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount || 0);
}

export default async function SupplierPage({ params, searchParams }: SupplierPageProps) {
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
  if (sp.unit) where.unitId = parseInt(sp.unit);
  if ((user.role === "Manager" || user.role === "Staff") && user.unitId) {
    where.unitId = user.unitId;
  }
  if (sp.q) {
    where.OR = [
      { name: { contains: sp.q } },
      { contact: { contains: sp.q } },
      { phone: { contains: sp.q } },
    ];
  }

  const [suppliers, units] = await Promise.all([
    prisma.supplier.findMany({
      where,
      orderBy: { name: "asc" },
      include: {
        unit: { select: { id: true, name: true } },
        _count: { select: { purchaseOrders: true } },
      },
    }),
    prisma.unit.findMany({
      where: { tenantId: tenantIdNum },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const totalPurchased = suppliers.reduce((sum, s) => sum + 0, 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-h2 text-h2 text-on-surface">Supplier</h1>
          <p className="font-caption text-caption text-on-surface-variant mt-0.5">
            Kelola data supplier untuk purchase order
        </p>
      </div>
        {canManage && (
          <SupplierForm mode="create" tenantId={tenantIdNum} units={units} />
        )}
    </div>

      {/* Toolbar */}
      <SupplierToolbar
        units={units}
        defaultUnit={sp.unit || ""}
        defaultSearch={sp.q || ""}
        showUnitFilter={user.role !== "Manager" && user.role !== "Staff"}
      />

      {/* List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {suppliers.length === 0 ? (
          <div className="col-span-full bg-surface-container-lowest rounded-xl-custom p-12 text-center">
            <Truck className="w-12 h-12 text-on-surface-variant/30 mx-auto mb-3" />
            <p className="font-body text-body text-on-surface-variant">
              {sp.q ? "Tidak ada supplier yang cocok" : "Belum ada supplier"}
          </p>
            {canManage && !sp.q && (
              <p className="font-caption text-caption text-on-surface-variant mt-2">
                Tambah supplier pertama untuk purchase order
            </p>
            )}
        </div>
        ) : (
          suppliers.map((s) => (
            <div
              key={s.id}
              className="bg-surface-container-lowest rounded-xl-custom p-4 shadow-sm border border-outline-variant"
            >
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 bg-primary/10 rounded-xl-custom flex items-center justify-center flex-shrink-0">
                  <Truck className="w-6 h-6 text-primary" />
            </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-body text-body text-on-surface font-medium truncate">
                      {s.name}
                  </h3>
                    {canManage && (
                      <SupplierForm
                        mode="edit"
                        tenantId={tenantIdNum}
                        units={units}
                        supplier={{
                          id: s.id,
                          name: s.name,
                          contact: s.contact,
                          email: s.email,
                          phone: s.phone,
                          address: s.address,
                        }}
                      />
                   )}
                </div>

                  {s.contact && (
                    <p className="font-caption text-caption text-on-surface-variant mt-1 flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {s.contact}
                  </p>
                  )}
                  {s.phone && (
                    <p className="font-caption text-caption text-on-surface-variant mt-0.5 flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {s.phone}
                  </p>
                  )}
                  {s.email && (
                    <p className="font-caption text-caption text-on-surface-variant mt-0.5 flex items-center gap-1 truncate">
                      <Mail className="w-3 h-3" />
                      <span className="truncate">{s.email}</span>
                  </p>
                  )}
                  {s.address && (
                    <p className="font-caption text-caption text-on-surface-variant mt-0.5 flex items-start gap-1">
                      <MapPin className="w-3 h-3 flex-shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{s.address}</span>
                  </p>
                  )}

                  <div className="mt-3 pt-3 border-t border-outline-variant flex items-center justify-between">
                    <span className="font-caption text-caption text-on-surface-variant">
                      {s.unit?.name || "—"}
                  </span>
                    <Link
                      href={`/dashboard/tenant/${tenantId}/po?supplier=${s.id}`}
                      className="font-caption text-caption text-primary font-medium flex items-center gap-1"
                    >
                      <ShoppingBag className="w-3 h-3" />
                      {s._count.purchaseOrders} PO
                  </Link>
                </div>
              </div>
            </div>
          </div>
          ))
        )}
    </div>
  </div>
  );
}
