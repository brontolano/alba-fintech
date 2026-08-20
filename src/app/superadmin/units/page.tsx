import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { Plus, Search, Edit, Trash2, Tag, Warehouse } from "lucide-react";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function UnitsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "Superadmin") redirect("/login");

  const [tenants, units] = await Promise.all([
    prisma.tenant.findMany({ where: { isActive: true }, select: { id: true, name: true, appName: true } }),
    prisma.unit.findMany({
      include: {
        tenant: { select: { id: true, name: true, appName: true } },
        _count: { select: { users: true, transactions: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Unit</h1>
          <p className="text-sm text-slate-500 mt-1">Kelola unit (Kantor, Kantin, Koperasi) per tenant</p>
        </div>
        <Link
          href="/superadmin/units/new"
          className="bg-navy hover:bg-navy/90 text-white px-4 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Unit Baru
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                <th className="p-4">Nama Unit</th>
                <th className="p-4">Tenant</th>
                <th className="p-4">Tipe</th>
                <th className="p-4">Retail</th>
                <th className="p-4">Saldo</th>
                <th className="p-4">Pengguna</th>
                <th className="p-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {units.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    Belum ada unit.
                  </td>
                </tr>
              ) : (
                units.map((unit) => (
                  <tr key={unit.id} className="hover:bg-slate-50">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold",
                          unit.type === "Retail" ? "bg-emerald" : "bg-navy")}>
                          {unit.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{unit.name}</p>
                          <p className="text-xs text-slate-500">{unit.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-slate-700">{unit.tenant.appName || unit.tenant.name}</td>
                    <td className="p-4">
                      <span className={cn("inline-flex px-2 py-0.5 rounded text-xs font-medium",
                        unit.type === "Retail" ? "bg-emerald/10 text-emerald" : "bg-navy/10 text-navy")}>
                        {unit.type}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={cn("inline-flex px-2 py-0.5 rounded text-xs font-medium",
                        unit.retailEnabled ? "bg-emerald/10 text-emerald" : "bg-slate/10 text-slate")}>
                        {unit.retailEnabled ? "Aktif" : "Non-aktif"}
                      </span>
                    </td>
                    <td className="p-4 font-mono-num text-slate-900">
                      {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(Number(unit.balance))}
                    </td>
                    <td className="p-4 text-slate-700">{unit._count.users}</td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/superadmin/units/${unit.id}`}
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