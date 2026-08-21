import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getPoFormData } from "../actions";
import { PoNewClient } from "./PoNewClient";

interface PoNewPageProps {
  params: Promise<{ tenantId: string }>;
}

export const dynamic = "force-dynamic";

export default async function PoNewPage({ params }: PoNewPageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { tenantId } = await params;
  const tenantIdNum = parseInt(tenantId);

  const user = session.user;
  if (user.role !== "Superadmin" && user.tenantId !== tenantIdNum) {
    redirect("/dashboard/tenant-selector");
  }

  const unitId = user.unitId;
  if (!unitId && user.role !== "Superadmin" && user.role !== "Pimpinan") {
    redirect("/dashboard/tenant/selector");
  }

  // Pimpinan/Superadmin: redirect to unit selector first
  if ((user.role === "Pimpinan" || user.role === "Superadmin") && !unitId) {
    redirect(`/dashboard/tenant/${tenantId}/units`);
  }

  const formData = await getPoFormData(tenantIdNum, unitId!);
  if (!formData.ok) {
    redirect(`/dashboard/tenant/${tenantId}/po`);
  }

  return (
    <PoNewClient
      tenantId={tenantId}
      unitId={unitId!}
      suppliers={formData.suppliers || []}
      inventoryItems={formData.inventoryItems || []}
    />
  );
}