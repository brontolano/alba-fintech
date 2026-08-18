"use client"

import { useState, useTransition, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Users, Building2, Plus, Trash2, Edit3, ArrowRight,
  ShieldAlert, ShieldCheck, X, Search, Layers,
  Globe, Palette, Key, CheckCircle2, AlertCircle,
} from "lucide-react"

type TenantRow = {
  id: number
  name: string
  appName: string
  primaryColor: string
  secondaryColor: string
  subdomain: string | null
  domain: string | null
  activeModules: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  _count: { users: number; units: number }
}

type UserRow = {
  id: number
  name: string
  email: string
  role: string
  unitId: number | null
  tenantId: number | null
  isActive: boolean
  createdAt: string
  unitName: string
  unitType: string
  retailModuleEnabled: boolean
  tenantName: string
}

type UnitRow = {
  id: number
  tenantId: number
  name: string
  type: string
  retailEnabled: boolean
  description: string | null
  balance: number
  createdAt: string
  updatedAt: string
  tenantName: string
  _count: { users: number; transactions: number }
}

type Stats = {
  totalUsers: number
  totalUnits: number
  totalTenants: number
  totalTransactions: number
  totalAuditLogs: number
}

const ROLES = ["Superadmin", "Pimpinan", "Manager", "Staff"] as const
const UNIT_TYPES = ["Sederhana", "Retail"] as const
const MODULE_OPTIONS = [
  { key: "transactions", label: "Transaksi" },
  { key: "reconciliation", label: "Rekonsiliasi" },
  { key: "retail", label: "Retail (POS/Inventory)" },
  { key: "ai", label: "AI Assistant" },
  { key: "inventory", label: "Inventory" },
] as const

function roleBadge(role: string) {
  const map: Record<string, string> = {
    Superadmin: "bg-purple-100 text-purple-700",
    Pimpinan: "bg-blue-100 text-blue-700",
    Manager: "bg-emerald-100 text-emerald-700",
    Staff: "bg-gray-100 text-gray-700",
  }
  return map[role] || "bg-gray-100 text-gray-700"
}

function moduleBadge(key: string) {
  const m = MODULE_OPTIONS.find(o => o.key === key)
  return m ? m.label : key
}

