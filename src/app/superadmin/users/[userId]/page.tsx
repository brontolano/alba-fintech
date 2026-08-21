import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { Suspense } from "react";
import EditUserForm from "./EditUserForm";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ userId: string }>;
}

export default async function EditUserPage({ params }: Props) {
  const session = await auth();
  if (!session?.user || session.user.role !== "Superadmin") redirect("/login");

  const { userId } = await params;
  const targetUser = await prisma.user.findUnique({
    where: { id: Number(userId) },
    include: {
      tenant: { select: { id: true, name: true, appName: true } },
      unit: { select: { id: true, name: true } },
    },
  });

  if (!targetUser) redirect("/superadmin");

  const [tenants, units] = await Promise.all([
    prisma.tenant.findMany({
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

  const role = targetUser.role as "Pimpinan" | "Manager" | "Staff";

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-on-surface">
            Edit User
         </h1>
          <p className="font-caption text-caption text-on-surface-variant mt-1">
            {targetUser.name} · {role} ·{" "}
            {targetUser.tenant?.appName || targetUser.tenant?.name || "—"}
         </p>
       </div>
     </div>

      <Suspense fallback={<div className="h-12" />}>
        <EditUserForm
          user={{
            id: targetUser.id,
            name: targetUser.name,
            email: targetUser.email,
            role: role,
            tenantId: targetUser.tenantId ?? 0,
            unitId: targetUser.unitId,
            isActive: targetUser.isActive,
          }}
          tenants={tenants}
          unitsByTenant={unitsByTenant}
        />
     </Suspense>
   </div>
  );
}
