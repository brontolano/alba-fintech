'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search } from 'lucide-react'

type ReportRow = {
  id: number
  unit: string
  category: string
  amount: number
  type: string
  status: string
  transactionDate: string
  method: string
  description: string | null
}

function formatRupiah(n: number): string {
  return `Rp ${n.toLocaleString('id-ID')}`
}

function statusColor(status: string): string {
  switch (status) {
    case 'Approved':
      return 'bg-emerald-100 text-emerald-800'
    case 'Pending':
      return 'bg-amber-100 text-amber-800'
    case 'Submitted':
      return 'bg-blue-100 text-blue-800'
    case 'Rejected':
      return 'bg-rose-100 text-rose-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

export default function ReportsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [rows, setRows] = useState<ReportRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  const role = session?.user?.role || ''
  const unit = session?.user?.unit || ''

  useEffect(() => {
    if (!session) return

    let cancelled = false

    async function load() {
      try {
        const res = await fetch('/api/transactions?report=1', { cache: 'no-store' })

        if (res.status === 401) {
          router.replace('/login')
          return
        }

        if (!res.ok) {
          setError('Gagal memuat laporan.')
          return
        }

        const data = (await res.json()) as ReportRow[]

        if (!cancelled) {
          setRows(data)
        }
      } catch {
        if (!cancelled) setError('Gagal memuat laporan.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [session, router])

  const filtered = search
    ? rows.filter(
        (r) =>
          r.category.toLowerCase().includes(search.toLowerCase()) ||
          r.unit.toLowerCase().includes(search.toLowerCase()) ||
          (r.description || '').toLowerCase().includes(search.toLowerCase()),
      )
    : rows

  const totals = rows.reduce(
    (acc, r) => {
      const amount = Number(r.amount) || 0
      if (r.type === 'Debit') acc.debit += amount
      else acc.kredit += amount
      return acc
    },
    { debit: 0, kredit: 0 },
  )

  const net = totals.debit - totals.kredit

  return (
    <div className="bg-background text-on-background font-body min-h-screen pb-28">
      <header className="w-full top-0 sticky bg-background dark:bg-on-primary-fixed z-40 transition-colors duration-200">
        <div className="flex justify-between items-center px-6 py-3 max-w-[1280px] mx-auto">
          <div className="flex items-center gap-3">
            <Link href="/profile" className="w-10 h-10 rounded-full bg-surface-variant flex items-center justify-center overflow-hidden font-bold text-primary hover:opacity-90 transition-opacity">
              {session?.user?.image ? (
                <img src={session.user.image} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span>{(session?.user?.name || 'AL').charAt(0).toUpperCase()}</span>
              )}
            </Link>
            <h1 className="font-semibold text-xl text-primary dark:text-primary-fixed">ALBA Finance</h1>
          </div>
          <button aria-label="Notifications" className="text-on-surface-variant dark:text-outline-variant hover:bg-surface-container-low dark:hover:bg-primary-container p-2 rounded-full transition-colors duration-200 relative">
            <span className="material-symbols-outlined">notifications</span>
            <span className="absolute top-2 right-2 w-2 h-2 bg-[#ba1a1a] rounded-full border border-white"></span>
          </button>
        </div>
      </header>

      <main className="px-6 py-6 max-w-[1280px] mx-auto w-full">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end mb-6 gap-4">
          <div>
            <h2 className="text-3xl font-bold text-on-surface mb-2">Laporan</h2>
            <p className="text-base text-on-surface-variant">
              {role === 'Pimpinan' ? 'Ringkasan keuangan lintas unit.' : role === 'Manager' ? `Ringkasan keuangan unit ${unit}.` : 'Ringkasan transaksi Anda.'}
            </p>
          </div>
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari kategori/unit..."
              className="w-full bg-white border border-[#c4c6cf] rounded-full pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#022448]"
            />
          </div>
        </div>

        {error ? (
          <div className="bg-rose-50 text-rose-700 border border-rose-200 rounded-2xl p-4 text-sm mb-6">{error}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#eeedf1]">
                <p className="text-xs text-[#43474e] mb-1">Pemasukan</p>
                <p className="text-xl font-bold text-[#1a1c1e] font-mono">{formatRupiah(totals.debit)}</p>
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#eeedf1]">
                <p className="text-xs text-[#43474e] mb-1">Pengeluaran</p>
                <p className="text-xl font-bold text-[#1a1c1e] font-mono">{formatRupiah(totals.kredit)}</p>
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#eeedf1]">
                <p className="text-xs text-[#43474e] mb-1">Saldo</p>
                <p className="text-xl font-bold text-[#1a1c1e] font-mono">{formatRupiah(net)}</p>
              </div>
            </div>

            <div className="md:col-span-3 bg-white rounded-2xl shadow-sm border border-[#eeedf1]">
              <div className="px-4 py-3 border-b border-[#eeedf1]">
                <h3 className="text-base font-bold text-[#1a1c1e]">Transaksi Terkini</h3>
              </div>
              {loading ? (
                <div className="p-6 text-sm text-[#43474e]">Memuat data...</div>
              ) : filtered.length === 0 ? (
                <div className="p-6 text-sm text-[#43474e]">Belum ada transaksi.</div>
              ) : (
                <div className="divide-y divide-[#eeedf1]">
                  {filtered.map((item) => (
                    <div key={item.id} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-[#1a1c1e]">{item.category}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusColor(item.status)}`}>{item.status}</span>
                        </div>
                        <p className="text-xs text-[#43474e]">{item.unit} • {item.method}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-[#1a1c1e] font-mono">{formatRupiah(item.amount)}</p>
                        <p className="text-[11px] text-[#43474e]">{new Date(item.transactionDate).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
