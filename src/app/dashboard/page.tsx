import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { redirect } from "next/navigation"
import { LogOut, Wallet, TrendingUp, TrendingDown, AlertCircle } from "lucide-react"
import Link from "next/link"

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  const { user } = session

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <div className="bg-[#1E3A5F] text-white p-6 rounded-b-[2rem] shadow-md">
        <div className="flex justify-between items-center mb-6">
          <div>
            <p className="text-sm text-slate-300">Selamat datang,</p>
            <h1 className="text-xl font-bold">{user.name}</h1>
            <p className="text-xs bg-white/20 inline-block px-2 py-1 rounded-full mt-1">
              {user.role} {user.unit !== 'All' ? `- ${user.unit}` : ''}
            </p>
          </div>
          <Link href="/api/auth/signout" className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition">
            <LogOut className="w-5 h-5" />
          </Link>
        </div>

        {/* Balance Card */}
        <div className="bg-white text-slate-900 p-5 rounded-2xl shadow-lg">
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            <Wallet className="w-4 h-4" />
            <span className="text-sm font-medium">Total Saldo {user.unit !== 'All' ? user.unit : 'Gabungan'}</span>
          </div>
          <h2 className="text-3xl font-bold font-mono tracking-tight">Rp 125.500.000</h2>
          
          <div className="flex gap-4 mt-4 pt-4 border-t border-slate-100">
            <div className="flex-1">
              <div className="flex items-center gap-1 text-emerald-600 mb-1">
                <TrendingUp className="w-3 h-3" />
                <span className="text-xs font-medium">Pemasukan</span>
              </div>
              <p className="text-sm font-bold font-mono">Rp 15.200.000</p>
            </div>
            <div className="w-px bg-slate-100"></div>
            <div className="flex-1">
              <div className="flex items-center gap-1 text-rose-600 mb-1">
                <TrendingDown className="w-3 h-3" />
                <span className="text-xs font-medium">Pengeluaran</span>
              </div>
              <p className="text-sm font-bold font-mono">Rp 4.300.000</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="p-6">
        <h3 className="text-sm font-bold text-slate-800 mb-4">Aksi Cepat</h3>
        <div className="grid grid-cols-2 gap-4">
          <Link href="/transactions/new" className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center gap-2 hover:border-emerald-200 transition">
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium text-slate-700">Catat Pemasukan</span>
          </Link>
          <Link href="/transactions/new?type=kredit" className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center gap-2 hover:border-rose-200 transition">
            <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center">
              <TrendingDown className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium text-slate-700">Catat Pengeluaran</span>
          </Link>
        </div>

        {/* Pending Approvals (For Manager/Pimpinan) */}
        {(user.role === 'Manager' || user.role === 'Pimpinan') && (
          <div className="mt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-slate-800">Menunggu Persetujuan</h3>
              <Link href="/approvals" className="text-xs text-[#1E3A5F] font-medium">Lihat Semua</Link>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-900">3 Transaksi Pending</p>
                <p className="text-xs text-amber-700 mt-1">Ada 3 transaksi yang membutuhkan persetujuan Anda hari ini.</p>
                <Link href="/approvals" className="inline-block mt-2 text-xs font-bold text-amber-700 bg-amber-100 px-3 py-1.5 rounded-lg">
                  Review Sekarang
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
