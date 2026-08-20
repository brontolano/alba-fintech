import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { ArrowLeft, Camera, Loader2, Save } from "lucide-react";
import { z } from "zod";
import { logAction } from "@/lib/audit";

interface ProfilEditPageProps {
  params: Promise<{ tenantId: string }>;
}

const editSchema = z.object({
  name: z.string().min(3, "Nama minimal 3 karakter"),
});

export default async function ProfilEditPage({ params }: ProfilEditPageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { tenantId } = await params;
  const tenantIdNum = parseInt(tenantId);
  const user = session.user;

  if (user.role !== "Superadmin" && user.tenantId !== tenantIdNum) {
    redirect("/dashboard/tenant-selector");
  }

  const fullUser = await prisma.user.findUnique({
    where: { id: Number(user.id) },
    select: { id: true, name: true, email: true },
  });

  if (!fullUser) redirect("/login");

  async function updateProfile(formData: FormData) {
    "use server";
    const session = await auth();
    if (!session?.user) redirect("/login");

    const validated = editSchema.parse({
      name: formData.get("name"),
    });

    await prisma.user.update({
      where: { id: Number(session.user.id) },
      data: { name: validated.name },
    });

    await logAction({
      tenantId: session.user.tenantId,
      actorId: Number(session.user.id),
      action: "update",
      entity: "User",
      entityId: Number(session.user.id),
      metadata: { field: "name", newValue: validated.name },
    });

    redirect(`/dashboard/tenant/${tenantId}/profil`);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Link
          href={`/dashboard/tenant/${tenantId}/profil`}
          className="flex items-center gap-2 text-on-surface-variant hover:text-on-surface transition-colors touch-target"
        >
          <ArrowLeft className="w-5 h-5" />
       </Link>
        <h1 className="font-h2 text-h2 text-on-surface flex-1 text-center">Edit Profil</h1>
        <div className="w-10" />
     </div>

      <form action={updateProfile} className="bg-surface-container-lowest rounded-xl-custom p-5 shadow-sm border border-outline-variant space-y-5">
        <div className="text-center">
          <div className="relative w-24 h-24 mx-auto">
            <div className="w-full h-full bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-3xl">
              {fullUser.name?.charAt(0) || "U"}
            </div>
            <button type="button" className="absolute bottom-0 right-0 bg-primary text-on-primary p-2 rounded-full shadow-md touch-target">
              <Camera className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <label className="font-caption text-caption text-on-surface-variant uppercase tracking-wider">Nama Lengkap</label>
          <input
            name="name"
            defaultValue={fullUser.name || ""}
            className="w-full px-4 py-3 border border-outline-variant rounded-xl-custom focus:outline-none focus:ring-2 focus:ring-primary/20 bg-surface-container-lowest"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="font-caption text-caption text-on-surface-variant uppercase tracking-wider">Email</label>
          <input
            value={fullUser.email}
            className="w-full px-4 py-3 border border-outline-variant rounded-xl-custom bg-surface-container-high text-on-surface-variant"
            disabled
          />
        </div>

        <button
          type="submit"
          className="w-full bg-primary hover:bg-primary/90 text-on-primary py-3 rounded-xl-custom font-medium flex items-center justify-center gap-2 touch-target"
        >
          <Save className="w-5 h-5" />
          Simpan Perubahan
        </button>
      </form>
    </div>
  );
}
