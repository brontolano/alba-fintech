import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { redirect } from "next/navigation"
import { CheckCircle, XCircle, Clock, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default async function ApprovalsPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  const { user } = session

  // Only Manager and Pimpinan can access approvals
  if (user.role === 'Staff') {
    redirect('/dashboard')
  }

  // Mock data for pending approvals
  const pendingApprovals = [
    {
      id: 1,
      date: '2026-08-09',
      unit: 'Kantin',
      type: 'Kredit',
      category: 'Belanja Modal',
      amount: 2500000,
      description: 'Beli kulkas showcase baru',
      submittedBy: 'Staff Kantin',
      status: 'Pending Manager',
    },
    {
      id: 2,
      date: '2026-08-09',
      unit: 'Kantin',
      type: 'Kredit',
      category: 'Operasional',
      amount: 500000,
      description: 'Beli bahan baku snack',
      submittedBy: 'Staff Kantin',
      status: 'Pending Manager',
    }
  ]

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <Link href="/dashboard" className="p-2 -ml-2 hover:bg-slate-50 rounded-full">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <h1 className="text-lg font-bold text-slate-900">Persetujuan Transaksi</h1>
      </div>

      <div className="p-4 space-y-4">
        {/* Tabs */}
        <div className="flex bg-slate-200/50 p-1 rounded-xl">
          <button className="flex-1 py-2 text-sm font-medium bg-white text-[#1E3A5F] rounded-lg shadow-sm">
            Menunggu ({pendingApprovals.length})
          </button>
          <button className="flex-1 py-2 text-sm font-medium text-slate-500 hover:text-slate-700">
            Riwayat
          </button>
        </div>

        {/* List */}
        <div className="space-y-3">
          {pendingApprovals.map((item) => (
            <div key={item.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-2 py-1 rounded-md">
                    {item.status}
                  </span>
                  <h3 className="font-bold text-slate-900 mt-2">{item.category}</h3>
                  <p className="text-xs text-slate-500">{item.date} • {item.unit}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold font-mono text-rose-600">
                    - Rp {item.amount.toLocaleString('id-ID')}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Oleh: {item.submittedBy}</p>
                </div>
              </div>
              
              <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-xl mb-4">
                "{item.description}"
              </p>

              <div className="flex gap-2">
                <button className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-50 text-emerald-700 rounded-xl font-medium text-sm hover:bg-emerald-100 transition">
                  <CheckCircle className="w-4 h-4" />
                  Setujui
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-rose-50 text-rose-700 rounded-xl font-medium text-sm hover:bg-rose-100 transition">
                  <XCircle className="w-4 h-4" />
                  Tolak
                </button>
              </div>
            </div>
          ))}

          {pendingApprovals.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-500 font-medium">Semua transaksi sudah disetujui</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
