import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function LaporanPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Laporan</h1>
        <p className="text-sm text-slate-500">Laporan keuangan dan ekspor data</p>
      </div>
      <div className="bg-white rounded-xl border border-slate-100 p-6 text-center text-slate-500">
        Halaman Laporan - Coming Soon
      </div>
    </div>
  );
}