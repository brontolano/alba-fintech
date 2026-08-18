'use client'

import { useEffect, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { canUseRetail } from '@/lib/enums'
import { Search, Plus, AlertTriangle, Camera, ArrowDownToLine, ArrowUpFromLine, ClipboardList } from 'lucide-react'
import { fileToCompressedDataUrl } from '@/lib/image-compress'

type InventoryItem = {
  id: number
  name: string
  sku: string | null
  category: string | null
  imageUrl: string | null
  buyPrice: number | null
  sellPrice: number
  unit: string
  stock: number
  minStock: number
  unitId: number
}

export default function InventoryPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const enabled = (session?.user as { retailModuleEnabled?: boolean } | undefined)?.retailModuleEnabled === true
  const role = session?.user?.role || ''
  const userUnitId = session?.user?.unitId || null

  const [items, setItems] = useState<InventoryItem[]>([])
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [form, setForm] = useState({
    name: '',
    sku: '',
    category: '',
    imageUrl: '',
    buyPrice: '',
    sellPrice: '',
    unit: 'pcs',
    stock: '0',
    minStock: '0',
    unitId: userUnitId || 0,
  })

  const fileRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [showMovement, setShowMovement] = useState(false)
  const [showOpname, setShowOpname] = useState(false)
  const [movementType, setMovementType] = useState<'IN' | 'OUT'>('IN')
  const [movementQty, setMovementQty] = useState('')
  const [movementNote, setMovementNote] = useState('')
  const [opnameStock, setOpnameStock] = useState('')
  const [opnameNote, setOpnameNote] = useState('')
  const [movements, setMovements] = useState<{ id: number; type: string; quantity: number; note: string | null; createdAt: string; createdBy: { name: string } }[]>([])
  const [opnames, setOpnames] = useState<{ id: number; physicalStock: number; difference: number; note: string | null; createdAt: string; createdBy: { name: string } }[]>([])
  const [actionLoading, setActionLoading] = useState(false)
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const fetchItems = async () => {
    const res = await fetch('/api/inventory')
    if (res.ok) setItems(await res.json())
  }

  const fetchMovements = async (inventoryId: number) => {
    const res = await fetch(`/api/inventory/movements?inventoryId=${inventoryId}`)
    if (res.ok) setMovements(await res.json())
  }

  const fetchOpnames = async (inventoryId: number) => {
    const res = await fetch(`/api/inventory/opname?inventoryId=${inventoryId}`)
    if (res.ok) setOpnames(await res.json())
  }

  const openItem = (item: InventoryItem) => {
    setSelectedItem(item)
    setShowMovement(false)
    setShowOpname(false)
    setActionMessage(null)
    fetchMovements(item.id)
    fetchOpnames(item.id)
  }

  useEffect(() => {
    if (!session) {
      router.replace('/login')
      return
    }
    if (!canUseRetail(role, userUnitId, enabled)) {
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
  }, [session, role, enabled, userUnitId, router])

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const dataUrl = await fileToCompressedDataUrl(file)
      setPreviewUrl(dataUrl)
      setForm((f) => ({ ...f, imageUrl: dataUrl }))
    } catch {
      setMessage({ type: 'error', text: 'Gagal memproses gambar' })
    }
  }

  const submitMovement = async () => {
    if (!selectedItem || !movementQty) return
    setActionLoading(true)
    setActionMessage(null)
    try {
      const res = await fetch('/api/inventory/movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inventoryId: selectedItem.id, type: movementType, quantity: Number(movementQty), note: movementNote }),
      })
      if (res.ok) {
        const data = await res.json()
        setActionMessage({ type: 'success', text: `Stok ${movementType === 'IN' ? 'masuk' : 'keluar'} berhasil. Stok saat ini: ${data.currentStock}` })
        setMovementQty('')
        setMovementNote('')
        setShowMovement(false)
        fetchMovements(selectedItem.id)
        fetchItems()
      } else {
        const err = await res.json()
        setActionMessage({ type: 'error', text: err.error || 'Gagal' })
      }
    } finally {
      setActionLoading(false)
    }
  }

  const submitOpname = async () => {
    if (!selectedItem || !opnameStock) return
    setActionLoading(true)
    setActionMessage(null)
    try {
      const res = await fetch('/api/inventory/opname', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inventoryId: selectedItem.id, physicalStock: Number(opnameStock), note: opnameNote }),
      })
      if (res.ok) {
        setActionMessage({ type: 'success', text: 'Opname stok berhasil' })
        setOpnameStock('')
        setOpnameNote('')
        setShowOpname(false)
        fetchOpnames(selectedItem.id)
        fetchItems()
      } else {
        const err = await res.json()
        setActionMessage({ type: 'error', text: err.error || 'Gagal' })
      }
    } finally {
      setActionLoading(false)
    }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          sku: form.sku || null,
          category: form.category || null,
          imageUrl: form.imageUrl || null,
          buyPrice: form.buyPrice ? Number(form.buyPrice) : null,
          sellPrice: Number(form.sellPrice),
          unit: form.unit,
          stock: Number(form.stock) || 0,
          minStock: Number(form.minStock) || 0,
          unitId: Number(form.unitId),
        }),
      })
      if (res.ok) {
        setMessage({ type: 'success', text: 'Produk berhasil disimpan' })
        setForm({ name: '', sku: '', category: '', imageUrl: '', buyPrice: '', sellPrice: '', unit: 'pcs', stock: '0', minStock: '0', unitId: userUnitId || 0 })
        setPreviewUrl(null)
        setShowForm(false)
        fetchItems()
      } else {
        const err = await res.json()
        setMessage({ type: 'error', text: err.error || 'Gagal simpan' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Error jaringan' })
    } finally {
      setSaving(false)
    }
  }

  const filtered = items.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()) || (i.sku || '').toLowerCase().includes(search.toLowerCase()))
  const lowStock = items.filter((i) => i.stock <= i.minStock)

  if (!session || !canUseRetail(role, userUnitId, enabled)) return null

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
            <p className="text-[11px] text-[#43474e] -mt-2 mb-1">Nama produk yang akan dijual</p>
            <input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="SKU (opsional)" className="w-full bg-[#f4f3f7] rounded-2xl px-4 py-3" />
            <p className="text-[11px] text-[#43474e] -mt-2 mb-1">Kode unik produk, bisa dikosongkan</p>
            <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Kategori" className="w-full bg-[#f4f3f7] rounded-2xl px-4 py-3" />
            <p className="text-[11px] text-[#43474e] -mt-2 mb-1">Jenis/kategori produk</p>

            <div className="flex items-center gap-3">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handleFile}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-2 bg-[#f4f3f7] px-4 py-3 rounded-2xl text-sm font-semibold text-[#022448]"
              >
                <Camera className="w-4 h-4" /> {previewUrl ? 'Ganti Gambar' : 'Upload Gambar'}
              </button>
              {previewUrl && (
                <img src={previewUrl} alt="preview" className="w-14 h-14 rounded-xl object-cover border border-[#eeedf1]" />
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <input value={form.buyPrice} onChange={(e) => setForm({ ...form, buyPrice: e.target.value })} placeholder="Harga beli" type="number" className="bg-[#f4f3f7] rounded-2xl px-4 py-3" />
              <p className="text-[11px] text-[#43474e] col-span-2">Harga pembelian per unit</p>
              <input value={form.sellPrice} onChange={(e) => setForm({ ...form, sellPrice: e.target.value })} placeholder="Harga jual" type="number" required className="bg-[#f4f3f7] rounded-2xl px-4 py-3" />
              <p className="text-[11px] text-[#43474e] col-span-2">Harga penjualan per unit</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="Satuan" className="bg-[#f4f3f7] rounded-2xl px-4 py-3" />
              <p className="text-[11px] text-[#43474e] col-span-3">Satuan: pcs, box, pack, dll</p>
              <input value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} placeholder="Stok" type="number" className="bg-[#f4f3f7] rounded-2xl px-4 py-3" />
              <p className="text-[11px] text-[#43474e] col-span-3">Jumlah stok awal saat ini</p>
              <input value={form.minStock} onChange={(e) => setForm({ ...form, minStock: e.target.value })} placeholder="Min stok" type="number" className="bg-[#f4f3f7] rounded-2xl px-4 py-3" />
              <p className="text-[11px] text-[#43474e] col-span-3">Batas minimum sebelum masuk status stok kritis</p>
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
            <div key={item.id} onClick={() => openItem(item)} className="bg-white rounded-2xl p-4 shadow-sm border border-[#eeedf1] flex items-center justify-between gap-3 cursor-pointer active:scale-[0.99] transition-transform">
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.name} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-[#f4f3f7] flex items-center justify-center flex-shrink-0 text-[#022448] text-xs font-bold">
                  {item.name.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-[#1a1c1e] truncate">{item.name}</p>
                <p className="text-xs text-[#43474e] truncate">{item.category || '-'} • {item.sku || 'No SKU'}</p>
                <p className="text-xs text-[#43474e]">Stok: {item.stock} {item.unit} • Min: {item.minStock}</p>
              </div>
              <div className="text-right flex-shrink-0">
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