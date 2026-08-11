'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import type { TxStatus } from '@/lib/enums'
import Link from 'next/link'

type ApprovalItem = {
  id: number
  unit: string
  title: string
  amount: number
  date: string
  icon: string
  status: TxStatus
  description: string | null
  type: string
  method: string
}

function formatRupiah(n: number): string {
  return `Rp ${n.toLocaleString('id-ID')}`
}

function unitIcon(unit: string): string {
  switch (unit) {
    case 'Kantor':
      return 'business'
    case 'Kantin':
      return 'restaurant'
    case 'Koperasi':
      return 'local_mall'
    default:
      return 'receipt_long'
  }
}

export default function ApprovalsPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [approvals, setApprovals] = useState<ApprovalItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const role = session?.user?.role || ''
  const unit = session?.user?.unit || ''
  const enabled = (session?.user as { retailModuleEnabled?: boolean } | undefined)?.retailModuleEnabled === true

  useEffect(() => {
    if (!session) {
      router.replace('/login')
      return
    }

    let cancelled = false

    async function loadApprovals() {
      const response = await fetch('/api/approvals', { cache: 'no-store' })

      if (response.status === 401) {
        router.replace('/login')
        return
      }

      if (!response.ok) {
        if (!cancelled) setError('Gagal memuat data persetujuan.')
        return
      }

      const rows = (await response.json()) as Array<{
        id: number
        unit: string
        category: string
        amount: number
        transactionDate: string
        status: TxStatus
        description: string | null
        type: string
        method: string
      }>

      if (!cancelled) {
        setApprovals(
          rows.map((item) => ({
            id: item.id,
            unit: item.unit,
            title: item.category,
            amount: Number(item.amount),
            date: new Date(item.transactionDate).toLocaleString('id-ID', {
              dateStyle: 'medium',
              timeStyle: 'short',
            }) + ' WIB',
            icon: unitIcon(item.unit),
            status: item.status,
            description: item.description,
            type: item.type,
            method: item.method,
          })),
        )
        setLoading(false)
      }
    }

    void loadApprovals()
    return () => {
      cancelled = true
    }
  }, [session, router])

  if (!session) return null

  return (
    <div className="bg-background text-on-background font-body min-h-screen flex flex-col pb-28">
      {/* TopAppBar */}
      <header className="w-full top-0 sticky bg-background dark:bg-on-primary-fixed z-40 transition-colors duration-200">
        <div className="flex justify-between items-center px-6 py-3 max-w-[1280px] mx-auto">
          <div className="flex items-center gap-3">
            <Link href="/profile" className="w-10 h-10 rounded-full bg-surface-variant flex items-center justify-center overflow-hidden font-bold text-primary hover:opacity-90 transition-opacity">
              {session.user.image ? (
                <img src={session.user.image} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span>{(session.user.name || 'AL').charAt(0).toUpperCase()}</span>
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

      {/* Main Content */}
      <main className="flex-grow px-6 py-6 max-w-[1280px] mx-auto w-full">
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-on-surface mb-2">Persetujuan</h2>
          <div className="inline-flex items-center gap-2 bg-[#a2e7fd]/30 px-3 py-2 rounded-lg">
            <span className="material-symbols-outlined text-[#16677a]" style={{ fontVariationSettings: "'FILL' 1" }}>info</span>
            <p className="text-sm font-medium text-on-surface-variant">
              {loading
                ? 'Memuat data persetujuan...'
                : `Ada ${approvals.length} transaksi menunggu persetujuan Anda`}
            </p>
          </div>
        </div>

        {error ? (
          <div className="bg-rose-50 text-rose-700 border border-rose-200 rounded-2xl p-4 text-sm">{error}</div>
        ) : approvals.length === 0 && !loading ? (
          <div className="bg-white rounded-2xl border border-dashed border-[#c4c6cf] p-10 text-center text-sm text-[#43474e]">
            Tidak ada transaksi yang perlu disetujui saat ini.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {approvals.map((item) => (
              <ApprovalCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function ApprovalCard({ item }: { item: ApprovalItem }) {
  const [loading, setLoading] = useState(false)

  const handleAction = async (action: 'approve' | 'reject') => {
    setLoading(true)
    try {
      const res = await fetch('/api/approvals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId: item.id, action }),
      })

      if (res.ok) {
        window.location.reload()
      } else {
        const err = await res.json().catch(() => ({ error: 'Gagal memproses persetujuan' }))
        alert(err.error || 'Gagal memproses persetujuan')
      }
    } catch (e) {
      alert('Error: ' + ((e as Error).message || e))
    } finally {
      setLoading(false)
    }
  }

  const statusLabel = item.status === 'Submitted' ? 'Menunggu Manager' : 'Menunggu Pimpinan'
  const statusColor = item.status === 'Submitted' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'

  return (
    <article className="bg-white rounded-2xl p-4 shadow-sm border border-[#e3e2e6] flex flex-col gap-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div>
          <span className="inline-block px-2.5 py-1 bg-[#e3e2e6] text-[#43474e] rounded-full text-xs font-medium mb-2">{item.unit}</span>
          <h3 className="text-lg font-bold text-[#1a1c1e]">{item.title}</h3>
          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${statusColor} mt-1`}>{statusLabel}</span>
        </div>
        <div className="w-10 h-10 rounded-full bg-[#f4f3f7] flex items-center justify-center text-[#022448]">
          <span className="material-symbols-outlined">{item.icon}</span>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-[#43474e]">Nominal Transaksi</span>
        <span className="font-mono text-2xl text-[#022448] font-bold">{formatRupiah(item.amount)}</span>
      </div>
      <div className="flex items-center gap-2 text-[#43474e]">
        <span className="material-symbols-outlined text-sm">calendar_today</span>
        <span className="text-xs">{item.date}</span>
      </div>
      <div className="flex gap-2 mt-auto pt-2">
        <button
          onClick={() => handleAction('reject')}
          disabled={loading}
          className="flex-1 py-2 px-4 rounded-2xl border-2 border-[#ba1a1a] text-[#ba1a1a] text-sm font-medium hover:bg-[#ffdad6]/30 transition-colors disabled:opacity-50"
        >
          Tolak
        </button>
        <button
          onClick={() => handleAction('approve')}
          disabled={loading}
          className="flex-1 py-2 px-4 rounded-2xl bg-[#022448] text-white text-sm font-medium hover:bg-[#1e3a5f] transition-colors shadow-sm disabled:opacity-50"
        >
          {loading ? 'Memproses...' : 'Setujui'}
        </button>
      </div>
    </article>
  )
}
