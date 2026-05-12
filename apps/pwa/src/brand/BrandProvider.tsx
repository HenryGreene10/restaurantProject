// Placeholder PWA app — intended for future mobile ordering build.
// See KNOWN_WARNINGS.md: "Ship PWA first. Only start native after 5 paying customers."
import React, { createContext, useContext, useEffect, useState } from 'react'

type Theme = {
  primaryColor?: string
  onPrimary?: string
  logoUrl?: string
  fontFamily?: string
  appTitle?: string
}

type Category = {
  id: string
  name: string
  categoryItems: Array<{
    item: {
      id: string
      name: string
      description?: string
      photoUrl?: string
      basePriceCents: number
      variants: Array<{ id: string; name: string; priceCents: number }>
    }
  }>
}

type BrandCtxValue = {
  theme: Theme
  categories: Category[]
}

const BrandCtx = createContext<BrandCtxValue>({ theme: {}, categories: [] })

export const BrandProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>({})
  const [categories, setCategories] = useState<Category[]>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    fetch('/v1/menu')
      .then((r) => r.json())
      .then((data) => {
        const cfg = data?.brand?.config || {}
        setTheme(cfg)
        setCategories(data?.categories ?? [])
        const color = cfg.primaryColor || '#0ea5e9'
        const meta = document.querySelector('meta[name="theme-color"]')
        if (meta) meta.setAttribute('content', color)
      })
      .catch(() => {})
      .finally(() => setReady(true))
  }, [])

  if (!ready) return null

  return <BrandCtx.Provider value={{ theme, categories }}>{children}</BrandCtx.Provider>
}

export const useBrand = () => useContext(BrandCtx)
