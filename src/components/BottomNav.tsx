'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Home, Receipt, CheckSquare, BarChart3, RefreshCcw, ShoppingCart } from 'lucide-react'
import { cn } from '@/lib/utils'

export function BottomNav() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const retailEnabled = (session?.user as { retailModuleEnabled?: boolean })?.retailModuleEnabled === true

  const navItems = [
    { name: 'Beranda', href: '/dashboard', icon: Home },
    { name: 'Transaksi', href: '/transactions', icon: Receipt },
    ...(retailEnabled ? [{ name: 'Kasir', href: '/pos', icon: ShoppingCart }] : []),
    { name: 'Persetujuan', href: '/approvals', icon: CheckSquare },
    { name: 'Laporan', href: '/reports', icon: BarChart3 },
    { name: 'Rekonsiliasi', href: '/reconciliations', icon: RefreshCcw },
  ]

  // Don't show on login page
  if (pathname === '/login' || pathname === '/') return null

  return (
    <div className="fixed bottom-0 left-0 z-50 w-full h-16 bg-white border-t border-gray-200 dark:bg-gray-900 dark:border-gray-800">
      <div className="grid h-full max-w-lg grid-cols-5 mx-auto font-medium">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname.startsWith(item.href)

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "inline-flex flex-col items-center justify-center px-5 hover:bg-gray-50 dark:hover:bg-gray-800 group",
                isActive ? "text-emerald-600 dark:text-emerald-500" : "text-gray-500 dark:text-gray-400"
              )}
            >
              <Icon className={cn("w-6 h-6 mb-1", isActive ? "text-emerald-600" : "text-gray-500 group-hover:text-emerald-600")} />
              <span className="text-[10px]">{item.name}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
