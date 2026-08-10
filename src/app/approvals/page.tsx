'use client'

import { useState, useEffect } from 'react'
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { redirect } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import type { User, TxStatus } from "@/lib/enums"

type ApprovalItem = {
  id: number
  unit: User["unit"]
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

function unitIcon(unit: User["unit"]): string {
  switch (unit) {
    case "Kantor":
      return "business"
    case "Kantin":
      return "restaurant"
    case "Koperasi":
      return "local_mall"
    default:
      return "receipt_long"
  }
}

export default function ApprovalsPage() {
  const [session, setSession] = useState<Awaited<ReturnType<typeof getServerSession>> | null>(null)
  const [approvals, setApprovals] = useState<ApprovalItem[]>([])

  useEffect(() => {
    getServerSession(authOptions).then((s) => {
      if (!s) {
        redirect('/login')
        return
      }
      setSession(s)

      const whereClause = s.user.role === "Manager"
        ? { OR: [{ status: "Submitted" as TxStatus }, { status: "Pending" as TxStatus }] }
        : { status: "Pending" as TxStatus }

      prisma.transaction.findMany({
        where: whereClause,
        orderBy: { transactionDate: "desc" },
      }).then((pending) => {
        const mapped: ApprovalItem[] = pending.map((t) => ({
          id: t.id,
          unit: t.unit as User["unit"],
          title: t.category,
          amount: Number(t.amount),
          date: new Date(t.transactionDate).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) + " WIB",
          icon: unitIcon(t.unit as User["unit"]),
          status: t.status as TxStatus,
          description: t.description,
          type: t.type,
          method: t.method,
        }))
        setApprovals(mapped)
      })
    })
  }, [])

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
            <p className="text-sm font-medium text-on-surface-variant">Ada {approvals.length} transaksi menunggu persetujuan Anda</p>
          </div>
        </div>

        {/* Approval Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {approvals.map((item) => (
            <ApprovalCard key={item.id} item={item} userRole={session.user.role} />
          ))}
        </div>
      </main>
    </div>
  )
}

function ApprovalCard({ item, userRole }: { item: ApprovalItem; userRole: string }) {
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
        alert('Gagal memproses persetujuan')
      }
    } catch (e) {
      alert('Error: ' + e)
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
