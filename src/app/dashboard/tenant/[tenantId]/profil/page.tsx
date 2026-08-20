import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { ArrowLeft, User, Lock, Key, Mail, Shield, Bell, Camera, LogOut, Edit2, Eye, EyeOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProfilPageProps {
  params: Promise<{ tenantId: string }>;
}

export const dynamic = "force-dynamic";

export default async function ProfilPage({ params }: ProfilPageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { tenantId } = await params;
  const tenantIdNum = parseInt(tenantId);

  const user = session.user;

  if (user.role !== "Superadmin" && user.tenantId !== tenantIdNum) {
    redirect("/dashboard/tenant-selector");
  }

  // Fetch full user data
  const fullUser = await prisma.user.findUnique({
    where: { id: Number(user.id) },
    include: {
      tenant: { select: { id: true, name: true, appName: true } },
      unit: { select: { id: true, name: true, type: true } },
    },
  });

  if (!fullUser) redirect("/login");

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          href={`/dashboard/tenant/${tenantId}/beranda`}
          className="flex items-center gap-2 text-on-surface-variant hover:text-on-surface transition-colors touch-target"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="font-h2 text-h2 text-on-surface flex-1 text-center">Profil</h1>
        <div className="w-10" />
      </div>

      {/* Profile Header */}
      <div className="bg-surface-container-lowest rounded-xl-custom p-5 shadow-sm border border-outline-variant text-center space-y-4">
        <div className="relative w-24 h-24 mx-auto">
          <div className="w-full h-full bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-3xl">
            {fullUser.name?.charAt(0) || "U"}
          </div>
          <button className="absolute bottom-0 right-0 bg-primary text-on-primary p-2 rounded-full shadow-md touch-target">
            <Camera className="w-4 h-4" />
          </button>
        </div>
        <div>
          <h2 className="font-h2 text-h2 text-on-surface">{fullUser.name}</h2>
          <p className="font-body text-body text-on-surface-variant mt-1">{fullUser.email}</p>
          <div className="flex items-center justify-center gap-2 mt-2">
            <span className={cn("inline-flex items-center gap-1 px-2 py-1 rounded-xl-custom font-caption text-caption",
              fullUser.role === "Pimpinan" ? "bg-primary/10 text-primary" :
              fullUser.role === "Manager" ? "bg-income/10 text-income" :
              fullUser.role === "Staff" ? "bg-income/10 text-income" :
              "bg-primary/10 text-primary")}>
              <Shield className="w-3 h-3" />
              {fullUser.role === "Manager" ? "Manager" : fullUser.role === "Staff" ? "Staff" : fullUser.role}
            </span>
            <span className={cn("inline-flex px-2 py-1 rounded-xl-custom font-caption text-capitalize",
              fullUser.isActive ? "bg-income/10 text-income" : "bg-surface-container-high text-on-surface-variant")}>
              {fullUser.isActive ? "Aktif" : "Non-aktif"}
            </span>
          </div>
        </div>
        <div className="pt-2 border-t border-outline-variant flex items-center justify-center gap-4 text-sm">
          <span className="font-caption text-caption text-on-surface-variant flex items-center gap-1">
            <Building2 className="w-3 h-3" />
            {fullUser.tenant?.appName || fullUser.tenant?.name}
          </span>
          {fullUser.unit && (
            <span className="font-caption text-caption text-on-surface-variant flex items-center gap-1">
              <Building2 className="w-3 h-3" />
              {fullUser.unit.name} ({fullUser.unit.type})
            </span>
          )}
        </div>
      </div>

      {/* Menu Items */}
      <div className="bg-surface-container-lowest rounded-xl-custom shadow-sm border border-outline-variant overflow-hidden">
        <Link
          href={`/dashboard/tenant/${tenantId}/profil/edit`}
          className="flex items-center gap-3 px-5 py-4 hover:bg-surface-container-low transition-colors"
        >
          <div className="p-2 bg-primary/10 rounded-xl-custom">
            <Edit2 className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-body text-body text-on-surface">Edit Profil</p>
            <p className="font-caption text-caption text-on-surface-variant">Ubah nama, foto, dan informasi akun</p>
          </div>
          <svg className="w-5 h-5 text-on-surface-variant" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>

        <div className="border-t border-outline-variant" />
        
        <Link
          href={`/dashboard/tenant/${tenantId}/profil/password`}
          className="flex items-center gap-3 px-5 py-4 hover:bg-surface-container-low transition-colors"
        >
          <div className="p-2 bg-warning/10 rounded-xl-custom">
            <Key className="w-5 h-5 text-warning" />
          </div>
          <div className="flex-1">
            <p className="font-body text-body text-on-surface">Ubah Kata Sandi</p>
            <p className="font-caption text-caption text-on-surface-variant">Perbarui kata sandi untuk keamanan</p>
          </div>
          <svg className="w-5 h-5 text-on-surface-variant" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>

        <div className="border-t border-outline-variant" />
        
        <Link
          href={`/dashboard/tenant/${tenantId}/profil/notifications`}
          className="flex items-center gap-3 px-5 py-4 hover:bg-surface-container-low transition-colors"
        >
          <div className="p-2 bg-income/10 rounded-xl-custom">
            <Bell className="w-5 h-5 text-income" />
          </div>
          <div className="flex-1">
            <p className="font-body text-body text-on-surface">Preferensi Notifikasi</p>
            <p className="font-caption text-caption text-on-surface-variant">Kelola notifikasi email & push</p>
          </div>
          <svg className="w-5 h-5 text-on-surface-variant" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>

        <div className="border-t border-outline-variant" />
        
        <form action={async () => { "use server"; await (await import("@/lib/auth")).signOut({ callbackUrl: "/login" }); }}>
          <button type="submit" className="w-full flex items-center gap-3 px-5 py-4 text-error hover:bg-error-container transition-colors">
            <div className="p-2 bg-error/10 rounded-xl-custom">
              <LogOut className="w-5 h-5 text-error" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-body text-body text-error">Keluar</p>
              <p className="font-caption text-caption text-on-surface-variant">Keluar dari akun Anda</p>
            </div>
          </button>
        </form>
      </div>

      {/* Account Info */}
      <div className="bg-surface-container-lowest rounded-xl-custom p-5 shadow-sm border border-outline-variant">
        <h3 className="font-h3 text-h3 text-on-surface mb-4">Informasi Akun</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="font-caption text-caption text-on-surface-variant">ID Pengguna</span>
            <span className="font-mono-num font-medium text-on-surface">#{fullUser.id}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-caption text-caption text-on-surface-variant">Dibuat pada</span>
            <span className="font-body text-body text-on-surface">{new Date(fullUser.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-caption text-caption text-on-surface-variant">Terakhir login</span>
            <span className="font-body text-body text-on-surface">Hari ini</span>
          </div>
        </div>
      </div>
    </div>
  );
}