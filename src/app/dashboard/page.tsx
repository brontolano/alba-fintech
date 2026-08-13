import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { redirect } from "next/navigation"
import { Wallet, TrendingUp, TrendingDown, Building2, Store, ShoppingBag, MessageSquare, Users } from "lucide-react"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { RetailShortcuts } from "@/components/RetailShortcuts"

function formatRupiah(n: number): string {
  return `Rp ${n.toLocaleString('id-ID')}`
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  const { user } = session

  // Redirect based on role
  if (user.role === 'Manager') {
    redirect('/dashboard/manager')
  } else if (user.role === 'Staff') {
    redirect('/dashboard/staff')
  }

  // Pimpinan Executive Dashboard
  const transactions = await prisma.transaction.findMany({
    where: { status: "Approved" },
  })

  const units = ["Kantor", "Kantin", "Koperasi"]
  const byUnit: Record<string, { debit: number; kredit: number; balance: number }> = {}
  for (const u of units) {
    let debit = 0
    let kredit = 0
    for (const t of transactions) {
      if (t.unit !== u) continue
      const amt = Number(t.amount)
      if (t.type === "Debit") debit += amt
      else kredit += amt
    }
    byUnit[u] = { debit, kredit, balance: debit - kredit }
  }

  const totalDebit = transactions
    .filter((t) => t.type === "Debit")
    .reduce((acc, t) => acc + Number(t.amount), 0)
  const totalKredit = transactions
    .filter((t) => t.type === "Kredit")
    .reduce((acc, t) => acc + Number(t.amount), 0)
  const totalBalance = totalDebit - totalKredit

  const pendingCount = await prisma.transaction.count({ where: { status: "Pending" } })

  const recentTransactions = await prisma.transaction.findMany({
    orderBy: { transactionDate: "desc" },
    take: 5,
  })

  const approvedTx = await prisma.transaction.count({ where: { status: "Approved" } })
  const rejectedTx = await prisma.transaction.count({ where: { status: "Rejected" } })

  return (
    <div className="min-h-screen bg-[#faf9fc] text-[#1a1c1e] pb-24 font-sans">
      {/* TopAppBar */}
      <header className="sticky top-0 bg-[#faf9fc] z-40 flex items-center justify-between px-6 py-3 max-w-[1280px] mx-auto border-b border-[#eeedf1]">
        <div className="flex items-center gap-3">
          <Link href="/profile" className="w-10 h-10 rounded-full bg-[#1e3a5f] flex items-center justify-center text-[#ffffff] font-bold overflow-hidden shadow-sm hover:opacity-90 transition-opacity">
            {user.image ? (
              <img src={user.image} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span>{(user.name || 'AL').charAt(0).toUpperCase()}</span>
            )}
          </Link>
          <h1 className="text-xl font-bold text-[#022448]">ALBA Finance</h1>
        </div>
        <button aria-label="Notifications" className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#e9e7eb] transition-colors text-[#022448]">
          <span className="material-symbols-outlined">notifications</span>
        </button>
      </header>

      <main className="max-w-[1280px] mx-auto px-6 pt-6 pb-8 flex flex-col gap-6">
        {/* Balance Summary Card */}
        <section className="bg-[#1e3a5f] rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
          <div className="relative z-10 flex justify-between items-center mb-4">
            <div>
              <p className="text-xs text-[#adc8f5] mb-1 font-medium">Total Saldo Gabungan</p>
              <div className="text-3xl font-bold font-mono tracking-tight">{formatRupiah(totalBalance)}</div>
            </div>
            <div className="bg-white/10 p-3 rounded-full backdrop-blur-sm">
              <Wallet className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="relative z-10">
            <div className="grid grid-cols-2 gap-4 mt-4 border-t border-white/15 pt-3">
              <div className="flex flex-col">
                <span className="text-xs text-[#adc8f5]">Debit</span>
                <span className="font-mono text-sm text-emerald-400 font-bold whitespace-nowrap">+ {formatRupiah(totalDebit)}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-[#adc8f5]">Kredit</span>
                <span className="font-mono text-sm text-rose-400 font-bold whitespace-nowrap">- {formatRupiah(totalKredit)}</span>
              </div>
            </div>
            <Link href="/reports" className="block text-center w-full py-2.5 rounded-xl bg-white/15 text-white text-sm font-medium hover:bg-white/25 transition-colors mt-4">
              Detail Laporan
            </Link>
          </div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 pointer-events-none"></div>
        </section>

        {/* Unit Keuangan (Grid 4 Unit) */}
        <section className="flex flex-col gap-4">
          <h3 className="text-lg font-bold text-[#1a1c1e]">Unit Keuangan</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Unit Kantor */}
            <div className="bg-[#1e3a5f] p-5 rounded-2xl shadow-md flex flex-col gap-4 relative overflow-hidden text-white">
              <div className="flex justify-between items-center relative z-10">
                <span className="text-sm text-[#adc8f5] font-medium">Unit Kantor</span>
                <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 text-xs rounded-lg font-semibold border border-emerald-500/30">SEHAT</span>
              </div>
              <div className="relative z-10">
                <div className="absolute bottom-0 right-0 opacity-10 pointer-events-none">
                  <Building2 className="w-24 h-24" />
                </div>
                <div className="font-mono text-2xl font-bold">{formatRupiah(byUnit["Kantor"]?.balance ?? 0)}</div>
                <div className="grid grid-cols-2 gap-4 mt-4 border-t border-white/15 pt-3">
                  <div>
                    <span className="text-xs text-[#adc8f5]">Debit</span>
                    <p className="font-mono text-xs text-emerald-400 font-bold">+ {formatRupiah(byUnit["Kantor"]?.debit ?? 0)}</p>
                  </div>
                  <div>
                    <span className="text-xs text-[#adc8f5]">Kredit</span>
                    <p className="font-mono text-xs text-rose-400 font-bold">- {formatRupiah(byUnit["Kantor"]?.kredit ?? 0)}</p>
                  </div>
                </div>
              </div>
              <Link href="/transactions?unit=Kantor" className="w-full py-2 rounded-xl bg-white/15 text-center text-xs font-medium hover:bg-white/25 transition-colors relative z-10">
                Detail Unit
              </Link>
            </div>

            {/* Unit Kantin Umi */}
            <div className="bg-[#16677a] p-5 rounded-2xl shadow-md flex flex-col gap-4 relative overflow-hidden text-white">
              <div className="flex justify-between items-center relative z-10">
                <span className="text-sm text-[#b1ecff] font-medium">Unit Kantin Umi</span>
                <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 text-xs rounded-lg font-semibold border border-emerald-500/30">SEHAT</span>
              </div>
              <div className="relative z-10">
                <div className="absolute bottom-0 right-0 opacity-10 pointer-events-none">
                  <Store className="w-24 h-24" />
                </div>
                <div className="font-mono text-2xl font-bold">{formatRupiah(byUnit["Kantin"]?.balance ?? 0)}</div>
                <div className="grid grid-cols-2 gap-4 mt-4 border-t border-white/15 pt-3">
                  <div>
                    <span className="text-xs text-[#b1ecff]">Debit</span>
                    <p className="font-mono text-xs text-emerald-400 font-bold">+ {formatRupiah(byUnit["Kantin"]?.debit ?? 0)}</p>
                  </div>
                  <div>
                    <span className="text-xs text-[#b1ecff]">Kredit</span>
                    <p className="font-mono text-xs text-rose-400 font-bold">- {formatRupiah(byUnit["Kantin"]?.kredit ?? 0)}</p>
                  </div>
                </div>
              </div>
              <Link href="/transactions?unit=Kantin" className="w-full py-2 rounded-xl bg-white/15 text-center text-xs font-medium hover:bg-white/25 transition-colors relative z-10">
                Detail Unit
              </Link>
            </div>

            {/* Unit Kantin Baru */}
            <div className="bg-[#503300] p-5 rounded-2xl shadow-md flex flex-col gap-4 relative overflow-hidden text-white">
              <div className="flex justify-between items-center relative z-10">
                <span className="text-sm text-[#edbf7f] font-medium">Unit Kantin Baru</span>
                <span className="px-2.5 py-0.5 bg-[#a2e7fd]/20 text-[#a2e7fd] text-xs rounded-lg font-semibold border border-[#a2e7fd]/30">NORMAL</span>
              </div>
              <div className="relative z-10">
                <div className="absolute bottom-0 right-0 opacity-10 pointer-events-none">
                  <Store className="w-24 h-24" />
                </div>
                <div className="font-mono text-2xl font-bold">{formatRupiah(byUnit["Kantin"]?.balance ?? 0)}</div>
                <div className="grid grid-cols-2 gap-4 mt-4 border-t border-white/15 pt-3">
                  <div>
                    <span className="text-xs text-[#edbf7f]">Debit</span>
                    <p className="font-mono text-xs text-emerald-400 font-bold">+ {formatRupiah(byUnit["Kantin"]?.debit ?? 0)}</p>
                  </div>
                  <div>
                    <span className="text-xs text-[#edbf7f]">Kredit</span>
                    <p className="font-mono text-xs text-rose-400 font-bold">- {formatRupiah(byUnit["Kantin"]?.kredit ?? 0)}</p>
                  </div>
                </div>
              </div>
              <Link href="/transactions?unit=Kantin" className="w-full py-2 rounded-xl bg-white/15 text-center text-xs font-medium hover:bg-white/25 transition-colors relative z-10">
                Detail Unit
              </Link>
            </div>

            {/* Unit Koperasi Buku */}
            <div className="bg-[#022448] p-5 rounded-2xl shadow-md flex flex-col gap-4 relative overflow-hidden text-white">
              <div className="flex justify-between items-center relative z-10">
                <span className="text-sm text-[#adc8f5] font-medium">Unit Koperasi Buku</span>
                <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 text-xs rounded-lg font-semibold border border-emerald-500/30">SEHAT</span>
              </div>
              <div className="relative z-10">
                <div className="absolute bottom-0 right-0 opacity-10 pointer-events-none">
                  <ShoppingBag className="w-24 h-24" />
                </div>
                <div className="font-mono text-2xl font-bold">{formatRupiah(byUnit["Koperasi"]?.balance ?? 0)}</div>
                <div className="grid grid-cols-2 gap-4 mt-4 border-t border-white/15 pt-3">
                  <div>
                    <span className="text-xs text-[#adc8f5]">Debit</span>
                    <p className="font-mono text-xs text-emerald-400 font-bold">+ {formatRupiah(byUnit["Koperasi"]?.debit ?? 0)}</p>
                  </div>
                  <div>
                    <span className="text-xs text-[#adc8f5]">Kredit</span>
                    <p className="font-mono text-xs text-rose-400 font-bold">- {formatRupiah(byUnit["Koperasi"]?.kredit ?? 0)}</p>
                  </div>
                </div>
              </div>
              <Link href="/transactions?unit=Koperasi" className="w-full py-2 rounded-xl bg-white/15 text-center text-xs font-medium hover:bg-white/25 transition-colors relative z-10">
                Detail Unit
              </Link>
            </div>
          </div>
        </section>

        {/* Pending Approvals Widget */}
        {(user.role === 'Manager' || user.role === 'Pimpinan') && (
          <section className="bg-amber-50 border border-amber-200 rounded-2xl p-5 shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-bold text-amber-900">Menunggu Persetujuan</h3>
              <Link href="/approvals" className="text-xs text-amber-700 font-semibold hover:underline">Lihat Semua</Link>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined">task_alt</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-amber-950">{pendingCount} Transaksi Pending</p>
                <p className="text-xs text-amber-800 mt-0.5">{approvedTx} transaksi disetujui, {rejectedTx} ditolak, {pendingCount} menunggu.</p>
                <Link href="/approvals" className="inline-block mt-3 px-4 py-2 bg-amber-600 text-white text-xs font-bold rounded-xl shadow hover:bg-amber-700 transition-colors">
                  Review Sekarang
                </Link>
              </div>
            </div>
          </section>
        )}

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

        {/* Recent Transactions */}
        <section className="flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-[#1a1c1e]">Aktivitas Terbaru</h3>
            <Link href="/transactions" className="text-xs text-[#1e3a5f] font-semibold hover:underline">Lihat Semua</Link>
          </div>
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-[#eeedf1] divide-y divide-[#eeedf1]">
            {recentTransactions.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-500">Belum ada aktivitas.</div>
            ) : (
              recentTransactions.map((t) => (
                <div key={t.id} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                      {t.type === "Debit" ? (
                        <TrendingUp className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <TrendingDown className="w-5 h-5 text-rose-600" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{t.category}</h4>
                      <p className="text-xs text-slate-500">
                        {t.unit} • {new Date(t.transactionDate).toLocaleDateString("id-ID")}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`font-mono text-sm font-bold ${t.type === "Debit" ? "text-emerald-600" : "text-rose-600"}`}>
                      {t.type === "Debit" ? "+" : "-"} {formatRupiah(Number(t.amount))}
                    </span>
                    <span className={`block text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 text-center ${t.type === "Debit" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
                      {t.type === "Debit" ? "IN" : "OUT"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* User Management Quick Access */}
        <Link href="/users" className="block rounded-2xl border border-[#eeedf1] bg-white p-4 shadow-sm active:scale-[0.99] transition-transform">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#022448] text-white">
              <Users className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-[#1a1c1e]">Manajemen User</p>
              <p className="text-[11px] text-[#43474e]">Tambah Manager/Staff, atur unit dan akses retail</p>
            </div>
            <span className="text-xs font-semibold text-[#022448]">Buka</span>
          </div>
        </Link>
      </main>
    </div>
  )
}