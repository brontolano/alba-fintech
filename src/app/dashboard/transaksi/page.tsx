import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function TransaksiPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Transaksi</h1>
          <p className="text-sm text-slate-500">Kelola transaksi keuangan</p>
        </div>
        <button className="bg-emerald hover:bg-emerald/90 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2">
          + Tambah Transaksi
        </button>
      </div>
      <div className="bg-white rounded-xl border border-slate-100 p-6 text-center text-slate-500">
        Halaman Transaksi - Coming Soon
      </div>
    </div>
  );
}