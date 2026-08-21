import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SuperadminShell } from "@/components/superadmin/SuperadminShell";

export default async function SuperadminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "Superadmin") redirect("/login");

  return (
    <SuperadminShell
      user={{
        id: session.user.id,
        name: session.user.name ?? null,
        email: session.user.email,
        image: session.user.image ?? null,
      }}
    >
      {children}
   </SuperadminShell>
  );
}
