import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, Search, Edit, Trash2, MoreVertical, ExternalLink } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth-utils";
import { formatDateID } from "@/lib/superadmin";
import { cn } from "@/lib/utils";
import { TenantStatusFilter } from "./tenant-status-filter";
import { deleteTenantAction, toggleTenantActiveAction } from "./actions";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function TenantsPage({ searchParams }: Props) {
  const user = await requireRole(["Superadmin"]);

  const params = await searchParams;
  const q = (Array.isArray(params.q) ? params.q[0] : params.q) || "";
  const status = (Array.isArray(params.status) ? params.status[0] : params.status) || "all";
  const page = parseInt((Array.isArray(params.page) ? params.page[0] : params.page) || "1", 10);
  const pageNum = Number.isFinite(page) && page > 0 ? page : 1;
  const pageSize = 20;

  const [tenants, total] = await Promise.all([
    prisma.tenant.findMany({
      where: {
        ...(q
          ? {
              OR: [
                { name: { contains: q } },
                { appName: { contains: q } },
                { subdomain: { contains: q } },
                { domain: { contains: q } },
              ],
            }
          : {}),
        ...(status === "active"
          ? { isActive: true }
          : status === "inactive"
          ? { isActive: false }
          : {}),
      },
      include: {
        _count: { select: { users: true, units: true, transactions: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (pageNum - 1) * pageSize,
      take: pageSize,
    }),
    prisma.tenant.count({
      where: {
        ...(q
          ? {
              OR: [
                { name: { contains: q } },
                { appName: { contains: q } },
                { subdomain: { contains: q } },
                { domain: { contains: q } },
              ],
            }
          : {}),
        ...(status === "active"
          ? { isActive: true }
          : status === "inactive"
          ? { isActive: false }
          : {}),
      },
    }),
  ]);

  const totalPages = Math.ceil(total / pageSize);
  const hasNext = pageNum < totalPages;
  const hasPrev = pageNum > 1;

  async function handleDelete(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const confirmed = confirm("Hapus tenant ini? Tindakan ini tidak bisa dibatalkan.");
    if (!confirmed) return;
    const formData = new FormData(e.currentTarget);
    try {
      await deleteTenantAction(Number(formData.get("id")));
    } catch (err) {
      alert((err as Error).message || "Gagal menghapus tenant");
    }
  }

  return (
    <div className="space-y-6 max-w-screen-2xl">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex-1 min-w-[280px]">
          <form method="GET" className="relative">
            <input type="hidden" name="status" value={status} />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Cari tenant, app name, atau domain..."
              className="w-full pl-10 pr-4 py-2.5 border border-outline-variant rounded-xl-custom text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-surface-container-lowest"
            />
          </form>
        </div>

        <div className="flex items-center gap-2">
          <TenantStatusFilter defaultValue={status} />
          <Link
            href="/superadmin/tenants/new"
            className="inline-flex items-center gap-2 bg-primary text-on-primary px-4 py-2.5 rounded-xl-custom font-medium text-sm hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Tenant Baru
          </Link>
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface-container-lowest rounded-xl-custom border border-outline-variant overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="bg-surface-container-low text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">
                <th className="px-5 py-3">Tenant</th>
                <th className="px-5 py-3">App Name</th>
                <th className="px-5 py-3">Domain / Subdomain</th>
                <th className="px-5 py-3 text-right">Unit</th>
                <th className="px-5 py-3 text-right">Pengguna</th>
                <th className="px-5 py-3 text-right">Transaksi</th>
                <th className="px-5 py-3">Modul</th>
                <th className="px-5 py-3">Dibuat</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {tenants.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-5 py-12 text-center text-on-surface-variant">
                    <div className="flex flex-col items-center gap-3">
                      <Search className="w-8 h-8 text-on-surface-variant/40" />
                      <p>Tidak ada tenant ditemukan</p>
                      {q && (
                        <Link
                          href="/superadmin/tenants"
                          className="text-sm text-primary hover:underline"
                        >
                          Hapus filter
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              )}
              {tenants.map((tenant) => (
                <tr key={tenant.id} className="hover:bg-surface-container-low/50">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-xl-custom flex items-center justify-center text-on-primary font-bold text-sm"
                        style={{ backgroundColor: tenant.primaryColor }}
                      >
                        {tenant.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-on-surface">{tenant.name}</p>
                        <p className="text-xs text-on-surface-variant">
                          ID #{tenant.id}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-on-surface">{tenant.appName}</td>
                  <td className="px-5 py-3.5 text-on-surface-variant">
                    {tenant.subdomain && (
                      <div className="flex items-center gap-1">
                        <span>{tenant.subdomain}.alba.app</span>
                        <ExternalLink className="w-3 h-3 text-on-surface-variant/50" />
                      </div>
                    )}
                    {tenant.domain && (
                      <div className="text-xs mt-0.5">{tenant.domain}</div>
                    )}
                    {!tenant.subdomain && !tenant.domain && "-"}
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono-num text-on-surface">
                    {tenant._count.units}
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono-num text-on-surface">
                    {tenant._count.users}
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono-num text-on-surface">
                    {tenant._count.transactions}
                  </td>
                  <td className="px-5 py-3.5">
                    <TenantModules modules={tenant.activeModules} />
                  </td>
                  <td className="px-5 py-3.5 text-on-surface-variant text-sm">
                    {formatDateID(tenant.createdAt)}
                  </td>
                  <td className="px-5 py-3.5">
                    <form action={toggleTenantActiveAction} className="inline">
                      <input type="hidden" name="id" value={tenant.id} />
                      <button
                        type="submit"
                        className={cn(
                          "inline-flex px-2 py-0.5 rounded-xl-custom font-caption text-capitalize transition-colors",
                          tenant.isActive
                            ? "bg-income/10 text-income"
                            : "bg-surface-container-high text-on-surface-variant"
                        )}
                      >
                        {tenant.isActive ? "Aktif" : "Non-aktif"}
                      </button>
                    </form>
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Link
                        href={`/superadmin/tenants/${tenant.id}`}
                        className="p-1.5 text-on-surface-variant hover:text-primary rounded-xl-custom hover:bg-surface-container-high transition"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </Link>
                      <form
                        onSubmit={handleDelete}
                        action={deleteTenantAction}
                        className="inline"
                      >
                        <input type="hidden" name="id" value={tenant.id} />
                        <button
                          type="submit"
                          className="p-1.5 text-on-surface-variant hover:text-error rounded-xl-custom hover:bg-error/10 transition"
                          title="Hapus"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination
          current={pageNum}
          total={totalPages}
          hasPrev={hasPrev}
          hasNext={hasNext}
        />
      )}
    </div>
  );
}

function TenantModules({ modules }: { modules: string }) {
  if (!modules) {
    return <span className="text-on-surface-variant">—</span>;
  }
  const active = modules.split(",").filter(Boolean).slice(0, 3);
  if (active.length === 0) return <span className="text-on-surface-variant">—</span>;
  const labels = {
    transactions: "Transaksi",
    reconciliation: "Rekon",
    inventory: "Inventori",
    retail: "POS",
    ai: "AI",
  };
  return (
    <div className="flex flex-wrap gap-1">
      {active.map((m) => (
        <span
          key={m}
          className="inline-block px-1.5 py-0.5 bg-surface-container-high text-on-surface-variant rounded text-xs"
        >
          {labels[m as keyof typeof labels] || m}
        </span>
      ))}
      {modules.split(",").length > 3 && (
        <span className="text-xs text-on-surface-variant">
          +{modules.split(",").length - 3}
        </span>
      )}
    </div>
  );
}

function Pagination({
  current,
  total,
  hasPrev,
  hasNext,
}: {
  current: number;
  total: number;
  hasPrev: boolean;
  hasNext: boolean;
}) {
  const pages = [];
  const delta = 1;
  for (let i = Math.max(1, current - delta); i <= Math.min(total, current + delta); i++) {
    pages.push(i);
  }
  return (
    <div className="flex items-center justify-center gap-1">
      <Link
        href={`/superadmin/tenants?page=${current - 1}`}
        className={cn(
          "px-3 py-1.5 rounded-xl-custom text-sm font-medium transition-colors",
          hasPrev
            ? "text-on-surface hover:bg-surface-container-high"
            : "text-on-surface-variant cursor-not-allowed"
        )}
        {...(!hasPrev ? { "aria-disabled": true } : {})}
      >
        Sebelumnya
      </Link>
      {pages.map((p) => (
        <Link
          key={p}
          href={`/superadmin/tenants?page=${p}`}
          className={cn(
            "px-3 py-1.5 rounded-xl-custom text-sm font-medium transition-colors",
            p === current
              ? "bg-primary text-on-primary"
              : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
          )}
        >
          {p}
        </Link>
      ))}
      <Link
        href={`/superadmin/tenants?page=${current + 1}`}
        className={cn(
          "px-3 py-1.5 rounded-xl-custom text-sm font-medium transition-colors",
          hasNext
            ? "text-on-surface hover:bg-surface-container-high"
            : "text-on-surface-variant cursor-not-allowed"
        )}
        {...(!hasNext ? { "aria-disabled": true } : {})}
      >
        Berikutnya
      </Link>
    </div>
  );
}
