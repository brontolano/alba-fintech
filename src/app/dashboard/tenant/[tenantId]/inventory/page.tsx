import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import Link from "next/link";
import { Plus, Search, Filter, Eye, Edit, Trash2, AlertTriangle, Package, AlertCircle, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";

interface InventoryPageProps {
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

function InventoryCard({ item, onClick }: {
  item: {
    id: number;
    name: string;
    sku: string | null;
    category: string | null;
    imageUrl: string | null;
    buyPrice: number | null;
    sellPrice: number;
    unitOfMeasure: string;
    stock: number;
    minStock: number;
  };
  onClick?: () => void;
}) {
  const isLowStock = item.stock <= item.minStock;
  const isOutOfStock = item.stock === 0;

  return (
    <div className={cn("bg-surface-container-lowest rounded-xl-custom p-4 shadow-sm border border-outline-variant", onClick && "active:bg-surface-container-low transition-colors cursor-pointer")}>
      <div className="flex items-start gap-3">
        <div className="w-16 h-16 bg-surface-container-high rounded-xl-custom flex items-center justify-center flex-shrink-0 overflow-hidden">
          {item.imageUrl ? (
            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
          ) : (
            <Package className="w-8 h-8 text-on-surface-variant" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-body text-body text-on-surface truncate">{item.name}</h3>
            {isOutOfStock && (
              <span className="inline-flex px-2 py-0.5 rounded-xl-custom font-caption text-capitalize bg-error/10 text-error">Habis</span>
            )}
            {isLowStock && !isOutOfStock && (
              <span className="inline-flex px-2 py-0.5 rounded-xl-custom font-caption text-capitalize bg-warning/10 text-warning">Menipis</span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {item.sku && <span className="font-caption text-caption text-on-surface-variant font-mono-num">{item.sku}</span>}
            {item.category && <span className="font-caption text-caption text-on-surface-variant">{item.category}</span>}
          </div>
          <div className="flex items-center gap-3 mt-2">
            <span className="font-mono-num text-lg font-bold text-on-surface">{formatCurrency(item.sellPrice)}</span>
            <span className="font-caption text-caption text-on-surface-variant">/{item.unitOfMeasure}</span>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className={cn("font-mono-num text-base font-semibold", isOutOfStock ? "text-error" : isLowStock ? "text-warning" : "text-primary")}>
              Stok: {item.stock}
            </span>
            <span className="font-caption text-caption text-on-surface-variant">Min: {item.minStock}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function InventoryPage({ params, searchParams }: {
  params: Promise<{ tenantId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { tenantId } = await params;
  const tenantIdNum = parseInt(tenantId);
  const urlParams = await searchParams;

  const user = session.user;

  if (user.role !== "Superadmin" && user.tenantId !== tenantIdNum) {
    redirect("/dashboard/tenant-selector");
  }

  // Manager/Staff only see their unit's inventory
  const where: Record<string, unknown> = { tenantId: tenantIdNum };
  if ((user.role === "Manager" || user.role === "Staff") && user.unitId) {
    where.unitId = user.unitId;
  }

  const search = urlParams.q as string;
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { sku: { contains: search } },
      { category: { contains: search } },
    ];
  }

  const [items, lowStockCount, outOfStockCount] = await Promise.all([
    prisma.inventoryItem.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.inventoryItem.count({
      where: { ...where, stock: 0 },
    }),
    (await prisma.inventoryItem.findMany({
      where: { ...where, stock: { gt: 0 }, minStock: { gt: 0 } },
      select: { stock: true, minStock: true },
    })).filter((i) => i.stock <= i.minStock).length,
  ]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-h2 text-h2 text-on-surface">Inventori</h1>
          <p className="font-caption text-caption text-on-surface-variant mt-0.5">
            Kelola stok barang & barang dagangan
          </p>
        </div>
        <Link
          href={`/dashboard/tenant/${tenantId}/inventory/new`}
          className="bg-primary hover:bg-primary/90 text-on-primary px-4 py-2.5 rounded-xl-custom font-medium text-sm flex items-center gap-2 touch-target"
        >
          <Plus className="w-4 h-4" />
          Barang Baru
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-warning/10 border border-warning/30 rounded-xl-custom p-4">
          <p className="font-caption text-caption text-warning/80 uppercase tracking-wider">Stok Menipis</p>
          <p className="font-mono-num text-2xl font-bold text-warning mt-1">{lowStockCount}</p>
        </div>
        <div className="bg-error/10 border border-error/30 rounded-xl-custom p-4">
          <p className="font-caption text-caption text-error/80 uppercase tracking-wider">Stok Habis</p>
          <p className="font-mono-num text-2xl font-bold text-error mt-1">{outOfStockCount}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant" />
        <input
          type="text"
          placeholder="Cari nama, SKU, kategori..."
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

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.length === 0 ? (
          <div className="col-span-full bg-surface-container-lowest rounded-xl-custom p-8 text-center">
            <Package className="w-12 h-12 text-on-surface-variant/30 mx-auto mb-3" />
            <p className="font-body text-body text-on-surface-variant">Belum ada barang</p>
            <Link
              href={`/dashboard/tenant/${tenantId}/inventory/new`}
              className="mt-3 inline-flex items-center gap-1 text-primary font-medium text-sm"
            >
              Tambah barang pertama <Plus className="w-3 h-3" />
            </Link>
          </div>
        ) : (
          items.map((item) => (
            <InventoryCard key={item.id} item={item} onClick={() => window.location.href = `/dashboard/tenant/${tenantId}/inventory/${item.id}`} />
          ))
        )}
      </div>
    </div>
  );
}