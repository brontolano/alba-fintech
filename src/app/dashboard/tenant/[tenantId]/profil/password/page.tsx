import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { ArrowLeft, Key, Save } from "lucide-react";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { logAction } from "@/lib/audit";

interface PasswordPageProps {
  params: Promise<{ tenantId: string }>;
}

const passwordSchema = z.object({
  oldPassword: z.string().min(1, "Kata sandi lama wajib diisi"),
  newPassword: z.string().min(6, "Kata sandi baru minimal 6 karakter"),
  confirmPassword: z.string().min(1, "Konfirmasi kata sandi wajib diisi"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Konfirmasi kata sandi tidak cocok",
  path: ["confirmPassword"],
});

export default async function ProfilPasswordPage({ params }: PasswordPageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { tenantId } = await params;
  const tenantIdNum = parseInt(tenantId);
  const user = session.user;

  if (user.role !== "Superadmin" && user.tenantId !== tenantIdNum) {
    redirect("/dashboard/tenant-selector");
  }

  async function updatePassword(formData: FormData) {
    "use server";
    const session = await auth();
    if (!session?.user) redirect("/login");

    const validated = passwordSchema.parse({
      oldPassword: formData.get("oldPassword"),
      newPassword: formData.get("newPassword"),
      confirmPassword: formData.get("confirmPassword"),
    });

    const dbUser = await prisma.user.findUnique({
      where: { id: Number(session.user.id) },
    });

    if (!dbUser) redirect("/login");

    const valid = await bcrypt.compare(validated.oldPassword, dbUser.passwordHash);
    if (!valid) {
      throw new Error("Kata sandi lama salah");
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(validated.newPassword, salt);

    await prisma.user.update({
      where: { id: Number(session.user.id) },
      data: { passwordHash },
    });

    await logAction({
      tenantId: session.user.tenantId,
      actorId: Number(session.user.id),
      action: "update",
      entity: "User",
      entityId: Number(session.user.id),
      metadata: { field: "password" },
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
        <h1 className="font-h2 text-h2 text-on-surface flex-1 text-center">Ubah Kata Sandi</h1>
        <div className="w-10" />
     </div>

      <form action={updatePassword} className="bg-surface-container-lowest rounded-xl-custom p-5 shadow-sm border border-outline-variant space-y-5">
        <div className="space-y-2">
          <label className="font-caption text-caption text-on-surface-variant uppercase tracking-wider">Kata Sandi Lama</label>
          <input
            type="password"
            name="oldPassword"
            className="w-full px-4 py-3 border border-outline-variant rounded-xl-custom focus:outline-none focus:ring-2 focus:ring-primary/20 bg-surface-container-lowest"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="font-caption text-caption text-on-surface-variant uppercase tracking-wider">Kata Sandi Baru</label>
          <input
            type="password"
            name="newPassword"
            className="w-full px-4 py-3 border border-outline-variant rounded-xl-custom focus:outline-none focus:ring-2 focus:ring-primary/20 bg-surface-container-lowest"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="font-caption text-caption text-on-surface-variant uppercase tracking-wider">Konfirmasi Kata Sandi Baru</label>
          <input
            type="password"
            name="confirmPassword"
            className="w-full px-4 py-3 border border-outline-variant rounded-xl-custom focus:outline-none focus:ring-2 focus:ring-primary/20 bg-surface-container-lowest"
            required
          />
        </div>

        <button
          type="submit"
          className="w-full bg-primary hover:bg-primary/90 text-on-primary py-3 rounded-xl-custom font-medium flex items-center justify-center gap-2 touch-target"
        >
          <Key className="w-5 h-5" />
          Perbarui Kata Sandi
        </button>
      </form>
    </div>
  );
}
