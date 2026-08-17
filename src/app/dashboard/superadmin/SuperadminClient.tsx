"use client"

import { useState, useTransition, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Users, Building2, Plus, Trash2, Edit3, ArrowRight,
  ShieldAlert, ShieldCheck, X, Search, Layers,
} from "lucide-react"

type UserRow = {
  id: number
  name: string
  email: string
  role: string
  unit: string
  unitType: string
  retailModuleEnabled: boolean
  createdAt: string
}

type UnitRow = {
  id: number
  name: string
  type: string
  retailModuleEnabled: boolean
  description: string | null
  createdAt: string
  updatedAt: string
}

type Stats = {
  totalUsers: number
  totalUnits: number
  totalTransactions: number
  totalAuditLogs: number
}

const ROLES = ["Superadmin", "Pimpinan", "Manager", "Staff"] as const
const UNIT_TYPES = ["Sederhana", "Retail"] as const

function roleBadge(role: string) {
  const map: Record<string, string> = {
    Superadmin: "bg-purple-100 text-purple-700",
    Pimpinan: "bg-blue-100 text-blue-700",
    Manager: "bg-emerald-100 text-emerald-700",
    Staff: "bg-gray-100 text-gray-700",
  }
  return map[role] || "bg-gray-100 text-gray-700"
}

