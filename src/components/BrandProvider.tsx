'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type Brand = {
  appName: string
  appLogo: string | null
}

type BrandContextValue = {
  brand: Brand | null
  loading: boolean
}

const BrandContext = createContext<BrandContextValue>({ brand: null, loading: true })

export function BrandProvider({ children }: { children: React.ReactNode }) {
  const [brand, setBrand] = useState<Brand | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch('/api/config', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data) setBrand(data)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return <BrandContext.Provider value={{ brand, loading }}>{children}</BrandContext.Provider>
}

export function useBrand() {
  return useContext(BrandContext)
}
