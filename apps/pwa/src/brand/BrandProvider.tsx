import React, { createContext, useContext, useEffect, useState } from 'react'

type Theme = {
  primaryColor?: string
  onPrimary?: string
  logoUrl?: string
  fontFamily?: string
  appTitle?: string
}

const BrandCtx = createContext<{ theme: Theme }>({ theme: {} })

export const BrandProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>({})
  useEffect(() => {
    // load theme from API
    fetch('/v1/menu').then(r => r.json()).then(data => {
      const cfg = data?.brand?.config || {}
      setTheme(cfg)
      const color = cfg.primaryColor || '#0ea5e9'
      const meta = document.querySelector('meta[name="theme-color"]')
      if (meta) meta.setAttribute('content', color)
    }).catch(() => {})
  }, [])
  return <BrandCtx.Provider value={{ theme }}>{children}</BrandCtx.Provider>
}

export const useBrand = () => useContext(BrandCtx)
