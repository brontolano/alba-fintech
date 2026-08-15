'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Plus, Truck } from 'lucide-react'

type Supplier = {
  id: number
  name: string
  contact: string | null
  email: string | null
  phone: string | null
  address: string | null
  unitName: string
}

type PurchaseOrder = {
  id: number
  supplierId: number
  supplier: Supplier
  unitName: string
  orderDate: string
  totalAmount: number
  status: string
  receivedAt: string | null
  notes: string | null
  items: Array<{
    id: number
    inventoryId: number
    quantity: number
    unitPrice: number
    subtotal: number
    inventory: { name: string; sku: string | null }
  }>
}

export default function PurchaseOrdersPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const role = session?.user?.role || ''
  const userUnit = session?.user?.unit || ''

  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [form, setForm] = useState({
    supplierId: '',
    unitName: role === 'Pimpinan' ? 'Kantin' : userUnit || 'Kantor',
    notes: '',
    items: [{ inventoryId: '', quantity: 1, unitPrice: 0 }],
  })

  const fetchOrders = async () => {
    const res = await fetch('/api/purchase-orders')
    if (res.ok) setOrders(await res.json())
  }

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
    fetchOrders()
    fetchSuppliers()
  }, [session, role, router])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch('/api/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          supplierId: Number(form.supplierId),
          items: form.items.map((it) => ({
            inventoryId: Number(it.inventoryId),
            quantity: Number(it.quantity),
            unitPrice: Number(it.unitPrice),
          })),
        }),
      })
      if (res.ok) {
        setMessage({ type: 'success', text: 'Purchase Order berhasil dibuat' })
        setForm({
          supplierId: '',
          unitName: role === 'Pimpinan' ? 'Kantin' : userUnit || 'Kantor',
          notes: '',
          items: [{ inventoryId: '', quantity: 1, unitPrice: 0 }],
        })
        setShowForm(false)
        fetchOrders()
      } else {
        const err = await res.json()
        setMessage({ type: 'error', text: err.error || 'Gagal membuat PO' })
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
          <h1 className="text-2xl font-bold text-[#022448]">Purchase Order</h1>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-2 bg-[#022448] text-white px-4 py-2 rounded-full text-sm font-semibold"
          >
            <Plus className="w-4 h-4" /> Buat PO
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
            <select
              value={form.supplierId}
              onChange={(e) => setForm({ ...form, supplierId: e.target.value })}
              required
              className="w-full bg-[#f4f3f7] rounded-2xl px-4 py-3"
            >
              <option value="">Pilih Supplier</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} - {s.unitName}
                </option>
              ))}
            </select>

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

            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Catatan PO"
              className="w-full bg-[#f4f3f7] rounded-2xl px-4 py-3"
            />

            <div className="space-y-2">
              {form.items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-3 gap-2">
                  <input
                    type="number"
                    placeholder="Inventory ID"
                    value={item.inventoryId}
                    onChange={(e) => {
                      const newItems = [...form.items]
                      newItems[idx].inventoryId = e.target.value
                      setForm({ ...form, items: newItems })
                    }}
                    required
                    className="bg-[#f4f3f7] rounded-2xl px-3 py-2"
                  />
                  <input
                    type="number"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) => {
                      const newItems = [...form.items]
                      newItems[idx].quantity = Number(e.target.value)
                      setForm({ ...form, items: newItems })
                    }}
                    required
                    className="bg-[#f4f3f7] rounded-2xl px-3 py-2"
                  />
                  <input
                    type="number"
                    placeholder="Harga satuan"
                    value={item.unitPrice}
                    onChange={(e) => {
                      const newItems = [...form.items]
                      newItems[idx].unitPrice = Number(e.target.value)
                      setForm({ ...form, items: newItems })
                    }}
                    required
                    className="bg-[#f4f3f7] rounded-2xl px-3 py-2"
                  />
                </div>
              ))}
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-[#022448] text-white py-3 rounded-2xl font-semibold disabled:opacity-50"
            >
              {saving ? 'Membuat...' : 'Buat PO'}
            </button>
          </form>
        )}

        <div className="space-y-3">
          {orders.map((o) => (
            <div
              key={o.id}
              className="bg-white rounded-2xl p-4 shadow-sm border border-[#eeedf1]"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-bold text-[#1a1c1e]">PO #{o.id}</p>
                <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-[#f4f3f7] text-[#022448]">
                  {o.status}
                </span>
              </div>
              <p className="text-xs text-[#43474e]">
                Supplier: {o.supplier.name} • {o.unitName}
              </p>
              <p className="text-xs text-[#43474e]">
                Total: Rp {o.totalAmount.toLocaleString('id-ID')}
              </p>
              <p className="text-[10px] text-[#74777f] mt-1">
                {new Date(o.orderDate).toLocaleString('id-ID')}
              </p>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}