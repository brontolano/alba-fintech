import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { Plus, UserCheck } from "lucide-react";
import { formatDateID } from "@/lib/superadmin";
import { cn } from "@/lib/utils";
import { Suspense } from "react";
import { SuperadminUserToolbar } from "@/components/superadmin/UserToolbar";
import { toggleUserActiveAction } from "../users/actions";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ManagersPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user || session.user.role !== "Superadmin") redirect("/login");

  const params = await searchParams;
  const q = (Array.isArray(params.q) ? params.q[0] : params.q) || "";
  const status = (Array.isArray(params.status) ? params.status[0] : params.status) || "all";

  const managers = await prisma.user.findMany({
    where: {
      role: "Manager",
      ...(q
        ? {
            OR: [
              { name: { contains: q } },
              { email: { contains: q } },
              { tenant: { name: { contains: q } } },
              { tenant: { appName: { contains: q } } },
              { unit: { name: { contains: q } } },
            ],
          }
        : {}),
      ...(status === "active" ? { isActive: true } : status === "inactive" ? { isActive: false } : {}),
    },
    include: {
      tenant: { select: { id: true, name: true, appName: true, primaryColor: true } },
      unit: { select: { id: true, name: true } },
    },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });

  return (
    <div className="space-y-6 max-w-screen-2xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Suspense fallback={<div className="h-12 flex-1" />}>
          <SuperadminUserToolbar roleFilter="Manager" />
        </Suspense>
        <Link
          href="/superadmin/users/new?role=Manager"
          className="inline-flex items-center gap-2 bg-primary text-on-primary px-4 py-2.5 rounded-xl-custom font-medium text-sm hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Manager Baru
        </Link>
      </div>

      <div className="bg-surface-container-lowest rounded-xl-custom border border-outline-variant overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px]">
            <thead>
              <tr className="bg-surface-container-low text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">
                <th className="px-5 py-3">Nama</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Tenant</th>
                <th className="px-5 py-3">Unit</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Dibuat</th>
                <th className="px-5 py-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {managers.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-on-surface-variant">
                    <div className="flex flex-col items-center gap-3">
                      <UserCheck className="w-8 h-8 text-on-surface-variant/40" />
                      <p>Belum ada manager</p>
                    </div>
                  </td>
                </tr>
              )}
              {managers.map((m) => (
                <tr key={m.id} className="hover:bg-surface-container-low/50">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-sm">
                        {m.name.charAt(0).toUpperCase()}
                      </div>
                      <p className="font-medium text-on-surface">{m.name}</p>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-on-surface-variant text-sm">{m.email}</td>
                  <td className="px-5 py-3.5">
                    {m.tenant ? (
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded-lg flex items-center justify-center text-on-primary text-xs font-bold"
                          style={{ backgroundColor: m.tenant.primaryColor }}
                        >
                          {m.tenant.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-on-surface text-sm">
                          {m.tenant.appName || m.tenant.name}
                        </span>
                      </div>
                    ) : (
                      <span className="text-on-surface-variant">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-on-surface text-sm">{m.unit?.name || "—"}</td>
                  <td className="px-5 py-3.5">
                    <form action={toggleUserActiveAction} className="inline">
                      <input type="hidden" name="userId" value={m.id} />
                      <button
                        type="submit"
                        className={cn(
                          "inline-flex px-2 py-0.5 rounded-xl-custom font-caption text-capitalize transition-colors",
                          m.isActive ? "bg-income/10 text-income" : "bg-surface-container-high text-on-surface-variant"
                        )}
                      >
                        {m.isActive ? "Aktif" : "Non-aktif"}
                      </button>
                    </form>
                  </td>
                  <td className="px-5 py-3.5 text-on-surface-variant text-sm">{formatDateID(m.createdAt)}</td>
                  <td className="px-5 py-3.5 text-center">
                    <Link
                      href={`/superadmin/users/${m.id}`}
                      className="inline-flex items-center gap-1 text-primary hover:text-primary/80 text-sm font-medium"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
