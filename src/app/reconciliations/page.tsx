import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { redirect } from "next/navigation"
import { ArrowLeft, RefreshCcw, AlertTriangle, CheckCircle2 } from "lucide-react"
import Link from "next/link"

export default async function ReconciliationsPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  const { user } = session

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <Link href="/dashboard" className="p-2 -ml-2 hover:bg-slate-50 rounded-full">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <h1 className="text-lg font-bold text-slate-900">Rekonsiliasi Harian</h1>
      </div>

      <div className="p-4 space-y-6">
        {/* Status Card */}
        <div className="bg-[#1E3A5F] text-white p-5 rounded-2xl shadow-md">
          <div className="flex items-center gap-2 mb-4">
            <RefreshCcw className="w-5 h-5 text-blue-300" />
            <h2 className="font-medium">Status Hari Ini</h2>
          </div>
          <div className="flex justify-between items-end">
            <div>
              <p className="text-sm text-blue-200 mb-1">Saldo Digital (Sistem)</p>
              <p className="text-2xl font-bold font-mono">Rp 12.500.000</p>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center gap-1 bg-amber-500/20 text-amber-300 px-2.5 py-1 rounded-lg text-xs font-medium">
                <AlertTriangle className="w-3 h-3" />
                Belum Stor
              </span>
            </div>
          </div>
        </div>

        {/* Form Rekonsiliasi */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="font-bold text-slate-900 mb-4">Form Setoran Fisik</h3>
          
          <form className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">Uang Fisik (Rp)</label>
              <input
                type="number"
                className="w-full px-0 py-2 text-2xl font-bold font-mono bg-transparent border-b-2 border-slate-200 focus:border-[#1E3A5F] outline-none transition-colors"
                placeholder="0"
                required
              />
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-500">Saldo Sistem</span>
                <span className="font-mono font-medium">Rp 12.500.000</span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-500">Uang Fisik</span>
                <span className="font-mono font-medium">Rp 0</span>
              </div>
              <div className="w-full h-px bg-slate-200 my-2"></div>
              <div className="flex justify-between text-sm font-bold">
                <span className="text-slate-700">Selisih</span>
                <span className="font-mono text-rose-600">- Rp 12.500.000</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Catatan Selisih (Opsional)</label>
              <textarea
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent outline-none resize-none"
                placeholder="Jelaskan jika ada selisih..."
                rows={2}
              />
            </div>

            <button 
              type="button" 
              className="w-full bg-[#1E3A5F] hover:bg-[#152a45] text-white py-4 rounded-xl text-sm font-medium mt-2"
            >
              Ajukan Rekonsiliasi
            </button>
          </form>
        </div>

        {/* Riwayat */}
        <div>
          <h3 className="font-bold text-slate-900 mb-3">Riwayat Terakhir</h3>
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-sm">8 Agustus 2026</p>
                    <p className="text-xs text-slate-500">Valid (Selisih Rp 0)</p>
                  </div>
                </div>
                <p className="font-mono font-bold text-sm">Rp 11.200.000</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
