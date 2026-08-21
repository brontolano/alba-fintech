import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import UnitForm from "../UnitForm";

interface Props {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export default async function UnitEditPage({ params }: Props) {
  const session = await auth();
  if (!session?.user || session.user.role !== "Superadmin") redirect("/login");

  const { id } = await params;
  const isNew = id === "new";

  if (isNew) {
    const tenants = await prisma.tenant.findMany({
      where: { isActive: true },
      select: { id: true, name: true, appName: true },
      orderBy: { createdAt: "desc" },
    });
    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl font-bold text-on-surface">Unit Baru</h1>
            <p className="font-caption text-caption text-on-surface-variant mt-1">
              Buat unit baru di bawah tenant tertentu
            </p>
          </div>
        </div>
        <UnitForm mode="create" unit={null} tenants={tenants} />
      </div>
    );
  }

  const unit = await prisma.unit.findUnique({
    where: { id: Number(id) },
    include: { tenant: { select: { id: true, name: true, appName: true } } },
  });

  if (!unit) redirect("/superadmin/units");

  const tenants = await prisma.tenant.findMany({
    where: { isActive: true },
    select: { id: true, name: true, appName: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-on-surface">
            Edit {unit.name}
          </h1>
          <p className="font-caption text-caption text-on-surface-variant mt-1">
            Tenant: {unit.tenant.appName || unit.tenant.name}
          </p>
        </div>
      </div>
      <UnitForm
        mode="edit"
        unit={{
          id: unit.id,
          name: unit.name,
          type: unit.type as "Sederhana" | "Retail",
          retailEnabled: unit.retailEnabled,
          description: unit.description,
          tenantId: unit.tenantId,
        }}
        tenants={tenants}
      />
    </div>
  );
}
