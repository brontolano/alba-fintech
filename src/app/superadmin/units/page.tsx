import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { Plus, Search, Edit, Trash2, Warehouse } from "lucide-react";
import { Suspense } from "react";
import { cn } from "@/lib/utils";
import { formatCurrencyIDR } from "@/lib/superadmin";
import { UnitsToolbar } from "./units-toolbar";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function UnitsPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user || session.user.role !== "Superadmin") redirect("/login");

  const params = await searchParams;
  const q = (Array.isArray(params.q) ? params.q[0] : params.q) || "";
  const type = (Array.isArray(params.type) ? params.type[0] : params.type) || "all";

  const where = {
    ...(q
      ? {
          OR: [
            { name: { contains: q } },
            { description: { contains: q } },
            { tenant: { name: { contains: q } } },
            { tenant: { appName: { contains: q } } },
          ],
        }
      : {}),
    ...(type === "Sederhana" ? { type: "Sederhana" } : type === "Retail" ? { type: "Retail" } : {}),
  };

  const [units, tenants] = await Promise.all([
    prisma.unit.findMany({
      where,
      include: {
        tenant: { select: { id: true, name: true, appName: true, primaryColor: true } },
        _count: { select: { users: true, transactions: true, inventoryItems: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.tenant.findMany({
      where: { isActive: true },
      select: { id: true, name: true, appName: true },
    }),
  ]);

  return (
    <div className="space-y-6 max-w-screen-2xl">
      <Suspense fallback={<div className="h-12" />}>
        <UnitsToolbar />
      </Suspense>

      <div className="bg-surface-container-lowest rounded-xl-custom border border-outline-variant overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="bg-surface-container-low text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">
                <th className="px-5 py-3">Unit</th>
                <th className="px-5 py-3">Tenant</th>
                <th className="px-5 py-3">Tipe</th>
                <th className="px-5 py-3">Retail</th>
                <th className="px-5 py-3 text-right">Saldo</th>
                <th className="px-5 py-3 text-right">User</th>
                <th className="px-5 py-3 text-right">Transaksi</th>
                <th className="px-5 py-3 text-right">Inventori</th>
                <th className="px-5 py-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {units.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-5 py-12 text-center text-on-surface-variant">
                    <div className="flex flex-col items-center gap-3">
                      <Warehouse className="w-8 h-8 text-on-surface-variant/40" />
                      <p>Belum ada unit ditemukan</p>
                      {q && (
                        <Link href="/superadmin/units" className="text-sm text-primary hover:underline">
                          Hapus filter
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              )}
              {units.map((unit) => (
                <tr key={unit.id} className="hover:bg-surface-container-low/50">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "w-9 h-9 rounded-xl-custom flex items-center justify-center text-on-primary font-bold text-sm",
                          unit.type === "Retail" ? "bg-secondary" : "bg-primary"
                        )}
                      >
                        {unit.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-on-surface">{unit.name}</p>
                        {unit.description && (
                          <p className="text-xs text-on-surface-variant truncate max-w-[200px]">
                            {unit.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded-lg flex items-center justify-center text-on-primary text-xs font-bold"
                        style={{ backgroundColor: unit.tenant.primaryColor }}
                      >
                        {unit.tenant.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-on-surface text-sm">
                        {unit.tenant.appName || unit.tenant.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={cn(
                        "inline-flex px-2 py-0.5 rounded-xl-custom font-caption text-capitalize",
                        unit.type === "Retail"
                          ? "bg-secondary-container text-on-secondary-container"
                          : "bg-primary-container text-on-primary-container"
                      )}
                    >
                      {unit.type}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={cn(
                        "inline-flex px-2 py-0.5 rounded-xl-custom font-caption text-capitalize",
                        unit.retailEnabled
                          ? "bg-income/10 text-income"
                          : "bg-surface-container-high text-on-surface-variant"
                      )}
                    >
                      {unit.retailEnabled ? "Aktif" : "—"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono-num text-on-surface">
                    {formatCurrencyIDR(unit.balance)}
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono-num text-on-surface">
                    {unit._count.users}
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono-num text-on-surface">
                    {unit._count.transactions}
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono-num text-on-surface">
                    {unit._count.inventoryItems}
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Link
                        href={`/superadmin/units/${unit.id}`}
                        className="p-1.5 text-on-surface-variant hover:text-primary rounded-xl-custom hover:bg-surface-container-high transition"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating add button */}
      <div className="flex justify-end">
        <Link
          href="/superadmin/units/new"
          className="inline-flex items-center gap-2 bg-primary text-on-primary px-4 py-2.5 rounded-xl-custom font-medium text-sm hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Unit Baru
        </Link>
      </div>
    </div>
  );
}
