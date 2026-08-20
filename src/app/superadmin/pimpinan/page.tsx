import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { Users, UserCheck, UserPlus, Mail, Shield, Warehouse, Save, X, Building } from "lucide-react";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PimpinanPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "Superadmin") redirect("/login");

  const [tenants, pimpinanUsers] = await Promise.all([
    prisma.tenant.findMany({ where: { isActive: true }, select: { id: true, name: true, appName: true } }),
    prisma.user.findMany({
      where: { role: "Pimpinan" },
      include: {
        tenant: { select: { id: true, name: true, appName: true } },
        unit: { select: { id: true, name: true, type: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Akun Pimpinan</h1>
          <p className="text-sm text-slate-500 mt-1">Kelola akun Pimpinan per tenant</p>
        </div>
        <Link
          href="/superadmin/managers"
          className="text-navy hover:text-navy/80 text-sm font-medium"
        >
          Lihat Semua Akun →
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
                <th className="p-4">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pimpinanUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    Belum ada akun Pimpinan
                  </td>
                </tr>
              ) : (
                pimpinanUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-navy/10 rounded-full flex items-center justify-center text-navy font-medium">
                          {user.name?.charAt(0) || "U"}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{user.name}</p>
                          <p className="text-xs text-slate-500">{user.isActive ? "Aktif" : "Non-aktif"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-slate-700">{user.email}</td>
                    <td className="p-4 text-slate-700">{user.tenant?.appName || "-"}</td>
                    <td className="p-4 text-slate-700">{user.unit?.name || "-"}</td>
                    <td className="p-4">
                      <Link
                        href={`/superadmin/users/${user.id}`}
                        className="text-navy hover:underline text-sm font-medium"
                      >
                        Edit
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