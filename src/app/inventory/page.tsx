'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { canUseRetail } from '@/lib/enums'
import { Search, Plus, AlertTriangle } from 'lucide-react'

type InventoryItem = {
  id: number
  name: string
  sku: string | null
  category: string | null
  buyPrice: number | null
  sellPrice: number
  unit: string
  stock: number
  minStock: number
  unitName: string
}

export default function InventoryPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const enabled = (session?.user as { retailModuleEnabled?: boolean } | undefined)?.retailModuleEnabled === true
  const role = session?.user?.role || ''
  const userUnit = session?.user?.unit || ''

  const [items, setItems] = useState<InventoryItem[]>([])
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [form, setForm] = useState({
    name: '',
    sku: '',
    category: '',
    buyPrice: '',
    sellPrice: '',
    unit: 'pcs',
    stock: '0',
    minStock: '0',
    unitName: typeof window !== 'undefined' ? (session?.user?.unit || 'Kantin') : 'Kantin',
  })

  const fetchItems = async () => {
    const res = await fetch('/api/inventory')
    if (res.ok) setItems(await res.json())
  }

  useEffect(() => {
    if (!session) {
      router.replace('/login')
      return
    }
    if (!canUseRetail(role, userUnit, enabled)) {
      router.replace('/dashboard')
      return
    }

    let ignore = false
    const load = async () => {
      const res = await fetch('/api/inventory')
      if (res.ok && !ignore) setItems(await res.json())
    }

    void load()
    return () => {
      ignore = true
    }
  }, [session, role, enabled, userUnit, router])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          buyPrice: form.buyPrice || null,
          sellPrice: Number(form.sellPrice),
          stock: Number(form.stock),
          minStock: Number(form.minStock),
        }),
      })
      if (res.ok) {
        setMessage({ type: 'success', text: 'Produk berhasil disimpan' })
        setForm({ name: '', sku: '', category: '', buyPrice: '', sellPrice: '', unit: 'pcs', stock: '0', minStock: '0', unitName: session?.user?.unit || 'Kantin' })
        setShowForm(false)
        fetchItems()
      } else {
        const err = await res.json()
        setMessage({ type: 'error', text: err.error || 'Gagal menyimpan' })
      }
    } finally {
      setSaving(false)
    }
  }

  if (!session || !canUseRetail(role, userUnit, enabled)) return null

  const filtered = items.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()) || (i.sku || '').toLowerCase().includes(search.toLowerCase()))
  const lowStock = items.filter((i) => i.stock <= i.minStock)

  return (
    <div className="min-h-screen bg-[#faf9fc] text-[#1a1c1e] font-body">
      <main className="max-w-md mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-[#022448]">Inventori</h1>
          <button onClick={() => setShowForm((v) => !v)} className="flex items-center gap-2 bg-[#022448] text-white px-4 py-2 rounded-full text-sm font-semibold">
            <Plus className="w-4 h-4" /> Tambah
          </button>
        </div>

        {lowStock.length > 0 && (
          <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> {lowStock.length} produk stok kritis
          </div>
        )}

        {message && (
          <div className={`mb-4 p-3 rounded-xl text-sm font-medium ${message.type === 'success' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
            {message.text}
          </div>
        )}

        {showForm && (
          <form onSubmit={submit} className="bg-white rounded-2xl p-5 shadow-sm border border-[#eeedf1] space-y-3 mb-6">
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nama produk" required className="w-full bg-[#f4f3f7] rounded-2xl px-4 py-3" />
            <input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="SKU (opsional)" className="w-full bg-[#f4f3f7] rounded-2xl px-4 py-3" />
            <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Kategori" className="w-full bg-[#f4f3f7] rounded-2xl px-4 py-3" />
            <div className="grid grid-cols-2 gap-3">
              <input value={form.buyPrice} onChange={(e) => setForm({ ...form, buyPrice: e.target.value })} placeholder="Harga beli" type="number" className="bg-[#f4f3f7] rounded-2xl px-4 py-3" />
              <input value={form.sellPrice} onChange={(e) => setForm({ ...form, sellPrice: e.target.value })} placeholder="Harga jual" type="number" required className="bg-[#f4f3f7] rounded-2xl px-4 py-3" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="Satuan" className="bg-[#f4f3f7] rounded-2xl px-4 py-3" />
              <input value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} placeholder="Stok" type="number" className="bg-[#f4f3f7] rounded-2xl px-4 py-3" />
              <input value={form.minStock} onChange={(e) => setForm({ ...form, minStock: e.target.value })} placeholder="Min stok" type="number" className="bg-[#f4f3f7] rounded-2xl px-4 py-3" />
            </div>
            <button type="submit" disabled={saving} className="w-full bg-[#022448] text-white py-3 rounded-2xl font-semibold disabled:opacity-50">
              {saving ? 'Menyimpan...' : 'Simpan Produk'}
            </button>
          </form>
        )}

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#43474e] w-5 h-5" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari produk..." className="w-full bg-white border border-[#e3e2e6] rounded-2xl pl-10 pr-4 py-3" />
        </div>

        <div className="space-y-3">
          {filtered.map((item) => (
            <div key={item.id} className="bg-white rounded-2xl p-4 shadow-sm border border-[#eeedf1] flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-[#1a1c1e]">{item.name}</p>
                <p className="text-xs text-[#43474e]">{item.category || '-'} • {item.sku || 'No SKU'}</p>
                <p className="text-xs text-[#43474e]">Stok: {item.stock} {item.unit} • Min: {item.minStock}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-mono font-bold text-[#022448]">Rp {item.sellPrice.toLocaleString('id-ID')}</p>
                {item.stock <= item.minStock && <span className="text-[10px] font-bold text-rose-600 bg-rose-100 px-2 py-0.5 rounded-full flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Low</span>}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
