import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user;

  // Superadmin goes to tenant selector
  if (user.role === "Superadmin" || !user.tenantId) {
    redirect("/dashboard/tenant-selector");
  }

  // Other roles go directly to their tenant dashboard
  redirect(`/dashboard/tenant/${user.tenantId}/beranda`);
}