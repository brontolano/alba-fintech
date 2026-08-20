import { prisma } from "@/lib/db";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Building2, Users, Warehouse, TrendingUp } from "lucide-react";
import Link from "next/link";

function StatCard({ title, value, icon, bgColor }: { title: string; value: string | number; icon: React.ReactNode; bgColor: string }) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500 font-medium">{title}</p>
          <p className="mt-2 text-3xl font-bold text-slate-900 font-mono-num">{value}</p>
        </div>
        <div className={`p-3 rounded-xl ${bgColor}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

export default async function SuperadminDashboard() {
  const [tenants, users, units, txCount] = await Promise.all([
    prisma.tenant.findMany({
      where: { isActive: true },
      include: {
        _count: { select: { users: true, units: true, transactions: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.count(),
    prisma.unit.count(),
    prisma.transaction.count({ where: { status: "Approved" } }),
  ]);

  const totalBalance = await prisma.$queryRaw<
    Array<{ total: number }>
  >`SELECT SUM(balance) as total FROM Unit`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard Super Admin</h1>
        <p className="text-sm text-slate-500 mt-1">
          {format(new Date(), "EEEE, d MMMM yyyy", { locale: id })}
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Tenant" value={tenants.length} icon={<Building2 className="w-6 h-6 text-navy" />} bgColor="bg-navy/5" />
        <StatCard title="Total Pengguna" value={users} icon={<Users className="w-6 h-6 text-emerald" />} bgColor="bg-emerald/5" />
        <StatCard title="Total Unit" value={units} icon={<Warehouse className="w-6 h-6 text-amber" />} bgColor="bg-amber/5" />
        <StatCard
          title="Total Transaksi Terapprove"
          value={txCount}
          icon={<TrendingUp className="w-6 h-6 text-rose" />}
          bgColor="bg-rose/5"
        />
      </div>

      {/* Tenants Table */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Daftar Tenant</h2>
          <Link
            href="/superadmin/tenants/new"
            className="bg-navy hover:bg-navy/90 text-white px-4 py-2 rounded-lg font-medium text-sm"
          >
            + Tenant Baru
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                <th className="p-4">Nama</th>
                <th className="p-4">App Name</th>
                <th className="p-4">Unit</th>
                <th className="p-4">Pengguna</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tenants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    Belum ada tenant
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
                            {tenant.subdomain
                              ? `${tenant.subdomain}.alba.app`
                              : tenant.domain || "-"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-slate-700">{tenant.appName}</td>
                    <td className="p-4 text-slate-700">{tenant._count.units}</td>
                    <td className="p-4 text-slate-700">{tenant._count.users}</td>
                    <td className="p-4">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                        tenant.isActive
                          ? "bg-emerald/10 text-emerald"
                          : "bg-slate/10 text-slate"
                      }`}>
                        {tenant.isActive ? "Aktif" : "Non-aktif"}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <Link
                        href={`/superadmin/tenants/${tenant.id}`}
                        className="text-sm text-navy hover:underline"
                      >
                        Kelola
                      </Link>
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
