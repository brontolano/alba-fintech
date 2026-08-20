import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Bell, Save } from "lucide-react";

interface NotificationPrefPageProps {
  params: Promise<{ tenantId: string }>;
}

export const dynamic = "force-dynamic";

export default async function ProfilNotificationsPage({ params }: NotificationPrefPageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { tenantId } = await params;
  const tenantIdNum = parseInt(tenantId);
  const user = session.user;

  if (user.role !== "Superadmin" && user.tenantId !== tenantIdNum) {
    redirect("/dashboard/tenant-selector");
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
        <h1 className="font-h2 text-h2 text-on-surface flex-1 text-center">Preferensi Notifikasi</h1>
        <div className="w-10" />
     </div>

      <div className="bg-surface-container-lowest rounded-xl-custom p-5 shadow-sm border border-outline-variant space-y-4">
        <h3 className="font-h3 text-h3 text-on-surface">Pengaturan Notifikasi</h3>
        <p className="font-caption text-caption text-on-surface-variant">
          Pilih jenis notifikasi yang ingin Anda terima di aplikasi dan email.
        </p>

        <div className="space-y-4 pt-2">
          <label className="flex items-center justify-between p-3 bg-surface-container-low rounded-xl-custom cursor-pointer touch-target">
            <div>
              <p className="font-body text-body font-medium text-on-surface">Persetujuan Transaksi</p>
              <p className="font-caption text-caption text-on-surface-variant">Notifikasi saat ada transaksi baru yang perlu ditinjau</p>
            </div>
            <input type="checkbox" defaultChecked className="w-5 h-5 text-primary rounded accent-primary" />
          </label>

          <label className="flex items-center justify-between p-3 bg-surface-container-low rounded-xl-custom cursor-pointer touch-target">
            <div>
              <p className="font-body text-body font-medium text-on-surface">Stok Menipis</p>
              <p className="font-caption text-caption text-on-surface-variant">Peringatan saat item inventori mencapai batas minimum</p>
            </div>
            <input type="checkbox" defaultChecked className="w-5 h-5 text-primary rounded accent-primary" />
          </label>

          <label className="flex items-center justify-between p-3 bg-surface-container-low rounded-xl-custom cursor-pointer touch-target">
            <div>
              <p className="font-body text-body font-medium text-on-surface">Status Transaksi</p>
              <p className="font-caption text-caption text-on-surface-variant">Notifikasi saat transaksi disetujui atau ditolak</p>
            </div>
            <input type="checkbox" defaultChecked className="w-5 h-5 text-primary rounded accent-primary" />
          </label>

          <label className="flex items-center justify-between p-3 bg-surface-container-low rounded-xl-custom cursor-pointer touch-target">
            <div>
              <p className="font-body text-body font-medium text-on-surface">Rekonsiliasi Harian</p>
              <p className="font-caption text-caption text-on-surface-variant">Pengingat rekonsiliasi kas harian</p>
            </div>
            <input type="checkbox" defaultChecked className="w-5 h-5 text-primary rounded accent-primary" />
          </label>
        </div>

        <button
          onClick={async () => {
            "use server";
            // Mock save
          }}
          className="w-full bg-primary hover:bg-primary/90 text-on-primary py-3 rounded-xl-custom font-medium flex items-center justify-center gap-2 touch-target mt-4"
        >
          <Save className="w-5 h-5" />
          Simpan Preferensi
        </button>
      </div>
    </div>
  );
}
