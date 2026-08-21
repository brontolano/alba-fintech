import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { cn } from "@/lib/utils";
import { SUPERADMIN_MODULES, isValidHexColor } from "@/lib/superadmin";
import TenantForm from "../TenantForm";
import { Trash2, Save, AlertCircle } from "lucide-react";
import { logAction } from "@/lib/audit";

interface Props {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

async function loadTenant(id: string | null) {
  if (!id) return null;
  return prisma.tenant.findUnique({
    where: { id: parseInt(id) },
  });
}

async function handleToggleActive(tenantId: number) {
  "use server";
  const session = await auth();
  if (!session?.user || session.user.role !== "Superadmin") redirect("/login");

  const t = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { isActive: true, name: true },
  });
  if (!t) return;

  await prisma.tenant.update({
    where: { id: tenantId },
    data: { isActive: !t.isActive },
  });

  await logAction({
    actorId: Number(session.user.id),
    action: t.isActive ? "deactivate" : "activate",
    entity: "tenant",
    entityId: tenantId,
    metadata: { name: t.name },
  });
  redirect("/superadmin/tenants");
}

async function handleDelete(tenantId: number) {
  "use server";
  const session = await auth();
  if (!session?.user || session.user.role !== "Superadmin") redirect("/login");

  const usedByUsers = await prisma.user.count({ where: { tenantId } });
  const usedByTx = await prisma.transaction.count({ where: { tenantId } });

  if (usedByUsers > 0 || usedByTx > 0) {
    return;
  }

  const t = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { name: true },
  });

  await prisma.tenant.delete({ where: { id: tenantId } });

  await logAction({
    actorId: Number(session.user.id),
    action: "delete",
    entity: "tenant",
    entityId: tenantId,
    metadata: { name: t?.name ?? "" },
  });
  redirect("/superadmin/tenants");
}

export default async function TenantEditPage({ params }: Props) {
  const session = await auth();
  if (!session?.user || session.user.role !== "Superadmin") redirect("/login");

  const { id } = await params;
  const isNew = id === "new";
  const tenant = await loadTenant(isNew ? null : id);

  if (!isNew && !tenant) redirect("/superadmin/tenants");

  return (
    <div className="max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-on-surface">
            {isNew ? "Tenant Baru" : `Edit ${tenant?.name}`}
          </h1>
          <p className="font-caption text-caption text-on-surface-variant mt-1">
            {isNew
              ? "Daftarkan tenant / pesantren baru ke sistem"
              : "Perbarui informasi tenant dan konfigurasi"}
          </p>
        </div>
      </div>

      {/* Form */}
      <TenantForm
        mode={isNew ? "create" : "edit"}
        tenant={
          tenant
            ? {
                id: tenant.id,
                name: tenant.name,
                appName: tenant.appName,
                primaryColor: tenant.primaryColor,
                secondaryColor: tenant.secondaryColor,
                subdomain: tenant.subdomain,
                domain: tenant.domain,
                activeModules: tenant.activeModules,
                isActive: tenant.isActive,
              }
            : null
        }
      />

      {/* Delete confirmation — hanya di mode edit */}
      {!isNew && tenant && (
        <div className="mt-8 border-t border-outline-variant pt-6">
          <div className="bg-error-container/5 border border-error/20 rounded-xl-custom p-5">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-h3 text-h3 text-on-surface mb-1">Hapus Tenant</h3>
                <p className="font-body text-body text-on-surface-variant">
                  Tenant "{tenant.name}" akan dihapus permanen. Tindakan ini
                  tidak dapat dibatalkan. Pastikan tenant tidak memiliki
                  transaksi atau pengguna terkait.
                </p>
              </div>
            </div>
            <form
              action={handleDelete}
              onSubmit={(e) => {
                if (
                  !confirm(
                    `Hapus tenant "${tenant.name}"? Semua data terkait akan hilang.`
                  )
                ) {
                  e.preventDefault();
                }
              }}
              className="mt-4 flex justify-end gap-2"
            >
              <input type="hidden" name="tenantId" value={tenant.id} />
              <button
                type="submit"
                className="inline-flex items-center gap-2 bg-error text-on-error px-4 py-2 rounded-xl-custom font-medium text-sm hover:bg-error/90"
              >
                <Trash2 className="w-4 h-4" />
                Hapus Tenant
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
