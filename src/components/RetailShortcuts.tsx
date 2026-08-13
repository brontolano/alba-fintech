'use client'

import Link from 'next/link'
import { ShoppingCart, Package } from 'lucide-react'
import { canUseRetail } from '@/lib/enums'
import { useSession } from 'next-auth/react'

export function RetailShortcuts() {
  const { data: session } = useSession()
  const role = session?.user?.role || ''
  const unit = session?.user?.unit || ''
  const enabled = (session?.user as { retailModuleEnabled?: boolean } | undefined)?.retailModuleEnabled === true

  if (!canUseRetail(role, unit, enabled)) return null

  return (
    <div className="grid grid-cols-2 gap-4">
      <Link
        href="/pos"
        className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-[#eeedf1] bg-white p-4 shadow-sm active:scale-[0.98] transition-transform"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#022448] text-white">
          <ShoppingCart className="h-5 w-5" />
        </div>
        <div className="text-center">
          <p className="text-sm font-bold text-[#1a1c1e]">Kasir</p>
          <p className="text-[11px] text-[#43474e]">Transaksi penjualan</p>
        </div>
      </Link>

      <Link
        href="/inventory"
        className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-[#eeedf1] bg-white p-4 shadow-sm active:scale-[0.98] transition-transform"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#16677a] text-white">
          <Package className="h-5 w-5" />
        </div>
        <div className="text-center">
          <p className="text-sm font-bold text-[#1a1c1e]">Inventori</p>
          <p className="text-[11px] text-[#43474e]">Stok & produk</p>
        </div>
      </Link>
    </div>
  )
}
