import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { redirect } from "next/navigation"
import { ArrowLeft, Search, Filter, ArrowDownRight, ArrowUpRight } from "lucide-react"
import Link from "next/link"

export default async function TransactionsPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  // Mock data
  const transactions = [
    {
      id: 1,
      date: '09 Agu 2026',
      time: '14:30',
      category: 'Penjualan',
      description: 'Penjualan seragam santri baru',
      type: 'Debit',
      amount: 1500000,
      status: 'Approved',
    },
    {
      id: 2,
      date: '09 Agu 2026',
      time: '10:15',
      category: 'Operasional',
      description: 'Beli ATK kantor',
      type: 'Kredit',
      amount: 250000,
      status: 'Approved',
    },
    {
      id: 3,
      date: '08 Agu 2026',
      time: '16:45',
      category: 'SPP',
      description: 'Pembayaran SPP Kelas 10',
      type: 'Debit',
      amount: 3500000,
      status: 'Approved',
    }
  ]

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="p-2 -ml-2 hover:bg-slate-50 rounded-full">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Link>
            <h1 className="text-lg font-bold text-slate-900">Buku Besar</h1>
          </div>
          <button className="p-2 bg-slate-100 text-slate-600 rounded-full hover:bg-slate-200">
            <Filter className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Cari transaksi..." 
            className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border-transparent rounded-xl text-sm focus:bg-white focus:border-[#1E3A5F] focus:ring-2 focus:ring-[#1E3A5F]/20 outline-none transition-all"
          />
        </div>
      </div>

      {/* Transaction List */}
      <div className="p-4 space-y-6">
        <div>
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Hari Ini</h3>
          <div className="space-y-3">
            {transactions.filter(t => t.date === '09 Agu 2026').map((t) => (
              <div key={t.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
                  t.type === 'Debit' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                }`}>
                  {t.type === 'Debit' ? <ArrowDownRight className="w-6 h-6" /> : <ArrowUpRight className="w-6 h-6" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-slate-900 text-sm truncate">{t.category}</h4>
                  <p className="text-xs text-slate-500 truncate">{t.description}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`font-bold font-mono text-sm ${
                    t.type === 'Debit' ? 'text-emerald-600' : 'text-rose-600'
                  }`}>
                    {t.type === 'Debit' ? '+' : '-'} Rp {t.amount.toLocaleString('id-ID')}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{t.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Kemarin</h3>
          <div className="space-y-3">
            {transactions.filter(t => t.date === '08 Agu 2026').map((t) => (
              <div key={t.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
                  t.type === 'Debit' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                }`}>
                  {t.type === 'Debit' ? <ArrowDownRight className="w-6 h-6" /> : <ArrowUpRight className="w-6 h-6" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-slate-900 text-sm truncate">{t.category}</h4>
                  <p className="text-xs text-slate-500 truncate">{t.description}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`font-bold font-mono text-sm ${
                    t.type === 'Debit' ? 'text-emerald-600' : 'text-rose-600'
                  }`}>
                    {t.type === 'Debit' ? '+' : '-'} Rp {t.amount.toLocaleString('id-ID')}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{t.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
