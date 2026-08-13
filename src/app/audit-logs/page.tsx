'use client'

import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { Search, Filter, Download } from "lucide-react"
import { useState, useEffect } from "react"

function formatDateTime(d: string) {
  return new Date(d).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatAction(action: string) {
  const map: Record<string, { label: string; color: string }> = {
    create: { label: "Buat", color: "bg-emerald-100 text-emerald-800" },
    update: { label: "Ubah", color: "bg-blue-100 text-blue-800" },
    delete: { label: "Hapus", color: "bg-rose-100 text-rose-800" },
    approve: { label: "Setujui", color: "bg-emerald-100 text-emerald-800" },
    reject: { label: "Tolak", color: "bg-rose-100 text-rose-800" },
    config_change: { label: "Konfigurasi", color: "bg-amber-100 text-amber-800" },
    login: { label: "Login", color: "bg-slate-100 text-slate-800" },
  }
  return map[action] || { label: action, color: "bg-gray-100 text-gray-800" }
}

export default async function AuditLogsPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  if (session.user.role !== "Pimpinan") {
    redirect("/dashboard")
  }

  return (
    <AuditLogsClient />
  )
}

function AuditLogsClient() {
  const [logs, setLogs] = useState<{
    id: number
    actorId: number
    action: string
    entity: string
    entityId: number
    metadata: string | null
    ip: string | null
    userAgent: string | null
    createdAt: string
    actor: { id: number; name: string; role: string; unit: string } | null
  }[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [actionFilter, setActionFilter] = useState("")

  useEffect(() => {
    fetch("/api/audit-logs")
      .then((r) => r.json())
      .then((data) => {
        setLogs(data)
        setLoading(false)
      })
  }, [])

  const filtered = logs.filter((log) => {
    const matchSearch =
      search === "" ||
      log.actor?.name?.toLowerCase().includes(search.toLowerCase()) ||
      log.entity?.toLowerCase().includes(search.toLowerCase()) ||
      log.action?.toLowerCase().includes(search.toLowerCase())
    const matchAction = actionFilter === "" || log.action === actionFilter
    return matchSearch && matchAction
  })

  const actions = [...new Set(logs.map((l) => l.action))]

  return (
    <div className="min-h-screen bg-[#faf9fc] text-[#1a1c1e] pb-24 font-sans">
      <header className="sticky top-0 bg-white z-40 border-b border-[#eeedf1] flex items-center justify-between px-4 py-3">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#022448]">arrow_back</span>
          <h1 className="text-lg font-bold text-[#022448]">Audit Log</h1>
        </Link>
      </header>

      <main className="max-w-[1280px] mx-auto px-4 py-4 flex flex-col gap-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#eeedf1] flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex-1 flex gap-2">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#43474e] w-4 h-4" />
              <input
                type="text"
                placeholder="Cari aktor, entitas, aksi..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[#f4f3f7] rounded-2xl px-10 py-2 pl-10 text-sm"
              />
            </div>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="bg-[#f4f3f7] rounded-2xl px-4 py-2 text-sm"
            >
              <option value="">Semua Aksi</option>
              {actions.map((a) => (
                <option key={a} value={a}>
                  {formatAction(a).label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-[#eeedf1] overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-[#43474e]">Memuat...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-[#43474e]">Tidak ada data audit log</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#faf9fc] border-b border-[#eeedf1]">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-[#43474e]">Waktu</th>
                    <th className="px-4 py-3 text-left font-semibold text-[#43474e]">Aktor</th>
                    <th className="px-4 py-3 text-left font-semibold text-[#43474e]">Aksi</th>
                    <th className="px-4 py-3 text-left font-semibold text-[#43474e]">Entitas</th>
                    <th className="px-4 py-3 text-left font-semibold text-[#43474e]">Detail</th>
                    <th className="px-4 py-3 text-left font-semibold text-[#43474e]">IP / UA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eeedf1]">
                  {filtered.map((log) => {
                    const actionInfo = formatAction(log.action)
                    return (
                      <tr key={log.id} className="hover:bg-[#faf9fc]">
                        <td className="px-4 py-3 text-[#43474e] whitespace-nowrap">
                          {formatDateTime(log.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-[#1a1c1e]">{log.actor?.name || "—"}</div>
                          <div className="text-xs text-[#43474e]">
                            {log.actor?.role} • {log.actor?.unit}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${actionInfo.color}`}>
                            {actionInfo.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[#1a1c1e]">{log.entity}</td>
                        <td className="px-4 py-3 text-[#43474e] max-w-xs truncate">
                          {log.metadata || "—"}
                        </td>
                        <td className="px-4 py-3 text-[11px] text-[#74777f] max-w-xs truncate">
                          {log.ip || "—"} / {log.userAgent ? "UA" : "—"}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}