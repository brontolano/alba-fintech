import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { Plus, Edit, Trash2, UserCheck, Warehouse } from "lucide-react";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ManagersPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "Superadmin") redirect("/login");

  const [managers, tenants, units] = await Promise.all([
    prisma.user.findMany({
      where: { role: "Manager" },
      include: {
        tenant: { select: { id: true, name: true, appName: true } },
        unit: { select: { id: true, name: true, type: true, retailEnabled: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.tenant.findMany({ where: { isActive: true }, select: { id: true, name: true } }),
    prisma.unit.findMany({ where: { retailEnabled: true }, select: { id: true, name: true, tenantId: true, type: true } }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Manager Unit</h1>
          <p className="text-sm text-slate-500 mt-1">Kelola akun Manager (PIC unit)</p>
        </div>
        <Link
          href="/superadmin/users/new?role=Manager"
          className="bg-navy hover:bg-navy/90 text-white px-4 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Manager Baru
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                <th className="p-4">Nama</th>
                <th className="p-4">Email</th>
                <th className="p-4">Tenant</th>
                <th className="p-4">Unit</th>
                <th className="p-4">Tipe Unit</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {managers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    Belum ada akun Manager
                  </td>
                </tr>
              ) : (
                managers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-navy/10 rounded-full flex items-center justify-center text-navy font-medium">
                          {user.name?.charAt(0) || "U"}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{user.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-slate-700">{user.email}</td>
                    <td className="p-4 text-slate-700">{user.tenant?.appName || "-"}</td>
                    <td className="p-4 text-slate-700">{user.unit?.name || "-"}</td>
                    <td className="p-4">
                      <span className={cn("inline-flex px-2 py-0.5 rounded text-xs font-medium",
                        user.unit?.type === "Retail" ? "bg-emerald/10 text-emerald" : "bg-navy/10 text-navy")}>
                        {user.unit?.type || "-"}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={cn("inline-flex px-2 py-0.5 rounded text-xs font-medium",
                        user.isActive ? "bg-emerald/10 text-emerald" : "bg-rose/10 text-rose")}>
                        {user.isActive ? "Aktif" : "Non-aktif"}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/superadmin/users/${user.id}`}
                          className="p-1 text-slate-600 hover:text-navy rounded hover:bg-slate-100 transition"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
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