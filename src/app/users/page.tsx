'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { UserPlus, ShieldCheck, UserCog } from 'lucide-react'

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

const UNITS = ['Kantor', 'Kantin', 'Koperasi'] as const
const UNIT_TYPES = ['Sederhana', 'Retail'] as const

export default function UsersPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const role = session?.user?.role || ''
  const actorUnit = session?.user?.unit || ''

  const [users, setUsers] = useState<UserRow[]>([])
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    unit: role === 'Pimpinan' ? 'Kantin' : actorUnit || 'Kantor',
    unitType: 'Sederhana' as 'Sederhana' | 'Retail',
    retailModuleEnabled: false,
  })

  const fetchUsers = async () => {
    const res = await fetch('/api/users')
    if (res.ok) setUsers(await res.json())
  }

  useEffect(() => {
    if (!session) {
      router.replace('/login')
      return
    }
    if (role !== 'Pimpinan' && role !== 'Manager') {
      router.replace('/dashboard')
      return
    }
    let ignore = false
    void (async () => {
      const res = await fetch('/api/users')
      if (res.ok && !ignore) setUsers(await res.json())
    })()
    return () => {
      ignore = true
    }
  }, [session, role, router])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          unitType: form.unitType,
          retailModuleEnabled: form.unitType === 'Retail' ? form.retailModuleEnabled : false,
        }),
      })
      if (res.ok) {
        const created = await res.json()
        setMessage({ type: 'success', text: `User ${created.name} berhasil dibuat` })
        setForm({
          name: '',
          email: '',
          password: '',
          unit: role === 'Pimpinan' ? 'Kantin' : actorUnit || 'Kantor',
          unitType: 'Sederhana',
          retailModuleEnabled: false,
        })
        setShowForm(false)
        fetchUsers()
      } else {
        const err = await res.json()
        setMessage({ type: 'error', text: err.error || 'Gagal membuat user' })
      }
    } finally {
      setSaving(false)
    }
  }

  if (!session || (role !== 'Pimpinan' && role !== 'Manager')) return null

  const targetRoleLabel = role === 'Pimpinan' ? 'Manager' : 'Staff'
  const canEditUnit = role === 'Pimpinan'

  return (
    <div className="min-h-screen bg-[#faf9fc] text-[#1a1c1e] font-body">
      <main className="max-w-md mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-[#022448]">Manajemen User</h1>
            <p className="text-xs text-[#43474e]">Login sebagai {role}</p>
         </div>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-2 bg-[#022448] text-white px-4 py-2 rounded-full text-sm font-semibold"
          >
            <UserPlus className="w-4 h-4" /> Tambah {targetRoleLabel}
         </button>
       </div>

        {message && (
          <div
            className={`mb-4 p-3 rounded-xl text-sm font-medium ${
              message.type === 'success' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
            }`}
          >
            {message.text}
         </div>
        )}

        {showForm && (
          <form onSubmit={submit} className="bg-white rounded-2xl p-5 shadow-sm border border-[#eeedf1] space-y-3 mb-6">
            <p className="text-xs font-semibold text-[#43474e] flex items-center gap-2">
              {role === 'Pimpinan' ? <ShieldCheck className="w-4 h-4" /> : <UserCog className="w-4 h-4" />}
              Buat akun {targetRoleLabel} baru
           </p>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Nama lengkap"
              required
              className="w-full bg-[#f4f3f7] rounded-2xl px-4 py-3"
            />
            <input
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="Email"
              type="email"
              required
              className="w-full bg-[#f4f3f7] rounded-2xl px-4 py-3"
            />
            <input
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Password awal"
              type="text"
              required
              minLength={6}
              className="w-full bg-[#f4f3f7] rounded-2xl px-4 py-3"
            />
            <div className="grid grid-cols-2 gap-3">
              <select
                value={form.unit}
                onChange={(e) => {
                  const newUnit = e.target.value
                  setForm({
                    ...form,
                    unit: newUnit,
                    unitType: newUnit === 'Kantor' ? 'Sederhana' : form.unitType,
                    retailModuleEnabled: newUnit === 'Kantor' ? false : form.retailModuleEnabled,
                  })
                }}
                disabled={!canEditUnit}
                className="bg-[#f4f3f7] rounded-2xl px-4 py-3 disabled:opacity-60"
              >
                {(canEditUnit ? UNITS : [actorUnit]).map((u) => (
                  <option key={u} value={u}>
                    {u}
                 </option>
                ))}
             </select>
              <select
                value={form.unitType}
                onChange={(e) =>
                  setForm({ ...form, unitType: e.target.value as 'Sederhana' | 'Retail' })
                }
                className="bg-[#f4f3f7] rounded-2xl px-4 py-3"
              >
                {UNIT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                 </option>
                ))}
             </select>
           </div>
            {form.unitType === 'Retail' && (
              <label className="flex items-center gap-2 text-sm text-[#1a1c1e]">
                <input
                  type="checkbox"
                  checked={form.retailModuleEnabled}
                  onChange={(e) => setForm({ ...form, retailModuleEnabled: e.target.checked })}
                />
                Aktifkan modul inventori & POS untuk {form.unit}
             </label>
            )}
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-[#022448] text-white py-3 rounded-2xl font-semibold disabled:opacity-50"
            >
              {saving ? 'Membuat...' : `Buat ${targetRoleLabel}`}
           </button>
         </form>
        )}

        <div className="space-y-3">
          {users.map((u) => (
            <div
              key={u.id}
              className="bg-white rounded-2xl p-4 shadow-sm border border-[#eeedf1] flex items-center justify-between"
            >
              <div>
                <p className="text-sm font-bold text-[#1a1c1e]">{u.name}</p>
                <p className="text-xs text-[#43474e]">{u.email}</p>
                <p className="text-xs text-[#43474e]">
                  {u.role} • {u.unit} ({u.unitType})
                  {u.retailModuleEnabled ? ' • Retail aktif' : ''}
               </p>
             </div>
              <div className="text-right">
                <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-[#f4f3f7] text-[#022448]">
                  {u.role}
               </span>
             </div>
           </div>
          ))}
       </div>
     </main>
   </div>
  )
}
