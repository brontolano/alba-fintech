import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { Suspense } from "react";
import UserForm from "./UserForm";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ role?: string | string[] }>;
}

export default async function UsersNewPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user || session.user.role !== "Superadmin") redirect("/login");

  const params = await searchParams;
  const roleParam = Array.isArray(params.role) ? params.role[0] : params.role;
  const defaultRole = (["Manager", "Staff", "Pimpinan"].includes(roleParam || "")
    ? roleParam
    : "Manager") as "Manager" | "Staff" | "Pimpinan";

  const [tenants, units] = await Promise.all([
    prisma.tenant.findMany({
      where: { isActive: true },
      select: { id: true, name: true, appName: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.unit.findMany({
      select: { id: true, name: true, tenantId: true },
      orderBy: { tenantId: "asc" },
    }),
  ]);

  const unitsByTenant = units.reduce<Record<number, { id: number; name: string }[]>>(
    (acc, u) => {
      if (!acc[u.tenantId]) acc[u.tenantId] = [];
      acc[u.tenantId].push({ id: u.id, name: u.name });
      return acc;
    },
    {}
  );

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-on-surface">
            Tambah {defaultRole === "Pimpinan" ? "Pimpinan" : `${defaultRole} Baru`}
          </h1>
          <p className="font-caption text-caption text-on-surface-variant mt-1">
            Buat akun user baru dengan role {defaultRole}
          </p>
        </div>
      </div>

      <Suspense fallback={<div className="h-12" />}>
        <UserForm
          defaultRole={defaultRole}
          tenants={tenants}
          unitsByTenant={unitsByTenant}
        />
      </Suspense>
    </div>
  );
}