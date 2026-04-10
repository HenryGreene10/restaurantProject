import { createContext, useContext, useEffect, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"

import { fetchTenantMenu } from "../lib/menu"
import { applyThemeVariables } from "./cssVariables"
import { normalizeApiTheme } from "./normalize"
import { themePresets } from "./presets"
import { useThemePlaygroundStore } from "./store"
import type { BrandTheme } from "./types"

type ThemeContextValue = {
  theme: BrandTheme
  isLoading: boolean
  isLiveTheme: boolean
  errorMessage: string | null
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { source, tenantSlug } = useThemePlaygroundStore()
  const liveThemeQuery = useQuery({
    queryKey: ["tenant-menu", tenantSlug],
    queryFn: () => fetchTenantMenu(tenantSlug),
    enabled: source === "api" && Boolean(tenantSlug),
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  })

  const theme = useMemo(() => {
    if (source === "api" && liveThemeQuery.data) {
      return normalizeApiTheme(liveThemeQuery.data, tenantSlug)
    }

    if (source === "joesPizza") {
      return themePresets.joesPizza
    }

    return themePresets.cleanMinimal
  }, [liveThemeQuery.data, source, tenantSlug])

  useEffect(() => {
    applyThemeVariables(theme)
    document.title = `${theme.appTitle} · Theme Playground`
  }, [theme])

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      isLoading: liveThemeQuery.isLoading,
      isLiveTheme: source === "api",
      errorMessage:
        liveThemeQuery.error instanceof Error ? liveThemeQuery.error.message : null,
    }),
    [liveThemeQuery.error, liveThemeQuery.isLoading, source, theme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)

  if (!context) {
    throw new Error("useTheme must be used inside ThemeProvider")
  }

  return context
}
