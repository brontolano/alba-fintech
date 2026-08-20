import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { Plus, Search, MoreVertical, Edit, Trash2, Power } from "lucide-react";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function TenantsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "Superadmin") redirect("/login");

  const { q: search = "", status = "all" } = (await searchParams) as {
    q?: string;
    status?: string;
  };

  const tenants = await prisma.tenant.findMany({
    where: {
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { appName: { contains: search } },
            ],
          }
        : {}),
    },
    include: {
      _count: {
        select: { users: true, units: true, transactions: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tenant</h1>
          <p className="text-sm text-slate-500 mt-1">Kelola semua tenant / organisasi</p>
        </div>
        <Link
          href="/superadmin/tenants/new"
          className="bg-navy hover:bg-navy/90 text-white px-4 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Tenant Baru
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Cari tenant..."
          defaultValue={search}
          onChange={(e) => {
            const params = new URLSearchParams(window.location.search);
            params.set("q", e.target.value);
            window.history.pushState(null, "", `${window.location.pathname}?${params.toString()}`);
            window.location.reload();
          }}
          className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                <th className="p-4">Tenant</th>
                <th className="p-4">App Name</th>
                <th className="p-4">Unit</th>
                <th className="p-4">Pengguna</th>
                <th className="p-4">Transaksi</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tenants.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    Belum ada tenant. Klik "Tenant Baru" untuk membuat.
                  </td>
                </tr>
              ) : (
                tenants.map((tenant) => (
                  <tr key={tenant.id} className="hover:bg-slate-50">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-navy/10 rounded-lg flex items-center justify-center text-navy font-bold">
                          {tenant.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{tenant.name}</p>
                          <p className="text-xs text-slate-500">
                            {tenant.subdomain ? `${tenant.subdomain}.alba.app` : tenant.domain || "-"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-slate-700">{tenant.appName}</td>
                    <td className="p-4 text-slate-700">{tenant._count.units}</td>
                    <td className="p-4 text-slate-700">{tenant._count.users}</td>
                    <td className="p-4 text-slate-700">{tenant._count.transactions}</td>
                    <td className="p-4">
                      <span className={cn("inline-flex px-2 py-0.5 rounded text-xs font-medium",
                        tenant.isActive ? "bg-emerald/10 text-emerald" : "bg-slate/10 text-slate")}>
                        {tenant.isActive ? "Aktif" : "Non-aktif"}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/superadmin/tenants/${tenant.id}`}
                          className="p-1 text-slate-600 hover:text-navy rounded hover:bg-slate-100 transition"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        <button
                          className="p-1 text-slate-600 hover:text-rose rounded hover:bg-slate-100 transition"
                          title="Hapus"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}