import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { redirect } from "next/navigation"
import { ArrowLeft, TrendingUp, Plus } from "lucide-react"
import Link from "next/link"
import { prisma } from "@/lib/prisma"

function formatRupiah(n: number): string {
  return `Rp ${n.toLocaleString('id-ID')}`
}

function groupLabel(date: Date): string {
  const today = new Date()
  const d = new Date(date)
  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (isSameDay(d, today)) return "Hari Ini"
  if (isSameDay(d, yesterday)) return "Kemarin"
  return d.toLocaleDateString("id-ID")
}

function unitIcon(unit: string): string {
  switch (unit) {
    case "Kantor": return "business"
    case "Kantin": return "restaurant"
    case "Koperasi": return "local_mall"
    default: return "receipt_long"
  }
}

export default async function TransactionsPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  const rawTransactions = await prisma.transaction.findMany({
    orderBy: { transactionDate: "desc" },
  })

  const transactions = rawTransactions.map((t) => ({
    id: t.id,
    group: groupLabel(t.transactionDate),
    unit: t.unit,
    category: t.category,
    description: t.description ?? t.category,
    type: t.type,
    amount: Number(t.amount),
    time: new Date(t.transactionDate).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
    icon: unitIcon(t.unit),
  }))

  const totalDebit = transactions.filter((t) => t.type === "Debit").reduce((acc, t) => acc + t.amount, 0)
  const totalKredit = transactions.filter((t) => t.type === "Kredit").reduce((acc, t) => acc + t.amount, 0)
  const totalBalance = totalDebit - totalKredit

  return (
    <div className="min-h-screen bg-[#f4f3f7] text-[#1a1c1e] pb-28 font-sans">
      {/* TopAppBar */}
      <header className="sticky top-0 bg-[#faf9fc] shadow-sm z-40 px-6 py-3 flex justify-between items-center">
        <Link href="/profile" className="w-10 h-10 flex items-center justify-center text-[#43474e] hover:bg-[#e3e2e6]/20 rounded-full transition-colors overflow-hidden">
          {session.user.image ? (
            <img src={session.user.image} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <span className="font-bold">{(session.user.name || 'A').charAt(0).toUpperCase()}</span>
          )}
        </Link>
        <h1 className="text-xl font-bold text-[#022448] flex-1 text-center truncate">Riwayat Transaksi</h1>
        <button aria-label="Notifications" className="w-10 h-10 flex items-center justify-center text-[#43474e] hover:bg-[#e3e2e6]/20 rounded-full transition-colors relative">
          <span className="material-symbols-outlined">notifications</span>
          <span className="absolute top-2 right-2 w-2 h-2 bg-[#ba1a1a] rounded-full border border-white"></span>
        </button>
      </header>

      <main className="px-6 pt-4 flex flex-col gap-5 max-w-[1280px] mx-auto">
        {/* Hero Section: Virtual Balance Card */}
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#022448] to-[#1e3a5f] p-6 text-white shadow-lg flex flex-col gap-3">
          <div className="absolute -right-12 -top-12 opacity-10 pointer-events-none">
            <span className="material-symbols-outlined text-[160px]" style={{ fontVariationSettings: "'FILL' 1" }}>account_balance_wallet</span>
          </div>
          <div className="relative z-10 flex flex-col gap-1">
            <span className="text-sm text-[#adc8f5] font-medium">Total Saldo Gabungan</span>
            <span className="text-3xl sm:text-4xl font-bold font-mono tracking-tight">{formatRupiah(totalBalance)}</span>
          </div>
          <div className="relative z-10 flex items-center mt-2">
            <div className="bg-[#10b981]/20 text-white border border-[#10b981]/30 px-3 py-1 rounded-full flex items-center gap-1 backdrop-blur-sm text-xs font-medium">
              <TrendingUp className="w-3.5 h-3.5 text-[#10b981]" />
              <span>+2.4% dari bulan lalu</span>
            </div>
          </div>
        </section>

        {/* Filter Chips */}
        <section className="overflow-x-auto no-scrollbar -mx-6 px-6 pb-2 pt-1">
          <div className="flex gap-2 w-max">
            <button className="px-4 py-2 bg-[#022448] text-white rounded-full text-sm font-medium shadow-sm transition-all active:scale-95">
              Semua Transaksi
            </button>
            <button className="px-4 py-2 bg-[#faf9fc] text-[#1a1c1e] border border-[#c4c6cf] rounded-full text-sm font-medium shadow-sm transition-all active:scale-95">
              Uang Masuk
            </button>
            <button className="px-4 py-2 bg-[#faf9fc] text-[#1a1c1e] border border-[#c4c6cf] rounded-full text-sm font-medium shadow-sm transition-all active:scale-95">
              Uang Keluar
            </button>
          </div>
        </section>

        {/* Transaction List */}
        <section className="flex flex-col gap-4">
          {transactions.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center text-sm text-[#43474e] border border-[#eeedf1]">
              Belum ada transaksi. Tekan tombol + untuk menambah baru.
            </div>
          ) : (
            Object.entries(
              transactions.reduce<Record<string, typeof transactions>>((acc, t) => {
                if (!acc[t.group]) acc[t.group] = []
                acc[t.group].push(t)
                return acc
              }, {})
            ).map(([group, items]) => (
              <div key={group} className="flex flex-col gap-3 pt-1">
                <h3 className="text-xs font-semibold text-[#43474e] uppercase tracking-wider">{group}</h3>
                {items.map((t) => (
                  <div key={t.id} className="bg-white rounded-2xl p-4 flex items-center gap-4 shadow-sm border border-[#eeedf1] hover:shadow transition-all">
                    <div className="w-12 h-12 rounded-full bg-[#a2e7fd]/30 flex items-center justify-center text-[#16677a] shrink-0">
                      <span className="material-symbols-outlined">{t.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-xs font-medium text-[#43474e] truncate pr-2">{t.unit}</span>
                        <span className={`font-mono text-sm font-bold ${t.type === 'Debit' ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                          {t.type === 'Debit' ? '+' : '-'} {formatRupiah(t.amount)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-[#1a1c1e] truncate pr-2">{t.description}</span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${t.type === 'Debit' ? 'bg-[#10b981]/10 text-[#10b981]' : 'bg-[#ef4444]/10 text-[#ef4444]'}`}>
                            {t.type === 'Debit' ? 'IN' : 'OUT'}
                          </span>
                          <span className="text-xs text-[#74777f]">{t.time}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </section>
      </main>

      {/* Floating Action Button */}
      <Link href="/transactions/new" className="fixed bottom-20 right-6 w-14 h-14 bg-[#022448] text-white rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform duration-200 z-40 hover:bg-[#1e3a5f]">
        <Plus className="w-7 h-7" />
      </Link>
    </div>
  )
}
