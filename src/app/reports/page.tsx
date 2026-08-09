import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { redirect } from "next/navigation"
import { ArrowLeft, Download, Calendar, BarChart3, PieChart, FileSpreadsheet, FileText } from "lucide-react"
import Link from "next/link"

export default async function ReportsPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-4 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="p-2 -ml-2 hover:bg-slate-50 rounded-full">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <h1 className="text-lg font-bold text-slate-900">Laporan Keuangan</h1>
        </div>
        <button className="p-2 bg-slate-100 text-slate-600 rounded-full hover:bg-slate-200">
          <Calendar className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <p className="text-xs text-slate-500 mb-1">Total Pemasukan</p>
            <p className="text-lg font-bold font-mono text-emerald-600">Rp 45.200.000</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <p className="text-xs text-slate-500 mb-1">Total Pengeluaran</p>
            <p className="text-lg font-bold font-mono text-rose-600">Rp 12.800.000</p>
          </div>
        </div>

        {/* Visual Chart Placeholder */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-slate-900 text-sm">Tren Bulanan</h3>
            <BarChart3 className="w-4 h-4 text-slate-400" />
          </div>
          
          {/* Simple CSS Bar Chart */}
          <div className="h-40 flex items-end justify-between gap-3 pt-4">
            {[
              { month: 'Mar', val: 40 },
              { month: 'Apr', val: 60 },
              { month: 'Mei', val: 45 },
              { month: 'Jun', val: 80 },
              { month: 'Jul', val: 95 },
              { month: 'Agu', val: 70 },
            ].map((item) => (
              <div key={item.month} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full bg-slate-100 rounded-t-lg relative h-32 flex items-end">
                  <div 
                    className="w-full bg-[#1E3A5F] rounded-t-lg transition-all duration-500" 
                    style={{ height: `${item.val}%` }}
                  ></div>
                </div>
                <span className="text-[10px] font-medium text-slate-500">{item.month}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Export Options */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <h3 className="font-bold text-slate-900 text-sm mb-4">Ekspor Laporan</h3>
          
          <div className="space-y-3">
            <button className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 rounded-xl transition text-left">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-sm">Ekspor ke Excel (.xlsx)</p>
                  <p className="text-xs text-slate-500">Laporan detail transaksi & rekap</p>
                </div>
              </div>
              <Download className="w-4 h-4 text-slate-400" />
            </button>

            <button className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 rounded-xl transition text-left">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-sm">Ekspor ke PDF (.pdf)</p>
                  <p className="text-xs text-slate-500">Laporan resmi siap cetak</p>
                </div>
              </div>
              <Download className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
