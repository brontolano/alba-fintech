import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { cn } from "@/lib/utils";
import { Plus, Tag, Trash2, Edit3, TrendingUp, TrendingDown } from "lucide-react";
import { KategoriForm } from "./KategoriForm";

interface KategoriPageProps {
  params: Promise<{ tenantId: string }>;
  searchParams: Promise<{ type?: string; q?: string }>;
}

export const dynamic = "force-dynamic";

export default async function KategoriPage({ params, searchParams }: KategoriPageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { tenantId } = await params;
  const tenantIdNum = parseInt(tenantId);
  const sp = await searchParams;

  const user = session.user;
  if (user.role !== "Superadmin" && user.tenantId !== tenantIdNum) {
    redirect("/dashboard/tenant-selector");
  }

  const isPimpinan = user.role === "Pimpinan" || user.role === "Superadmin";

  const where: Record<string, unknown> = { tenantId: tenantIdNum };
  if (sp.type && ["Debit", "Kredit"].includes(sp.type)) {
    where.type = sp.type;
  }
  if (sp.q) {
    where.name = { contains: sp.q };
  }

  const [categories, units, txCounts] = await Promise.all([
    prisma.category.findMany({
      where,
      orderBy: [{ type: "asc" }, { name: "asc" }],
      include: { unit: { select: { id: true, name: true } } },
    }),
    prisma.unit.findMany({
      where: { tenantId: tenantIdNum },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.transaction.groupBy({
      by: ["category"],
      where: { tenantId: tenantIdNum },
      _count: { category: true },
    }),
  ]);

  const txCountByName = Object.fromEntries(
    txCounts.map((t) => [t.category, t._count.category])
  );

  const debitCats = categories.filter((c) => c.type === "Debit");
  const kreditCats = categories.filter((c) => c.type === "Kredit");

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-h2 text-h2 text-on-surface">Kategori Transaksi</h1>
          <p className="font-caption text-caption text-on-surface-variant mt-0.5">
            Kelola kategori untuk transaksi debit & kredit
         </p>
       </div>
        {isPimpinan && (
          <KategoriForm
            mode="create"
            tenantId={tenantIdNum}
            units={units}
          />
        )}
     </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto">
        <FilterTab href={`/dashboard/tenant/${tenantId}/kategori`} active={!sp.type}>
          Semua ({categories.length})
       </FilterTab>
        <FilterTab
          href={`/dashboard/tenant/${tenantId}/kategori?type=Debit`}
          active={sp.type === "Debit"}
          icon={<TrendingUp className="w-4 h-4" />}
          color="income"
        >
          Pemasukan ({debitCats.length})
       </FilterTab>
        <FilterTab
          href={`/dashboard/tenant/${tenantId}/kategori?type=Kredit`}
          active={sp.type === "Kredit"}
          icon={<TrendingDown className="w-4 h-4" />}
          color="expense"
        >
          Pengeluaran ({kreditCats.length})
       </FilterTab>
     </div>

      {/* Category Lists */}
      {(!sp.type || sp.type === "Debit") && debitCats.length > 0 && (
        <KategoriSection
          title="Kategori Pemasukan"
          type="Debit"
          categories={debitCats}
          txCounts={txCountByName}
          tenantId={tenantIdNum}
          units={units}
          isPimpinan={isPimpinan}
        />
      )}

      {(!sp.type || sp.type === "Kredit") && kreditCats.length > 0 && (
        <KategoriSection
          title="Kategori Pengeluaran"
          type="Kredit"
          categories={kreditCats}
          txCounts={txCountByName}
          tenantId={tenantIdNum}
          units={units}
          isPimpinan={isPimpinan}
        />
      )}

      {categories.length === 0 && (
        <div className="bg-surface-container-lowest rounded-xl-custom p-12 text-center">
          <Tag className="w-12 h-12 text-on-surface-variant/30 mx-auto mb-3" />
          <p className="font-body text-body text-on-surface-variant">
            {sp.q ? "Tidak ada kategori yang cocok" : "Belum ada kategori"}
         </p>
          {isPimpinan && !sp.q && (
            <p className="font-caption text-caption text-on-surface-variant mt-2">
              Buat kategori pertama untuk transaksi Anda
           </p>
          )}
       </div>
      )}
   </div>
  );
}

function FilterTab({
  href,
  active,
  children,
  icon,
  color,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
  icon?: React.ReactNode;
  color?: "income" | "expense";
}) {
  return (
    <a
      href={href}
      className={cn(
        "inline-flex items-center gap-1.5 px-4 py-2 rounded-xl-custom font-medium text-sm whitespace-nowrap transition-colors",
        active
          ? "bg-primary text-on-primary"
          : "bg-surface-container-lowest border border-outline-variant text-on-surface hover:bg-surface-container-low"
      )}
    >
      {icon}
      {children}
   </a>
  );
}

function KategoriSection({
  title,
  type,
  categories,
  txCounts,
  tenantId,
  units,
  isPimpinan,
}: {
  title: string;
  type: "Debit" | "Kredit";
  categories: Array<{
    id: number;
    name: string;
    type: string;
    unitId: number | null;
    unit: { id: number; name: string } | null;
  }>;
  txCounts: Record<string, number>;
  tenantId: number;
  units: { id: number; name: string }[];
  isPimpinan: boolean;
}) {
  const Icon = type === "Debit" ? TrendingUp : TrendingDown;
  const colorClass = type === "Debit" ? "text-income" : "text-expense";

  return (
    <section>
      <h2 className="font-h3 text-h3 text-on-surface flex items-center gap-2 mb-3">
        <Icon className={cn("w-5 h-5", colorClass)} />
        {title}
     </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {categories.map((cat) => {
          const usage = txCounts[cat.name] || 0;
          return (
            <div
              key={cat.id}
              className="bg-surface-container-lowest rounded-xl-custom p-4 shadow-sm border border-outline-variant"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-body text-body text-on-surface font-medium truncate">
                    {cat.name}
                 </p>
                  {cat.unit && (
                    <p className="font-caption text-caption text-on-surface-variant mt-0.5">
                      Unit: {cat.unit.name}
                   </p>
                  )}
                  <p className="font-caption text-caption text-on-surface-variant mt-2">
                    Dipakai di{" "}
                    <span className="font-mono-num font-semibold text-on-surface">
                      {usage}
                   </span>{" "}
                    transaksi
                 </p>
               </div>
                {isPimpinan && (
                  <div className="flex items-center gap-1">
                    <KategoriForm
                      mode="edit"
                      tenantId={tenantId}
                      units={units}
                      category={cat}
                    />
                 </div>
                )}
             </div>
           </div>
          );
        })}
     </div>
   </section>
  );
}
