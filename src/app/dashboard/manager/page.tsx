import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { redirect } from "next/navigation"
import { CheckCircle2, ArrowRight, Package, Clock, MessageSquare, Users } from "lucide-react"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { RetailShortcuts } from "@/components/RetailShortcuts"

function formatRupiah(n: number): string {
  return "Rp " + n.toLocaleString('id-ID')
}

export default async function ManagerDashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const { user } = session
  const unit = user.unit

  const transactions = await prisma.transaction.findMany({
    where: unit === "All" ? {} : { unit },
    orderBy: { transactionDate: 'desc' },
  })

  const pendingTransactions = transactions.filter(t => t.status === "Pending" || t.status === "Submitted")
  const approvedTransactions = transactions.filter(t => t.status === "Approved")

  const totalDebit = approvedTransactions.filter(t => t.type === "Debit").reduce((sum, t) => sum + Number(t.amount), 0)
  const totalKredit = approvedTransactions.filter(t => t.type === "Kredit").reduce((sum, t) => sum + Number(t.amount), 0)
  const balance = totalDebit - totalKredit

  return (
    <div className="bg-[#faf9fc] text-[#1a1c1e] font-body min-h-screen pb-28">
      {/* TopAppBar */}
      <header className="sticky top-0 bg-white z-40 border-b border-[#eeedf1] flex items-center justify-between px-6 py-3 max-w-[1280px] mx-auto">
        <div className="flex items-center gap-3">
          <Link href="/profile" className="w-10 h-10 rounded-full bg-[#1e3a5f] flex items-center justify-center text-white font-bold overflow-hidden shadow-sm">
            {user.image ? (
              <img src={user.image} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span>{(user.name || 'M').charAt(0).toUpperCase()}</span>
            )}
          </Link>
          <div>
            <h1 className="text-base font-bold text-[#022448]">Manager {unit}</h1>
            <p className="text-xs text-[#43474e]">Panel Kontrol & Verifikasi Unit</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-[#16677a]/10 text-[#16677a] rounded-full text-xs font-semibold">Manager Role</span>
        </div>
      </header>

      <main className="max-w-[1280px] mx-auto px-6 py-6 space-y-6">
        {/* Unit Summary Card */}
        <section className="bg-[#022448] text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-xs text-[#adc8f5] mb-1 font-medium uppercase tracking-wider">Saldo Kas Unit {unit}</p>
            <div className="text-3xl sm:text-4xl font-bold font-mono tracking-tight mb-4">{formatRupiah(balance)}</div>
            <div className="grid grid-cols-2 gap-4 border-t border-white/15 pt-4">
              <div>
                <span className="text-xs text-[#adc8f5]">Total Masuk</span>
                <p className="font-mono text-emerald-400 font-bold">+ {formatRupiah(totalDebit)}</p>
              </div>
              <div>
                <span className="text-xs text-[#adc8f5]">Total Keluar</span>
                <p className="font-mono text-rose-400 font-bold">- {formatRupiah(totalKredit)}</p>
              </div>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -mr-16 -mt-16 pointer-events-none"></div>
        </section>

        {/* Retail Shortcuts */}
        <RetailShortcuts />

        {/* AI Assistant Quick Access */}
        <Link href="/ai/assistant" className="block rounded-2xl border border-[#eeedf1] bg-white p-4 shadow-sm active:scale-[0.99] transition-transform">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#022448] text-white">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-[#1a1c1e]">Asisten AI</p>
              <p className="text-[11px] text-[#43474e]">Tanya saldo, transaksi, stok, approval, atau laporan</p>
            </div>
            <span className="text-xs font-semibold text-[#022448]">Coba</span>
          </div>
        </Link>

        {/* Quick Actions & Pending Approvals Alert */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-[#e3e2e6] shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm text-[#43474e]">Menunggu Approval</p>
              <h3 className="text-2xl font-bold text-[#022448]">{pendingTransactions.length} Transaksi</h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-[#ffdad6] text-[#93000a] flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#e3e2e6] shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm text-[#43474e]">Disetujui Bulan Ini</p>
              <h3 className="text-2xl font-bold text-[#022448]">{approvedTransactions.length} Transaksi</h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#e3e2e6] shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm text-[#43474e]">Status Inventori</p>
              <h3 className="text-lg font-bold text-[#16677a]">Normal / Aman</h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-[#a2e7fd]/30 text-[#16677a] flex items-center justify-center">
              <Package className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Pending Transactions for Manager Approval */}
        <section className="bg-white rounded-3xl p-6 shadow-sm border border-[#e3e2e6] space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold text-[#1a1c1e]">Persetujuan Transaksi Staff</h3>
            <Link href="/approvals" className="text-sm font-semibold text-[#16677a] hover:underline flex items-center gap-1">
              Lihat Semua <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {pendingTransactions.length === 0 ? (
            <div className="text-center py-10 bg-[#faf9fc] rounded-2xl border border-dashed border-[#c4c6cf]">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-[#43474e]">Tidak ada transaksi staff yang menunggu approval saat ini.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingTransactions.slice(0, 5).map((t) => (
                <div key={t.id} className="flex items-center justify-between p-4 bg-[#faf9fc] rounded-2xl border border-[#eeedf1]">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 bg-[#1e3a5f]/10 text-[#1e3a5f] rounded-md text-xs font-semibold">{t.category}</span>
                      <span className="text-xs text-[#74777f]">{new Date(t.transactionDate).toLocaleDateString('id-ID')}</span>
                    </div>
                    <p className="font-bold text-[#1a1c1e]">{t.description || 'Tanpa keterangan'}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-bold text-lg text-[#022448]">{formatRupiah(Number(t.amount))}</p>
                    <Link href="/approvals" className="text-xs font-semibold text-[#16677a] hover:underline">Review &rarr;</Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* User Management Quick Access */}
        <Link href="/users" className="block rounded-2xl border border-[#eeedf1] bg-white p-4 shadow-sm active:scale-[0.99] transition-transform">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#022448] text-white">
              <Users className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-[#1a1c1e]">Manajemen User</p>
              <p className="text-[11px] text-[#43474e]">Tambah Manager atau Staff, atur unit dan akses retail</p>
            </div>
            <span className="text-xs font-semibold text-[#022448]">Buka</span>
          </div>
        </Link>
      </main>
    </div>
  )
}
