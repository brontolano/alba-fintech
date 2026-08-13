'use client'

import { useBrand } from '@/components/BrandProvider'
import { BottomNav } from '@/components/BottomNav'
import { NotificationBell } from '@/components/NotificationBell'

export function BrandedLayout({ children }: { children: React.ReactNode }) {
  const { brand } = useBrand()
  const appName = brand?.appName || 'ALBA Finance'
  const appLogo = brand?.appLogo || null

  return (
    <div className="flex flex-col flex-1">
      <header className="w-full top-0 sticky bg-white/80 dark:bg-[#2f3033]/80 backdrop-blur border-b border-[#eeedf1] z-40">
        <div className="max-w-md mx-auto flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2">
            {appLogo ? (
              <img src={appLogo} alt="logo" className="h-8 w-8 object-contain rounded-full" />
            ) : (
              <span className="material-symbols-outlined text-[#022448]">account_balance</span>
            )}
            <span className="text-sm font-bold text-[#022448]">{appName}</span>
          </div>
          <NotificationBell />
        </div>
      </header>
      <main className="flex-1 max-w-md w-full mx-auto bg-white shadow-sm relative">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
