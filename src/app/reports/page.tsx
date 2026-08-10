import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { redirect } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"

function formatRupiah(n: number): string {
  return `Rp ${n.toLocaleString('id-ID')}`
}

export default async function ReportsPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  const transactions = await prisma.transaction.findMany()

  let totalDebit = 0
  let totalKredit = 0
  const byUnit: Record<string, { debit: number; kredit: number }> = {}
  for (const t of transactions) {
    const amt = Number(t.amount)
    if (t.type === "Debit") totalDebit += amt
    else totalKredit += amt
    if (!byUnit[t.unit]) byUnit[t.unit] = { debit: 0, kredit: 0 }
    if (t.type === "Debit") byUnit[t.unit].debit += amt
    else byUnit[t.unit].kredit += amt
  }
  const netBalance = totalDebit - totalKredit

  const maxUnitTotal = Math.max(
    1,
    ...Object.values(byUnit).map((u) => u.debit + u.kredit)
  )

  return (
    <div className="bg-[#faf9fc] text-[#1a1c1e] font-body min-h-screen pb-32 md:pb-12">
      {/* TopAppBar */}
      <header className="bg-[#f4f3f7] sticky top-0 w-full z-40 shadow-sm">
        <div className="flex justify-between items-center px-6 py-3 w-full max-w-[1280px] mx-auto">
          <div className="flex items-center gap-3">
            <Link href="/profile" className="w-10 h-10 rounded-full bg-[#1e3a5f] text-[#8aa4cf] flex items-center justify-center font-bold hover:opacity-90 transition-opacity overflow-hidden">
              {session.user.image ? (
                <img src={session.user.image} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span>{(session.user.name || 'AL').charAt(0).toUpperCase()}</span>
              )}
            </Link>
            <h1 className="text-xl font-bold text-[#022448]">ALBA Finance</h1>
          </div>
          <button aria-label="Notifications" className="w-10 h-10 rounded-full flex items-center justify-center text-[#43474e] hover:bg-[#e3e2e6]/50 transition-colors relative">
            <span className="material-symbols-outlined">notifications</span>
            <span className="absolute top-2 right-2 w-2 h-2 bg-[#ba1a1a] rounded-full border border-white"></span>
          </button>
        </div>
      </header>

      {/* Desktop SideNav */}
      <nav className="hidden md:flex flex-col w-[256px] fixed left-0 top-[72px] h-[calc(100vh-72px)] bg-[#faf9fc] border-r border-[#e9e7eb] py-5 px-4 gap-2 z-30">
        <Link className="flex items-center gap-3 px-4 py-3 rounded-2xl text-[#43474e] hover:bg-[#e3e2e6]/50 transition-colors" href="/dashboard">
          <span className="material-symbols-outlined">home</span>
          <span className="text-base font-medium">Beranda</span>
        </Link>
        <Link className="flex items-center gap-3 px-4 py-3 rounded-2xl text-[#43474e] hover:bg-[#e3e2e6]/50 transition-colors" href="/transactions">
          <span className="material-symbols-outlined">account_balance_wallet</span>
          <span className="text-base font-medium">Transaksi</span>
        </Link>
        <Link className="flex items-center gap-3 px-4 py-3 rounded-2xl text-[#43474e] hover:bg-[#e3e2e6]/50 transition-colors" href="/approvals">
          <span className="material-symbols-outlined">fact_check</span>
          <span className="text-base font-medium">Persetujuan</span>
        </Link>
        <Link className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-[#1e3a5f] text-white transition-colors" href="/reports">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>assessment</span>
          <span className="text-base font-bold">Laporan</span>
        </Link>
        <Link className="flex items-center gap-3 px-4 py-3 rounded-2xl text-[#43474e] hover:bg-[#e3e2e6]/50 transition-colors" href="/reconciliations">
          <span className="material-symbols-outlined">account_tree</span>
          <span className="text-base font-medium">Rekonsiliasi</span>
        </Link>
      </nav>

      {/* Main Content Canvas */}
      <main className="w-full max-w-[1280px] mx-auto px-6 py-5 md:py-6 md:pl-[280px]">
        {/* Page Header & Filter */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end mb-6 gap-4">
          <div>
            <h2 className="text-3xl font-bold text-[#1a1c1e] mb-1">Laporan Eksekutif</h2>
            <p className="text-base text-[#43474e]">Ringkasan performa keuangan institusi.</p>
          </div>
          <div className="relative inline-block w-full sm:w-auto">
            <select className="appearance-none w-full bg-white border border-[#c4c6cf] text-[#1a1c1e] text-base py-2 pl-4 pr-10 rounded-full focus:outline-none focus:ring-2 focus:ring-[#022448] cursor-pointer shadow-sm">
              <option>Bulan Ini</option>
              <option>Bulan Lalu</option>
              <option>Kuartal Ini</option>
              <option>Tahun Ini</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#43474e]">
              <span className="material-symbols-outlined">expand_more</span>
            </div>
          </div>
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 1. Financial Summary Card */}
          <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Pemasukan */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#eeedf1] flex flex-col justify-between">
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 rounded-full bg-[#a2e7fd] text-[#1b697c] flex items-center justify-center">
                  <span className="material-symbols-outlined">arrow_downward</span>
                </div>
                <span className="inline-flex items-center gap-1 bg-[#e9e7eb] text-[#16677a] px-2.5 py-1 rounded-full text-xs font-semibold">
                  <span className="material-symbols-outlined text-[16px]">trending_up</span> +12.5%
                </span>
              </div>
              <div>
                <p className="text-sm text-[#43474e] mb-1">Total Pemasukan</p>
                <h3 className="text-2xl font-bold text-[#1a1c1e] font-mono">{formatRupiah(totalDebit)}</h3>
              </div>
            </div>

            {/* Pengeluaran */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#eeedf1] flex flex-col justify-between">
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 rounded-full bg-[#ffdad6] text-[#93000a] flex items-center justify-center">
                  <span className="material-symbols-outlined">arrow_upward</span>
                </div>
                <span className="inline-flex items-center gap-1 bg-[#e9e7eb] text-[#ba1a1a] px-2.5 py-1 rounded-full text-xs font-semibold">
                  <span className="material-symbols-outlined text-[16px]">trending_up</span> +5.2%
                </span>
              </div>
              <div>
                <p className="text-sm text-[#43474e] mb-1">Total Pengeluaran</p>
                <h3 className="text-2xl font-bold text-[#1a1c1e] font-mono">{formatRupiah(totalKredit)}</h3>
              </div>
            </div>

            {/* Laba Bersih */}
            <div className="bg-[#022448] rounded-2xl p-6 shadow-sm text-white flex flex-col justify-between relative overflow-hidden">
              <div className="absolute -right-6 -top-6 w-32 h-32 bg-[#1e3a5f] rounded-full opacity-50"></div>
              <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="w-10 h-10 rounded-full bg-[#1e3a5f] text-[#adc8f5] flex items-center justify-center">
                  <span className="material-symbols-outlined">account_balance</span>
                </div>
              </div>
              <div className="relative z-10">
                <p className="text-sm text-[#adc8f5] mb-1">Laba Bersih</p>
                <h3 className="text-2xl font-bold text-white font-mono">{formatRupiah(netBalance)}</h3>
              </div>
            </div>
          </div>

          {/* 2. Unit Performance Comparison */}
          <div className="md:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-[#eeedf1]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-[#1a1c1e]">Perbandingan Performa Unit</h3>
              <button className="text-[#022448] hover:text-[#adc8f5] transition-colors">
                <span className="material-symbols-outlined">more_horiz</span>
              </button>
            </div>
            <div className="space-y-4">
              {Object.entries(byUnit).length === 0 ? (
                <p className="text-sm text-[#43474e]">Belum ada data unit</p>
              ) : (
                Object.entries(byUnit).map(([unit, vals]) => {
                  const debitPct = Math.round((vals.debit / maxUnitTotal) * 100)
                  const kreditPct = Math.round((vals.kredit / maxUnitTotal) * 100)
                  return (
                    <div key={unit}>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium text-[#1a1c1e]">Unit {unit}</span>
                        <span className="text-sm text-[#43474e] font-mono">{formatRupiah(vals.debit)} / {formatRupiah(vals.kredit)}</span>
                      </div>
                      <div className="h-3 w-full bg-[#e9e7eb] rounded-full overflow-hidden flex">
                        <div className="h-full bg-[#16677a]" style={{ width: `${debitPct}%` }}></div>
                        <div className="h-full bg-[#ba1a1a] opacity-70" style={{ width: `${kreditPct}%` }}></div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
            <div className="flex justify-center gap-6 mt-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#16677a]"></div>
                <span className="text-xs font-medium text-[#43474e]">Pemasukan</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#ba1a1a] opacity-70"></div>
                <span className="text-xs font-medium text-[#43474e]">Pengeluaran</span>
              </div>
            </div>
          </div>

          {/* 3. Top Expenditure Categories */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#eeedf1] flex flex-col justify-between">
            <h3 className="text-xl font-bold text-[#1a1c1e] mb-6">Kategori Pengeluaran Terbesar</h3>
            <div className="relative w-32 h-32 mx-auto mb-6 flex-shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" fill="transparent" r="15.91549430918954" stroke="#e9e7eb" strokeWidth="4"></circle>
                <circle cx="18" cy="18" fill="transparent" r="15.91549430918954" stroke="#022448" strokeDasharray="45 55" strokeDashoffset="0" strokeWidth="4"></circle>
                <circle cx="18" cy="18" fill="transparent" r="15.91549430918954" stroke="#16677a" strokeDasharray="35 65" strokeDashoffset="-45" strokeWidth="4"></circle>
                <circle cx="18" cy="18" fill="transparent" r="15.91549430918954" stroke="#8cd1e6" strokeDasharray="20 80" strokeDashoffset="-80" strokeWidth="4"></circle>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center flex-col">
                <span className="font-mono font-bold text-sm text-[#1a1c1e]">Total</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#022448]"></div>
                  <span className="text-sm text-[#1a1c1e]">Gaji &amp; Honor</span>
                </div>
                <span className="text-sm font-bold font-mono">45%</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#16677a]"></div>
                  <span className="text-sm text-[#1a1c1e]">Logistik Dapur</span>
                </div>
                <span className="text-sm font-bold font-mono">35%</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#8cd1e6]"></div>
                  <span className="text-sm text-[#1a1c1e]">Sarana &amp; Prasarana</span>
                </div>
                <span className="text-sm font-bold font-mono">20%</span>
              </div>
            </div>
          </div>
        </div>
      </main>


    </div>
  )
}
