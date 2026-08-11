'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { canUseRetail } from '@/lib/enums'
import { Search, Plus, Minus, Trash2, CheckCircle2, AlertTriangle, Package } from 'lucide-react'

type InventoryItem = {
  id: number
  name: string
  sku: string | null
  category: string | null
  sellPrice: number
  unit: string
  stock: number
  minStock: number
  unitName: string
}

type CartItem = InventoryItem & { quantity: number }

export default function PosPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const enabled = (session?.user as { retailModuleEnabled?: boolean } | undefined)?.retailModuleEnabled === true
  const role = session?.user?.role || ''

  const [items, setItems] = useState<InventoryItem[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const fetchItems = async () => {
    const res = await fetch('/api/inventory')
    if (res.ok) {
      const data = await res.json()
      setItems(data)
    }
  }

  useEffect(() => {
    if (!session) {
      router.replace('/login')
      return
    }
    if (!canUseRetail(role, enabled)) {
      router.replace('/dashboard')
      return
    }

    let ignore = false
    const load = async () => {
      const res = await fetch('/api/inventory')
      if (res.ok && !ignore) {
        const data = await res.json()
        setItems(data)
      }
    }

    void load()
    return () => {
      ignore = true
    }
  }, [session, role, enabled, router])

  const addToCart = (item: InventoryItem) => {
    if (item.stock <= 0) {
      setMessage({ type: 'error', text: `${item.name} stok habis` })
      return
    }
    setCart((prev) => {
      const existing = prev.find((c) => c.id === item.id)
      if (existing) {
        if (existing.quantity >= item.stock) {
          setMessage({ type: 'error', text: `Stok ${item.name} tidak cukup` })
          return prev
        }
        return prev.map((c) => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c)
      }
      return [...prev, { ...item, quantity: 1 }]
    })
    setMessage(null)
  }

  const updateQuantity = (id: number, delta: number) => {
    setCart((prev) => {
      const item = prev.find((c) => c.id === id)
      if (!item) return prev
      const newQty = item.quantity + delta
      if (newQty <= 0) return prev.filter((c) => c.id !== id)
      if (newQty > item.stock) {
        setMessage({ type: 'error', text: `Stok ${item.name} tidak cukup` })
        return prev
      }
      return prev.map((c) => c.id === id ? { ...c, quantity: newQty } : c)
    })
    setMessage(null)
  }

  const removeFromCart = (id: number) => {
    setCart((prev) => prev.filter((c) => c.id !== id))
  }

  const total = cart.reduce((acc, c) => acc + c.sellPrice * c.quantity, 0)

  const checkout = async () => {
    if (cart.length === 0) return
    setLoading(true)
    setMessage(null)
    try {
      const res = await fetch('/api/pos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unitName: session?.user?.unit,
          paymentMethod: 'Tunai',
          items: cart.map((c) => ({
            inventoryId: c.id,
            quantity: c.quantity,
            priceAtSale: c.sellPrice,
            subtotal: c.sellPrice * c.quantity,
          })),
        }),
      })
      if (res.ok) {
        setMessage({ type: 'success', text: 'Transaksi POS berhasil' })
        setCart([])
        fetchItems()
      } else {
        const err = await res.json()
        setMessage({ type: 'error', text: err.error || 'Gagal checkout' })
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Error: ' + ((e as Error).message || e) })
    } finally {
      setLoading(false)
    }
  }

  if (!session || !canUseRetail(role, enabled)) return null

  const filtered = items.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()) || (i.sku || '').toLowerCase().includes(search.toLowerCase()))
  const lowStock = items.filter((i) => i.stock <= i.minStock)

  return (
    <div className="min-h-screen bg-[#faf9fc] text-[#1a1c1e] font-body">
      <main className="max-w-md mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-[#022448]">Kasir (POS)</h1>
          {lowStock.length > 0 && (
            <span className="flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-1 rounded-full">
              <AlertTriangle className="w-3.5 h-3.5" /> {lowStock.length} stok kritis
            </span>
          )}
        </div>

        {message && (
          <div className={`mb-4 p-3 rounded-xl text-sm font-medium ${message.type === 'success' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
            {message.text}
          </div>
        )}

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#43474e] w-5 h-5" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari produk..."
            className="w-full bg-white border border-[#e3e2e6] rounded-2xl pl-10 pr-4 py-3 text-base focus:ring-2 focus:ring-[#16677a] focus:outline-none"
          />
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {filtered.map((item) => (
            <button
              key={item.id}
              onClick={() => addToCart(item)}
              disabled={item.stock <= 0}
              className="bg-white rounded-2xl p-4 shadow-sm border border-[#eeedf1] text-left hover:shadow-md transition-all disabled:opacity-50"
            >
              <div className="flex items-start justify-between mb-2">
                <Package className="w-6 h-6 text-[#16677a]" />
                {item.stock <= item.minStock && <span className="text-[10px] font-bold text-rose-600 bg-rose-100 px-2 py-0.5 rounded-full">Low</span>}
              </div>
              <p className="text-sm font-bold text-[#1a1c1e] line-clamp-2">{item.name}</p>
              <p className="text-xs text-[#43474e] mt-1">Stok: {item.stock} {item.unit}</p>
              <p className="text-sm font-mono font-bold text-[#022448] mt-2">Rp {item.sellPrice.toLocaleString('id-ID')}</p>
            </button>
          ))}
        </div>

        {/* Cart */}
        {cart.length > 0 && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center" onClick={() => setCart([])}>
            <div className="bg-white w-full max-w-md rounded-t-3xl p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-[#1a1c1e]">Keranjang ({cart.length})</h3>
                <button onClick={() => setCart([])} className="text-[#ba1a1a] text-sm font-semibold">Hapus</button>
              </div>
              <div className="space-y-3 max-h-[40vh] overflow-y-auto mb-4">
                {cart.map((c) => (
                  <div key={c.id} className="flex items-center justify-between p-3 bg-[#faf9fc] rounded-2xl">
                    <div className="flex-1">
                      <p className="text-sm font-bold text-[#1a1c1e]">{c.name}</p>
                      <p className="text-xs text-[#43474e]">Rp {c.sellPrice.toLocaleString('id-ID')} x {c.quantity}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateQuantity(c.id, -1)} className="w-8 h-8 rounded-full bg-[#e3e2e6] flex items-center justify-center"><Minus className="w-4 h-4" /></button>
                      <span className="text-sm font-bold w-6 text-center">{c.quantity}</span>
                      <button onClick={() => updateQuantity(c.id, 1)} className="w-8 h-8 rounded-full bg-[#e3e2e6] flex items-center justify-center"><Plus className="w-4 h-4" /></button>
                      <button onClick={() => removeFromCart(c.id)} className="ml-2 text-[#ba1a1a]"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-[#e3e2e6] pt-3 mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-[#43474e]">Total</span>
                  <span className="text-xl font-mono font-bold text-[#022448]">Rp {total.toLocaleString('id-ID')}</span>
                </div>
              </div>
              <button
                onClick={checkout}
                disabled={loading}
                className="w-full py-3 bg-[#022448] text-white rounded-2xl font-semibold hover:bg-[#1e3a5f] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-5 h-5" /> {loading ? 'Memproses...' : 'Bayar'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
