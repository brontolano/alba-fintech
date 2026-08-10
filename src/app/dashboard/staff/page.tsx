import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { redirect } from "next/navigation"
import { PlusCircle, Clock, CheckCircle2, FileText } from "lucide-react"
import Link from "next/link"
import { prisma } from "@/lib/prisma"

function formatRupiah(n: number): string {
  return "Rp " + n.toLocaleString('id-ID')
}

export default async function StaffDashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const { user } = session

  const myTransactions = await prisma.transaction.findMany({
    where: { userId: Number(user.id) },
    orderBy: { createdAt: 'desc' },
    take: 10,
  })

  const totalInputted = myTransactions.reduce((sum, t) => sum + Number(t.amount), 0)
  const pendingCount = myTransactions.filter(t => t.status === 'Pending' || t.status === 'Submitted').length

  return (
    <div className="bg-[#faf9fc] text-[#1a1c1e] font-body min-h-screen pb-28">
      {/* TopAppBar */}
      <header className="sticky top-0 bg-white z-40 border-b border-[#eeedf1] flex items-center justify-between px-6 py-3 max-w-[1280px] mx-auto">
        <div className="flex items-center gap-3">
          <Link href="/profile" className="w-10 h-10 rounded-full bg-[#16677a] flex items-center justify-center text-white font-bold overflow-hidden shadow-sm">
            {user.image ? (
              <img src={user.image} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span>{(user.name || 'S').charAt(0).toUpperCase()}</span>
            )}
          </Link>
          <div>
            <h1 className="text-base font-bold text-[#022448]">Staff {user.unit}</h1>
            <p className="text-xs text-[#43474e]">Pencatatan Transaksi & Kasir</p>
          </div>
        </div>
        <Link href="/transactions/new" className="bg-[#022448] text-white px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-1 hover:bg-[#1e3a5f] shadow-sm">
          <span className="material-symbols-outlined text-sm">add</span> Input Baru
        </Link>
      </header>

      <main className="max-w-[1280px] mx-auto px-6 py-6 space-y-6">
        {/* Staff Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-[#e3e2e6] flex items-center justify-between">
            <div>
              <p className="text-xs text-[#43474e] uppercase font-medium mb-1">Total Input Saya</p>
              <h3 className="text-2xl font-bold font-mono text-[#022448]">{formatRupiah(totalInputted)}</h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-[#a2e7fd]/30 text-[#16677a] flex items-center justify-center">
              <FileText className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-[#e3e2e6] flex items-center justify-between">
            <div>
              <p className="text-xs text-[#43474e] uppercase font-medium mb-1">Menunggu Review Manager</p>
              <h3 className="text-2xl font-bold font-mono text-[#93000a]">{pendingCount} Dokumen</h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-[#ffdad6] text-[#93000a] flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Riwayat Permohonan */}
        <section className="bg-white rounded-3xl p-6 shadow-sm border border-[#e3e2e6] space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xl font-bold text-[#1a1c1e]">Permohonan Transaksi Anda</h3>
              <p className="text-xs text-[#43474e] mt-1">Status alur: Staff &rarr; Manager &rarr; Pimpinan</p>
            </div>
            <Link href="/transactions" className="text-sm font-semibold text-[#16677a] hover:underline">Lihat Semua</Link>
          </div>

          {myTransactions.length === 0 ? (
            <div className="text-center py-12 bg-[#faf9fc] rounded-2xl border border-dashed border-[#c4c6cf]">
              <PlusCircle className="w-10 h-10 text-[#43474e] mx-auto mb-2" />
              <p className="text-sm font-medium text-[#43474e]">Belum ada permohonan transaksi yang Anda ajukan.</p>
              <Link href="/transactions/new" className="inline-block mt-3 px-4 py-2 bg-[#022448] text-white text-sm font-semibold rounded-full">
                Ajukan Transaksi
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {myTransactions.map((t) => (
                <div key={t.id} className="p-4 bg-[#faf9fc] rounded-2xl border border-[#eeedf1]">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        t.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' :
                        t.status === 'Pending' ? 'bg-amber-100 text-amber-800' :
                        t.status === 'Submitted' ? 'bg-blue-100 text-blue-800' :
                        t.status === 'Rejected' ? 'bg-rose-100 text-rose-800' : 'bg-slate-200 text-slate-800'
                      }`}>
                        {t.status === 'Submitted' ? 'Menunggu Manager' : t.status}
                      </span>
                      <span className="text-xs text-[#74777f]">{new Date(t.transactionDate).toLocaleDateString('id-ID')}</span>
                    </div>
                    <p className={`font-mono font-bold text-lg ${t.type === 'Debit' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {t.type === 'Debit' ? '+' : '-'} {formatRupiah(Number(t.amount))}
                    </p>
                  </div>
                  <p className="font-bold text-[#1a1c1e] mb-2">{t.category} - {t.description || 'Tanpa keterangan'}</p>

                  {/* Permohonan Status Flow */}
                  <div className="flex items-center gap-1.5 text-xs text-[#43474e]">
                    <span className={t.status !== 'Draft' ? 'text-emerald-600 font-semibold' : ''}>Ajukan</span>
                    <span className={t.status !== 'Draft' && t.status !== 'Rejected' ? 'text-emerald-600' : ''}>&rarr;</span>
                    <span className={['Pending', 'Approved'].includes(t.status) ? 'text-emerald-600 font-semibold' : ''}>Manager</span>
                    <span className={t.status === 'Approved' ? 'text-emerald-600' : ''}>&rarr;</span>
                    <span className={t.status === 'Approved' ? 'text-emerald-600 font-semibold' : ''}>Pimpinan</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
