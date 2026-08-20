import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import PosNewClient from "./PosNewClient";

interface PosNewPageProps {
  params: Promise<{ tenantId: string }>;
}

export const dynamic = "force-dynamic";

export default async function PosNewPage({ params }: PosNewPageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { tenantId } = await params;
  const tenantIdNum = parseInt(tenantId);

  const user = session.user;

  if (user.role !== "Superadmin" && user.tenantId !== tenantIdNum) {
    redirect("/dashboard/tenant-selector");
  }

  // Fetch products for initial load
  const products = await prisma.inventoryItem.findMany({
    where: { tenantId: tenantIdNum, stock: { gt: 0 } },
    select: {
      id: true,
      name: true,
      sellPrice: true,
      unitOfMeasure: true,
      stock: true,
      imageUrl: true,
    },
    orderBy: { name: "asc" },
  });

  return <PosNewClient tenantId={tenantId} initialProducts={products} />;
}