export function SuperadminClient({
  initialUsers,
  initialUnits,
  stats,
}: {
  initialUsers: UserRow[]
  initialUnits: UnitRow[]
  stats: Stats
}) {
  const router = useRouter()
  const [users, setUsers] = useState<UserRow[]>(initialUsers)
  const [units, setUnits] = useState<UnitRow[]>(initialUnits)
  const [activeTab, setActiveTab] = useState<"units" | "users" | "grouping">("grouping")
  const [search, setSearch] = useState("")
  const [, startTransition] = useTransition()

  const [editingUser, setEditingUser] = useState<UserRow | null>(null)
  const [showUnitForm, setShowUnitForm] = useState(false)
  const [editingUnit, setEditingUnit] = useState<UnitRow | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ------- Unit CRUD -------
  async function saveUnit(payload: Partial<UnitRow> & { name: string; type: string }) {
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

  // ------- Grouping (Manager → Staff per unit) -------
  const grouping = useMemo(() => {
    const byUnit = new Map<string, { manager: UserRow | null; staff: UserRow[] }>()
    for (const u of users) {
      if (u.role !== "Manager" && u.role !== "Staff") continue
      const entry = byUnit.get(u.unit) || { manager: null, staff: [] }
      if (u.role === "Manager") entry.manager = u
      else entry.staff.push(u)
      byUnit.set(u.unit, entry)
    }
    return units.map((unit) => {
      const g = byUnit.get(unit.name) || { manager: null, staff: [] }
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
        u.unit.toLowerCase().includes(q)
    )
  }, [users, search])

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
            <p className="text-xs text-[#43474e]">Full Control: Units • Users • Grouping</p>
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
        <div className="flex items-center gap-2 border-b border-[#eeedf1]">
          <button
            onClick={() => setActiveTab("grouping")}
            className={`px-4 py-3 text-sm font-bold flex items-center gap-2 border-b-2 ${
              activeTab === "grouping"
                ? "border-[#022448] text-[#022448]"
                : "border-transparent text-[#43474e] hover:text-[#022448]"
            }`}
          >
            <Layers className="w-4 h-4" /> Grouping Manager → Staff
          </button>
          <button
            onClick={() => setActiveTab("units")}
            className={`px-4 py-3 text-sm font-bold flex items-center gap-2 border-b-2 ${
              activeTab === "units"
                ? "border-[#022448] text-[#022448]"
                : "border-transparent text-[#43474e] hover:text-[#022448]"
            }`}
          >
            <Building2 className="w-4 h-4" /> Manajemen Unit (Simple + Retail)
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`px-4 py-3 text-sm font-bold flex items-center gap-2 border-b-2 ${
              activeTab === "users"
                ? "border-[#022448] text-[#022448]"
                : "border-transparent text-[#43474e] hover:text-[#022448]"
            }`}
          >
            <Users className="w-4 h-4" /> Manajemen User
          </button>
        </div>

        {/* Tab: Grouping */}
        {activeTab === "grouping" && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-[#022448] flex items-center gap-2">
              <Layers className="w-5 h-5" /> Struktur Unit: Manager membawahi beberapa Staff
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {grouping.map(({ unit, manager, staff }) => (
                <div key={unit.id} className="bg-white rounded-2xl border border-[#eeedf1] p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-[#022448]">{unit.name}</h3>
                      <p className="text-xs text-[#43474e]">
                        {unit.type} • Retail: {unit.retailModuleEnabled ? "Aktif" : "Non-Aktif"}
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
                          <p className="text-xs text-[#43474e]">{manager.email}</p>
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
                              <p className="text-[10px] text-[#43474e]">{s.email}</p>
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
            </div>
          </div>
        )}

        {/* Tab: Units */}
        {activeTab === "units" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#022448] flex items-center gap-2">
                <Building2 className="w-5 h-5" /> CRUD Unit (Sederhana + Retail)
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
                    <th className="py-3 px-4">Nama Unit</th>
                    <th className="py-3 px-4">Tipe</th>
                    <th className="py-3 px-4">Retail Module</th>
                    <th className="py-3 px-4">Deskripsi</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eeedf1] text-sm">
                  {units.map((u) => (
                    <tr key={u.id} className="hover:bg-[#faf9fc]">
                      <td className="py-3 px-4 font-bold text-[#022448]">{u.name}</td>
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
                        {u.retailModuleEnabled ? (
                          <span className="text-xs text-emerald-600 font-bold">Aktif</span>
                        ) : (
                          <span className="text-xs text-gray-400">Tidak</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-[#43474e]">{u.description || "—"}</td>
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
                  {units.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-[#43474e]">
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
                  placeholder="Cari nama, email, role, unit..."
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
                    <th className="py-3 px-4">Nama</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Unit</th>
                    <th className="py-3 px-4">Tipe</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eeedf1] text-sm">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-[#faf9fc]">
                      <td className="py-3 px-4 font-bold text-[#1a1c1e]">{u.name}</td>
                      <td className="py-3 px-4 text-[#43474e]">{u.email}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${roleBadge(u.role)}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-[#022448]">{u.unit}</td>
                      <td className="py-3 px-4 text-[#43474e]">{u.unitType}</td>
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
                      <td colSpan={6} className="py-8 text-center text-[#43474e]">
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

      {/* Unit Form Modal */}
      {showUnitForm && (
        <UnitForm
          initial={editingUnit}
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
          busy={busy}
          onCancel={() => setEditingUser(null)}
          onSave={saveUser}
        />
      )}
    </div>
  )
}

// ------- Unit Form -------
function UnitForm({
  initial,
  busy,
  onCancel,
  onSave,
}: {
  initial: UnitRow | null
  busy: boolean
  onCancel: () => void
  onSave: (p: { name: string; type: string; retailModuleEnabled?: boolean; description?: string }) => void
}) {
  const [name, setName] = useState(initial?.name || "")
  const [type, setType] = useState(initial?.type || "Sederhana")
  const [retailEnabled, setRetailEnabled] = useState(initial?.retailModuleEnabled || false)
  const [description, setDescription] = useState(initial?.description || "")

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
            onSave({ name, type, retailModuleEnabled: retailEnabled, description })
          }}
          className="space-y-3"
        >
          <div>
            <label className="text-xs font-bold text-[#43474e] uppercase">Nama Unit</label>
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
  busy,
  onCancel,
  onSave,
}: {
  initial: UserRow
  units: UnitRow[]
  busy: boolean
  onCancel: () => void
  onSave: (p: Partial<UserRow> & { id: number }) => void
}) {
  const [name, setName] = useState(initial.name)
  const [role, setRole] = useState(initial.role)
  const [unit, setUnit] = useState(initial.unit)
  const [unitType, setUnitType] = useState(initial.unitType)
  const [retailEnabled, setRetailEnabled] = useState(initial.retailModuleEnabled)
  const [password, setPassword] = useState("")

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
              unit,
              unitType,
              retailModuleEnabled: retailEnabled,
              ...(password ? { password } : {}),
            })
          }}
          className="space-y-3"
        >
          <div>
            <label className="text-xs font-bold text-[#43474e] uppercase">Nama</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full mt-1 px-3 py-2 border border-[#dad6de] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#022448]"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-[#43474e] uppercase">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
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
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full mt-1 px-3 py-2 border border-[#dad6de] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#022448]"
            >
              <option value="All">All (cross-unit)</option>
              {units.map((u) => (
                <option key={u.id} value={u.name}>
                  {u.name} ({u.type})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-[#43474e] uppercase">Unit Type</label>
            <select
              value={unitType}
              onChange={(e) => setUnitType(e.target.value)}
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
              disabled={unitType !== "Retail"}
              onChange={(e) => setRetailEnabled(e.target.checked)}
              className="w-4 h-4"
            />
            <span>Aktifkan Modul Retail</span>
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
