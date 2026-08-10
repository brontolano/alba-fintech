'use client'

import { useSession } from 'next-auth/react'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { canUseRetail } from '@/lib/enums'

export default function PosPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const enabled = (session?.user as { retailModuleEnabled?: boolean })?.retailModuleEnabled === true
  const role = session?.user?.role || ''

  useEffect(() => {
    if (!session) {
      router.replace('/login')
    } else if (!canUseRetail(role, enabled)) {
      router.replace('/dashboard')
    }
  }, [session, role, enabled, router])

  if (!session || !canUseRetail(role, enabled)) return null

  return (
    <div className="min-h-screen bg-[#faf9fc] text-[#1a1c1e] font-body">
      <main className="max-w-md mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-[#022448] mb-4">Kasir (POS)</h1>
        <p className="text-sm text-[#43474e]">Modul retail belum diisi. Lanjut ke input produk/transaksi POS di sini.</p>
      </main>
    </div>
  )
}
