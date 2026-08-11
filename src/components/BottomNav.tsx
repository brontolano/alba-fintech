'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Home, Receipt, CheckSquare, BarChart3, RefreshCcw, ShoppingCart, Package } from 'lucide-react'
import { canUseRetail } from '@/lib/enums'
import { cn } from '@/lib/utils'

export function BottomNav() {
  const pathname = usePathname()
  const { data: session } = useSession()

  const role = session?.user?.role || ''
  const unit = session?.user?.unit || ''
  const enabled = (session?.user as { retailModuleEnabled?: boolean } | undefined)?.retailModuleEnabled === true
  const showRetail = canUseRetail(role, unit, enabled)

  const navItems = [
    { name: 'Beranda', href: '/dashboard', icon: Home },
    { name: 'Transaksi', href: '/transactions', icon: Receipt },
    ...(showRetail ? [{ name: 'Kasir', href: '/pos', icon: ShoppingCart }, { name: 'Inventori', href: '/inventory', icon: Package }] : []),
    { name: 'Persetujuan', href: '/approvals', icon: CheckSquare },
    { name: 'Laporan', href: '/reports', icon: BarChart3 },
    { name: 'Rekonsiliasi', href: '/reconciliations', icon: RefreshCcw },
  ]

  if (pathname === '/login' || pathname === '/') return null

  return (
    <nav className="fixed bottom-0 left-0 z-50 w-full h-16 bg-white border-t border-gray-200 dark:bg-gray-900 dark:border-gray-800">
      <div className="grid h-full max-w-lg grid-cols-5 mx-auto font-medium">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname.startsWith(item.href)

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'inline-flex flex-col items-center justify-center px-5 hover:bg-gray-50 dark:hover:bg-gray-800 group',
                isActive ? 'text-emerald-600 dark:text-emerald-500' : 'text-gray-500 dark:text-gray-400',
              )}
            >
              <Icon className={cn('w-6 h-6 mb-1', isActive ? 'text-emerald-600' : 'text-gray-500 group-hover:text-emerald-600')} />
              <span className="text-[10px]">{item.name}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
