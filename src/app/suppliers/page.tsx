'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'

type Supplier = {
  id: number
  name: string
  contact: string | null
  email: string | null
  phone: string | null
  address: string | null
  unitName: string
}

export default function SuppliersPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const role = session?.user?.role || ''
  const userUnit = session?.user?.unit || ''

  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [form, setForm] = useState({
    name: '',
    contact: '',
    email: '',
    phone: '',
    address: '',
    unitName: role === 'Pimpinan' ? 'Kantin' : userUnit || 'Kantor',
  })

  const fetchSuppliers = async () => {
    const res = await fetch('/api/suppliers')
    if (res.ok) setSuppliers(await res.json())
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchSuppliers()
  }, [session, role, router])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        setMessage({ type: 'success', text: 'Supplier berhasil ditambahkan' })
        setForm({
          name: '',
          contact: '',
          email: '',
          phone: '',
          address: '',
          unitName: role === 'Pimpinan' ? 'Kantin' : userUnit || 'Kantor',
        })
        setShowForm(false)
        fetchSuppliers()
      } else {
        const err = await res.json()
        setMessage({ type: 'error', text: err.error || 'Gagal menambahkan supplier' })
      }
    } finally {
      setSaving(false)
    }
  }

  if (!session || (role !== 'Pimpinan' && role !== 'Manager')) return null

  return (
    <div className="min-h-screen bg-[#faf9fc] text-[#1a1c1e] font-body">
      <main className="max-w-md mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-[#022448]">Supplier</h1>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-2 bg-[#022448] text-white px-4 py-2 rounded-full text-sm font-semibold"
          >
            <Plus className="w-4 h-4" /> Tambah
          </button>
        </div>

        {message && (
          <div
            className={`mb-4 p-3 rounded-xl text-sm font-medium ${message.type === 'success' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}
          >
            {message.text}
          </div>
        )}

        {showForm && (
          <form onSubmit={submit} className="bg-white rounded-2xl p-5 shadow-sm border border-[#eeedf1] space-y-3 mb-6">
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Nama supplier"
              required
              className="w-full bg-[#f4f3f7] rounded-2xl px-4 py-3"
            />
            <input
              value={form.contact}
              onChange={(e) => setForm({ ...form, contact: e.target.value })}
              placeholder="Kontak"
              className="w-full bg-[#f4f3f7] rounded-2xl px-4 py-3"
            />
            <input
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="Email"
              type="email"
              className="w-full bg-[#f4f3f7] rounded-2xl px-4 py-3"
            />
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="Telepon"
              className="w-full bg-[#f4f3f7] rounded-2xl px-4 py-3"
            />
            <textarea
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="Alamat"
              className="w-full bg-[#f4f3f7] rounded-2xl px-4 py-3"
            />
            <select
              value={form.unitName}
              onChange={(e) => setForm({ ...form, unitName: e.target.value })}
              disabled={role !== 'Pimpinan'}
              className="w-full bg-[#f4f3f7] rounded-2xl px-4 py-3 disabled:opacity-60"
            >
              <option value="Kantor">Kantor</option>
              <option value="Kantin">Kantin</option>
              <option value="Koperasi">Koperasi</option>
            </select>
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-[#022448] text-white py-3 rounded-2xl font-semibold disabled:opacity-50"
            >
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </form>
        )}

        <div className="space-y-3">
          {suppliers.map((s) => (
            <div
              key={s.id}
              className="bg-white rounded-2xl p-4 shadow-sm border border-[#eeedf1]"
            >
              <p className="text-sm font-bold text-[#1a1c1e]">{s.name}</p>
              <p className="text-xs text-[#43474e]">
                {s.contact} • {s.phone}
              </p>
              <p className="text-xs text-[#43474e]">{s.email}</p>
              <p className="text-xs text-[#43474e]">{s.address}</p>
              <p className="text-[10px] text-[#74777f] mt-1">{s.unitName}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}