export function SuperadminClient({
  initialTenants,
  initialUsers,
  initialUnits,
  stats,
}: {
  initialTenants: TenantRow[]
  initialUsers: UserRow[]
  initialUnits: UnitRow[]
  stats: Stats
}) {
  const router = useRouter()
  const [tenants, setTenants] = useState<TenantRow[]>(initialTenants)
  const [users, setUsers] = useState<UserRow[]>(initialUsers)
  const [units, setUnits] = useState<UnitRow[]>(initialUnits)
  const [activeTab, setActiveTab] = useState<"tenants" | "units" | "users" | "grouping">("grouping")
  const [search, setSearch] = useState("")
  const [, startTransition] = useTransition()

  const [editingTenant, setEditingTenant] = useState<TenantRow | null>(null)
  const [showTenantForm, setShowTenantForm] = useState(false)
  const [editingUser, setEditingUser] = useState<UserRow | null>(null)
  const [showUnitForm, setShowUnitForm] = useState(false)
  const [editingUnit, setEditingUnit] = useState<UnitRow | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ------- Tenant CRUD -------
  async function saveTenant(payload: Partial<TenantRow> & { name: string; appName: string }) {
    setBusy(true)
    setError(null)
    try {
      const url = editingTenant ? `/api/tenants/${editingTenant.id}` : `/api/tenants`
      const res = await fetch(url, {
        method: editingTenant ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      const data = await res.json()
      if (editingTenant) {
        setTenants((prev) => prev.map((t) => (t.id === editingTenant.id ? data : t)))
      } else {
        setTenants((prev) => [...prev, data])
      }
      setShowTenantForm(false)
      setEditingTenant(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan tenant")
    } finally {
      setBusy(false)
    }
  }

  async function deleteTenant(t: TenantRow) {
    if (!confirm(`Hapus tenant "${t.name}"? Semua unit, user, dan data terkait akan TERHAPUS PERMANEN.`)) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/tenants/${t.id}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      setTenants((prev) => prev.filter((x) => x.id !== t.id))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menghapus tenant")
    } finally {
      setBusy(false)
    }
  }

  // ------- Unit CRUD -------
  async function saveUnit(payload: Partial<UnitRow> & { name: string; type: string; tenantId: number }) {
    setBusy(true)
    setError(null)
    try {
      const url = editingUnit ? `/api/units/${editingUnit.id}` : `/api/units`
      const res = await fetch(url, {
        method: editingUnit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      const data = await res.json()
      if (editingUnit) {
        setUnits((prev) => prev.map((u) => (u.id === editingUnit.id ? data : u)))
      } else {
        setUnits((prev) => [...prev, data])
      }
      setShowUnitForm(false)
      setEditingUnit(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan unit")
    } finally {
      setBusy(false)
    }
  }

  async function deleteUnit(u: UnitRow) {
    if (!confirm(`Hapus unit "${u.name}"? User yang masih terikat tidak akan terhapus.`)) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/units/${u.id}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      setUnits((prev) => prev.filter((x) => x.id !== u.id))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menghapus unit")
    } finally {
      setBusy(false)
    }
  }

  // ------- User CRUD (edit + delete) -------
  async function saveUser(payload: Partial<UserRow> & { id?: number }) {
    if (!payload.id) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/users/${payload.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      const data = await res.json()
      setUsers((prev) => prev.map((u) => (u.id === payload.id ? data : u)))
      setEditingUser(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengupdate user")
    } finally {
      setBusy(false)
    }
  }

  async function deleteUser(u: UserRow) {
    if (!confirm(`Hapus user "${u.name}" (${u.email})? Data terkait akan ikut terhapus.`)) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/users/${u.id}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      setUsers((prev) => prev.filter((x) => x.id !== u.id))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menghapus user")
    } finally {
      setBusy(false)
    }
  }

  // ------- Grouping (Manager → Staff per unit per tenant) -------
  const grouping = useMemo(() => {
    const byUnit = new Map<number, { manager: UserRow | null; staff: UserRow[] }>()
    for (const u of users) {
      if (u.role !== "Manager" && u.role !== "Staff") continue
      if (!u.unitId) continue
      const entry = byUnit.get(u.unitId) || { manager: null, staff: [] }
      if (u.role === "Manager") entry.manager = u
      else entry.staff.push(u)
      byUnit.set(u.unitId, entry)
    }
    return units.map((unit) => {
      const g = byUnit.get(unit.id) || { manager: null, staff: [] }
      return { unit, manager: g.manager, staff: g.staff }
    })
  }, [users, units])

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users
    const q = search.toLowerCase()
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q) ||
        u.unitName.toLowerCase().includes(q) ||
        u.tenantName.toLowerCase().includes(q)
    )
  }, [users, search])

  const filteredUnits = useMemo(() => {
    if (!search.trim()) return units
    const q = search.toLowerCase()
    return units.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.type.toLowerCase().includes(q) ||
        u.tenantName.toLowerCase().includes(q)
    )
  }, [units, search])

  const filteredTenants = useMemo(() => {
    if (!search.trim()) return tenants
    const q = search.toLowerCase()
    return tenants.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.appName.toLowerCase().includes(q) ||
        t.subdomain?.toLowerCase().includes(q) ||
        t.domain?.toLowerCase().includes(q)
    )
  }, [tenants, search])

  return (
    <div className="min-h-screen bg-[#faf9fc] text-[#1a1c1e] font-sans pb-24">
      {/* Header */}
      <header className="bg-white border-b border-[#eeedf1] px-8 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-[#022448] text-white flex items-center justify-center font-bold text-lg">
            SA
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#022448]">Superadmin Command Center</h1>
            <p className="text-xs text-[#43474e]">White-Label: Tenants • Units • Users • Grouping</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="border border-[#dad6de] px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#f4f3f7]"
          >
            Executive View
          </Link>
          <button
            onClick={() => startTransition(() => router.refresh())}
            className="bg-[#022448] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-90"
          >
            Refresh
          </button>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto p-8 space-y-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)}>
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-[#eeedf1] shadow-sm">
            <p className="text-xs text-[#43474e] uppercase font-bold tracking-wider">Total Tenants</p>
            <p className="text-3xl font-extrabold text-[#022448] mt-2">{stats.totalTenants}</p>
            <p className="text-xs text-emerald-600 mt-1">Active brands</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-[#eeedf1] shadow-sm">
            <p className="text-xs text-[#43474e] uppercase font-bold tracking-wider">Total Users</p>
            <p className="text-3xl font-extrabold text-[#022448] mt-2">{stats.totalUsers}</p>
            <p className="text-xs text-emerald-600 mt-1">Active accounts</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-[#eeedf1] shadow-sm">
            <p className="text-xs text-[#43474e] uppercase font-bold tracking-wider">Managed Units</p>
            <p className="text-3xl font-extrabold text-[#022448] mt-2">{stats.totalUnits}</p>
            <p className="text-xs text-emerald-600 mt-1">Unit aktif</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-[#eeedf1] shadow-sm">
            <p className="text-xs text-[#43474e] uppercase font-bold tracking-wider">Total Transaksi</p>
            <p className="text-3xl font-extrabold text-[#022448] mt-2">{stats.totalTransactions}</p>
            <p className="text-xs text-emerald-600 mt-1">Recorded</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-[#eeedf1] shadow-sm">
            <p className="text-xs text-[#43474e] uppercase font-bold tracking-wider">Audit Logs</p>
            <p className="text-3xl font-extrabold text-[#022448] mt-2">{stats.totalAuditLogs}</p>
            <p className="text-xs text-emerald-600 mt-1">Activity tracking</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 border-b border-[#eeedf1] overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTab("tenants")}
            className={`px-4 py-3 text-sm font-bold flex items-center gap-2 border-b-2 whitespace-nowrap ${
              activeTab === "tenants"
                ? "border-[#022448] text-[#022448]"
                : "border-transparent text-[#43474e] hover:text-[#022448]"
            }`}
          >
            <Globe className="w-4 h-4" /> Tenants (White-Label)
          </button>
          <button
            onClick={() => setActiveTab("grouping")}
            className={`px-4 py-3 text-sm font-bold flex items-center gap-2 border-b-2 whitespace-nowrap ${
              activeTab === "grouping"
                ? "border-[#022448] text-[#022448]"
                : "border-transparent text-[#43474e] hover:text-[#022448]"
            }`}
          >
            <Layers className="w-4 h-4" /> Grouping Manager → Staff
          </button>
          <button
            onClick={() => setActiveTab("units")}
            className={`px-4 py-3 text-sm font-bold flex items-center gap-2 border-b-2 whitespace-nowrap ${
              activeTab === "units"
                ? "border-[#022448] text-[#022448]"
                : "border-transparent text-[#43474e] hover:text-[#022448]"
            }`}
          >
            <Building2 className="w-4 h-4" /> Manajemen Unit (Simple + Retail)
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`px-4 py-3 text-sm font-bold flex items-center gap-2 border-b-2 whitespace-nowrap ${
              activeTab === "users"
                ? "border-[#022448] text-[#022448]"
                : "border-transparent text-[#43474e] hover:text-[#022448]"
            }`}
          >
            <Users className="w-4 h-4" /> Manajemen User
          </button>
        </div>

        {/* Tab: Tenants */}
        {activeTab === "tenants" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#022448] flex items-center gap-2">
                <Globe className="w-5 h-5" /> CRUD Tenant (White-Label Brand)
              </h2>
              <button
                onClick={() => {
                  setEditingTenant(null)
                  setShowTenantForm(true)
                }}
                className="bg-[#022448] text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 hover:opacity-90"
              >
                <Plus className="w-4 h-4" /> Tambah Tenant
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-[#eeedf1] overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-[#f4f3f7] text-xs uppercase text-[#43474e]">
                  <tr>
                    <th className="py-3 px-4">Nama Organisasi</th>
                    <th className="py-3 px-4">App Name</th>
                    <th className="py-3 px-4">Subdomain</th>
                    <th className="py-3 px-4">Custom Domain</th>
                    <th className="py-3 px-4">Warna</th>
                    <th className="py-3 px-4">Modul Aktif</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">User / Unit</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eeedf1] text-sm">
                  {filteredTenants.map((t) => (
                    <tr key={t.id} className="hover:bg-[#faf9fc]">
                      <td className="py-3 px-4 font-bold text-[#022448]">{t.name}</td>
                      <td className="py-3 px-4">{t.appName}</td>
                      <td className="py-3 px-4">
                        {t.subdomain ? (
                          <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{t.subdomain}.alba.app</span>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {t.domain ? (
                          <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{t.domain}</span>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full border" style={{ backgroundColor: t.primaryColor }} title="Primary" />
                          <div className="w-6 h-6 rounded-full border" style={{ backgroundColor: t.secondaryColor }} title="Secondary" />
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {t.activeModules.split(",").map((m) => (
                            <span key={m} className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded">
                              {moduleBadge(m)}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${t.isActive ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                          {t.isActive ? "Aktif" : "Non-Aktif"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[#43474e]">
                        {t._count.users} user / {t._count.units} unit
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            setEditingTenant(t)
                            setShowTenantForm(true)
                          }}
                          className="text-blue-600 hover:bg-blue-50 p-1.5 rounded-lg mr-1"
                          title="Edit"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteTenant(t)}
                          className="text-red-600 hover:bg-red-50 p-1.5 rounded-lg"
                          title="Hapus"
                          disabled={busy}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredTenants.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-[#43474e]">
                        Belum ada tenant. Klik "Tambah Tenant".
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab: Grouping */}
        {activeTab === "grouping" && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-[#022448] flex items-center gap-2">
              <Layers className="w-5 h-5" /> Struktur Unit: Manager membawahi beberapa Staff (per Tenant)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {grouping.map(({ unit, manager, staff }) => (
                <div key={unit.id} className="bg-white rounded-2xl border border-[#eeedf1] p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-[#022448]">{unit.name}</h3>
                      <p className="text-xs text-[#43474e]">
                        {unit.tenantName} • {unit.type} • Retail: {unit.retailEnabled ? "Aktif" : "Non-Aktif"}
                      </p>
                    </div>
                    <span className="text-xs font-semibold px-3 py-1 bg-[#f4f3f7] rounded-full text-[#022448]">
                      {(manager ? 1 : 0) + staff.length} Personel
                    </span>
                  </div>

                  <div className="mb-4">
                    <p className="text-xs font-bold text-[#43474e] uppercase tracking-wider mb-2">
                      Unit Manager
                    </p>
                    {manager ? (
                      <div className="bg-[#f4f3f7] p-3 rounded-xl border border-[#dad6de] flex items-center justify-between">
                        <div>
                          <p className="text-sm font-bold text-[#1a1c1e]">{manager.name}</p>
                          <p className="text-xs text-[#43474e]">{manager.email} • {manager.tenantName}</p>
                        </div>
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      </div>
                    ) : (
                      <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-xs text-amber-800">
                        Belum ada Manager ditugaskan.
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="text-xs font-bold text-[#43474e] uppercase tracking-wider mb-2">
                      Staff ({staff.length})
                    </p>
                    {staff.length > 0 ? (
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {staff.map((s) => (
                          <div
                            key={s.id}
                            className="bg-white border border-[#eeedf1] p-2.5 rounded-xl flex items-center justify-between"
                          >
                            <div>
                              <p className="text-xs font-bold text-[#1a1c1e]">{s.name}</p>
                              <p className="text-[10px] text-[#43474e]">{s.email} • {s.tenantName}</p>
                            </div>
                            <span className="text-[10px] px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded font-semibold">
                              Staff
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-[#43474e] italic">Belum ada staff di unit ini</p>
                    )}
                  </div>
                </div>
              ))}
              {grouping.length === 0 && (
                <div className="col-span-3 bg-white rounded-2xl border border-[#eeedf1] p-12 text-center">
                  <Layers className="w-12 h-12 mx-auto text-[#dad6de] mb-4" />
                  <p className="text-[#43474e]">Belum ada struktur Manager → Staff.</p>
                  <p className="text-xs text-[#43474e] mt-1">Tambah user dengan role Manager/Staff di tab Users.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab: Units */}
        {activeTab === "units" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#022448] flex items-center gap-2">
                <Building2 className="w-5 h-5" /> CRUD Unit (Sederhana + Retail) per Tenant
              </h2>
              <button
                onClick={() => {
                  setEditingUnit(null)
                  setShowUnitForm(true)
                }}
                className="bg-[#022448] text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 hover:opacity-90"
              >
                <Plus className="w-4 h-4" /> Tambah Unit
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-[#eeedf1] overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-[#f4f3f7] text-xs uppercase text-[#43474e]">
                  <tr>
                    <th className="py-3 px-4">Tenant</th>
                    <th className="py-3 px-4">Nama Unit</th>
                    <th className="py-3 px-4">Tipe</th>
                    <th className="py-3 px-4">Retail Module</th>
                    <th className="py-3 px-4">Saldo</th>
                    <th className="py-3 px-4">Deskripsi</th>
                    <th className="py-3 px-4">User / Transaksi</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eeedf1] text-sm">
                  {filteredUnits.map((u) => (
                    <tr key={u.id} className="hover:bg-[#faf9fc]">
                      <td className="py-3 px-4 font-semibold text-[#022448]">{u.tenantName}</td>
                      <td className="py-3 px-4 font-bold text-[#1a1c1e]">{u.name}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                            u.type === "Retail"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {u.type}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {u.retailEnabled ? (
                          <span className="text-xs text-emerald-600 font-bold">Aktif</span>
                        ) : (
                          <span className="text-xs text-gray-400">Tidak</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-right text-[#022448]">
                        Rp {u.balance.toLocaleString("id-ID", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-[#43474e]">{u.description || "—"}</td>
                      <td className="py-3 px-4 text-[#43474e]">{u._count.users} / {u._count.transactions}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            setEditingUnit(u)
                            setShowUnitForm(true)
                          }}
                          className="text-blue-600 hover:bg-blue-50 p-1.5 rounded-lg mr-1"
                          title="Edit"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteUnit(u)}
                          className="text-red-600 hover:bg-red-50 p-1.5 rounded-lg"
                          title="Hapus"
                          disabled={busy}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredUnits.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-[#43474e]">
                        Belum ada unit. Klik "Tambah Unit".
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab: Users */}
        {activeTab === "users" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#43474e]" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari nama, email, role, unit, tenant..."
                  className="w-full pl-10 pr-4 py-2 border border-[#dad6de] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#022448]"
                />
              </div>
              <Link
                href="/users"
                className="bg-[#022448] text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 hover:opacity-90"
              >
                <Plus className="w-4 h-4" /> Tambah User
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="bg-white rounded-2xl border border-[#eeedf1] overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-[#f4f3f7] text-xs uppercase text-[#43474e]">
                  <tr>
                    <th className="py-3 px-4">Tenant</th>
                    <th className="py-3 px-4">Nama</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Unit</th>
                    <th className="py-3 px-4">Tipe Unit</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eeedf1] text-sm">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-[#faf9fc]">
                      <td className="py-3 px-4 font-semibold text-[#022448]">{u.tenantName}</td>
                      <td className="py-3 px-4 font-bold text-[#1a1c1e]">{u.name}</td>
                      <td className="py-3 px-4 text-[#43474e]">{u.email}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${roleBadge(u.role)}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-[#022448]">{u.unitName}</td>
                      <td className="py-3 px-4 text-[#43474e]">{u.unitType}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${u.isActive ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                          {u.isActive ? "Aktif" : "Non-Aktif"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setEditingUser(u)}
                          className="text-blue-600 hover:bg-blue-50 p-1.5 rounded-lg mr-1"
                          title="Edit"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteUser(u)}
                          className="text-red-600 hover:bg-red-50 p-1.5 rounded-lg"
                          title="Hapus"
                          disabled={busy}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-[#43474e]">
                        Tidak ada user cocok dengan pencarian.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-[#43474e] flex items-center gap-1">
              <ShieldAlert className="w-3 h-3" /> Hanya Superadmin yang bisa menghapus user. Data
              terkait (transaksi, audit log, notifikasi) akan ikut terhapus.
            </p>
          </div>
        )}

      </main>

      {/* Tenant Form Modal */}
      {showTenantForm && (
        <TenantForm
          initial={editingTenant}
          busy={busy}
          onCancel={() => {
            setShowTenantForm(false)
            setEditingTenant(null)
          }}
          onSave={saveTenant}
        />
      )}

      {/* Unit Form Modal */}
      {showUnitForm && (
        <UnitForm
          initial={editingUnit}
          tenants={tenants}
          busy={busy}
          onCancel={() => {
            setShowUnitForm(false)
            setEditingUnit(null)
          }}
          onSave={saveUnit}
        />
      )}

      {/* User Edit Modal */}
      {editingUser && (
        <UserEditForm
          initial={editingUser}
          units={units}
          tenants={tenants}
          busy={busy}
          onCancel={() => setEditingUser(null)}
          onSave={saveUser}
        />
      )}
    </div>
  )
}

// ------- Tenant Form -------
function TenantForm({
  initial,
  busy,
  onCancel,
  onSave,
}: {
  initial: TenantRow | null
  busy: boolean
  onCancel: () => void
  onSave: (p: { name: string; appName: string; primaryColor: string; secondaryColor: string; subdomain?: string; domain?: string; activeModules: string; isActive: boolean }) => void
}) {
  const [name, setName] = useState(initial?.name || "")
  const [appName, setAppName] = useState(initial?.appName || "")
  const [primaryColor, setPrimaryColor] = useState(initial?.primaryColor || "#1E3A5F")
  const [secondaryColor, setSecondaryColor] = useState(initial?.secondaryColor || "#10B981")
  const [subdomain, setSubdomain] = useState(initial?.subdomain || "")
  const [domain, setDomain] = useState(initial?.domain || "")
  const [activeModules, setActiveModules] = useState(initial?.activeModules || "transactions,reconciliation")
  const [isActive, setIsActive] = useState(initial?.isActive !== false)

  const toggleModule = (key: string) => {
    const arr = activeModules.split(",").filter(Boolean)
    if (arr.includes(key)) setActiveModules(arr.filter((k) => k !== key).join(","))
    else setActiveModules([...arr, key].join(","))
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between sticky top-0 bg-white pb-4 border-b border-[#eeedf1] z-10">
          <h3 className="text-lg font-bold text-[#022448]">
            {initial ? "Edit Tenant (White-Label Brand)" : "Tambah Tenant Baru"}
          </h3>
          <button onClick={onCancel}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            onSave({ name, appName, primaryColor, secondaryColor, subdomain: subdomain || undefined, domain: domain || undefined, activeModules, isActive })
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-[#43474e] uppercase">Nama Organisasi *</label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-[#dad6de] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#022448]"
                placeholder="cth: Pesantren Al-Basyariyyah"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-[#43474e] uppercase">App Name *</label>
              <input
                required
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-[#dad6de] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#022448]"
                placeholder="cth: ALBA Finance"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-[#43474e] uppercase">Primary Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-10 h-10 rounded border border-[#dad6de]"
                />
                <input
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="flex-1 px-3 py-2 border border-[#dad6de] rounded-xl text-sm font-mono"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-[#43474e] uppercase">Secondary Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="w-10 h-10 rounded border border-[#dad6de]"
                />
                <input
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="flex-1 px-3 py-2 border border-[#dad6de] rounded-xl text-sm font-mono"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-[#43474e] uppercase">Subdomain (opsional)</label>
              <div className="flex items-center gap-2">
                <input
                  value={subdomain}
                  onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  className="flex-1 px-3 py-2 border border-[#dad6de] rounded-xl text-sm"
                  placeholder="albasyariyyah"
                />
                <span className="text-gray-400 text-sm">.alba.app</span>
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-[#43474e] uppercase">Custom Domain (opsional)</label>
              <input
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-[#dad6de] rounded-xl text-sm"
                placeholder="alba.brontolano.com"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-[#43474e] uppercase">Modul Aktif</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {MODULE_OPTIONS.map((m) => (
                <label key={m.key} className="flex items-center gap-2 px-3 py-1.5 border rounded-xl text-sm cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={activeModules.split(",").includes(m.key)}
                    onChange={() => toggleModule(m.key)}
                    className="w-4 h-4"
                  />
                  <span>{m.label}</span>
                </label>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4"
            />
            <span>Tenant Aktif</span>
          </label>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#eeedf1]">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-[#dad6de] rounded-xl text-sm font-semibold"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={busy}
              className="px-4 py-2 bg-[#022448] text-white rounded-xl text-sm font-semibold disabled:opacity-50"
            >
              {busy ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ------- Unit Form -------
function UnitForm({
  initial,
  tenants,
  busy,
  onCancel,
  onSave,
}: {
  initial: UnitRow | null
  tenants: TenantRow[]
  busy: boolean
  onCancel: () => void
  onSave: (p: { name: string; type: string; retailEnabled?: boolean; description?: string; tenantId: number }) => void
}) {
  const [name, setName] = useState(initial?.name || "")
  const [type, setType] = useState(initial?.type || "Sederhana")
  const [retailEnabled, setRetailEnabled] = useState(initial?.retailEnabled || false)
  const [description, setDescription] = useState(initial?.description || "")
  const [tenantId, setTenantId] = useState(initial?.tenantId || (tenants[0]?.id || 0))

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-[#022448]">
            {initial ? "Edit Unit" : "Tambah Unit"}
          </h3>
          <button onClick={onCancel}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            onSave({ name, type, retailEnabled, description, tenantId })
          }}
          className="space-y-3"
        >
          <div>
            <label className="text-xs font-bold text-[#43474e] uppercase">Tenant *</label>
            <select
              value={tenantId}
              onChange={(e) => setTenantId(Number(e.target.value))}
              required
              className="w-full mt-1 px-3 py-2 border border-[#dad6de] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#022448]"
            >
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.appName})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-[#43474e] uppercase">Nama Unit *</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full mt-1 px-3 py-2 border border-[#dad6de] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#022448]"
              placeholder="cth: Toko Buku"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-[#43474e] uppercase">Tipe Unit</label>
            <select
              value={type}
              onChange={(e) => {
                setType(e.target.value)
                if (e.target.value !== "Retail") setRetailEnabled(false)
              }}
              className="w-full mt-1 px-3 py-2 border border-[#dad6de] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#022448]"
            >
              {UNIT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={retailEnabled}
              disabled={type !== "Retail"}
              onChange={(e) => setRetailEnabled(e.target.checked)}
              className="w-4 h-4"
            />
            <span>Aktifkan Modul Retail (POS & Inventory)</span>
          </label>
          <div>
            <label className="text-xs font-bold text-[#43474e] uppercase">Deskripsi</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full mt-1 px-3 py-2 border border-[#dad6de] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#022448]"
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-[#dad6de] rounded-xl text-sm font-semibold"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={busy}
              className="px-4 py-2 bg-[#022448] text-white rounded-xl text-sm font-semibold disabled:opacity-50"
            >
              {busy ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ------- User Edit Form -------
function UserEditForm({
  initial,
  units,
  tenants,
  busy,
  onCancel,
  onSave,
}: {
  initial: UserRow
  units: UnitRow[]
  tenants: TenantRow[]
  busy: boolean
  onCancel: () => void
  onSave: (p: Partial<UserRow> & { id: number }) => void
}) {
  const [name, setName] = useState(initial.name)
  const [role, setRole] = useState(initial.role)
  const [unitId, setUnitId] = useState(initial.unitId || "")
  const [tenantId, setTenantId] = useState(initial.tenantId || tenants[0]?.id || "")
  const [unitType, setUnitType] = useState(initial.unitType)
  const [retailEnabled, setRetailEnabled] = useState(initial.retailModuleEnabled)
  const [isActive, setIsActive] = useState(initial.isActive)
  const [password, setPassword] = useState("")

  const selectedUnit = units.find(u => u.id === Number(unitId))
  const effectiveUnitType = selectedUnit?.type || unitType
  const effectiveRetailEnabled = selectedUnit?.retailEnabled || retailEnabled

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-[#022448]">Edit User</h3>
          <button onClick={onCancel}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            onSave({
              id: initial.id,
              name,
              role,
              unitId: unitId ? Number(unitId) : null,
              tenantId: tenantId ? Number(tenantId) : null,
              unitType: effectiveUnitType,
              retailModuleEnabled: effectiveRetailEnabled,
              isActive,
              ...(password ? { password } : {}),
            })
          }}
          className="space-y-3"
        >
          <div>
            <label className="text-xs font-bold text-[#43474e] uppercase">Tenant *</label>
            <select
              value={tenantId}
              onChange={(e) => setTenantId(Number(e.target.value))}
              required
              className="w-full mt-1 px-3 py-2 border border-[#dad6de] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#022448]"
            >
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.appName})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-[#43474e] uppercase">Nama *</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full mt-1 px-3 py-2 border border-[#dad6de] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#022448]"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-[#43474e] uppercase">Role *</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              required
              className="w-full mt-1 px-3 py-2 border border-[#dad6de] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#022448]"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-[#43474e] uppercase">Unit</label>
            <select
              value={unitId}
              onChange={(e) => setUnitId(e.target.value ? Number(e.target.value) : "")}
              className="w-full mt-1 px-3 py-2 border border-[#dad6de] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#022448]"
            >
              <option value="">All (cross-unit)</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.type}) — {u.tenantName}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-[#43474e] uppercase">Unit Type (auto)</label>
              <input
                value={effectiveUnitType}
                readOnly
                className="w-full mt-1 px-3 py-2 border border-[#dad6de] rounded-xl text-sm bg-gray-50"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-[#43474e] uppercase">Retail Module (auto)</label>
              <input
                value={effectiveRetailEnabled ? "Aktif" : "Tidak"}
                readOnly
                className="w-full mt-1 px-3 py-2 border border-[#dad6de] rounded-xl text-sm bg-gray-50"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4"
            />
            <span>User Aktif</span>
          </label>
          <div>
            <label className="text-xs font-bold text-[#43474e] uppercase">
              Reset Password (kosongkan jika tidak diubah)
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              className="w-full mt-1 px-3 py-2 border border-[#dad6de] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#022448]"
              placeholder="min. 6 karakter"
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#eeedf1]">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-[#dad6de] rounded-xl text-sm font-semibold"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={busy}
              className="px-4 py-2 bg-[#022448] text-white rounded-xl text-sm font-semibold disabled:opacity-50"
            >
              {busy ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}