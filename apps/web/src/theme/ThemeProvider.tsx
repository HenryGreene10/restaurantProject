import { createContext, useContext, useLayoutEffect, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"

import { fetchTenantMenu } from "../lib/menu"
import { applyThemeVariables } from "./cssVariables"
import { normalizeApiTheme } from "./normalize"
import { joePizzaTheme, themePresets } from "./presets"
import { useThemePlaygroundStore } from "./store"
import type { BrandTheme } from "./types"

type ThemeContextValue = {
  theme: BrandTheme
  isLoading: boolean
  isLiveTheme: boolean
  errorMessage: string | null
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function liveThemeStorageKey(tenantSlug: string) {
  return `live-theme:${tenantSlug}`
}

function isBrandTheme(value: unknown): value is BrandTheme {
  if (!value || typeof value !== "object") {
    return false
  }

  const candidate = value as Partial<BrandTheme>
  return (
    typeof candidate.appTitle === "string" &&
    typeof candidate.logoUrl === "string" &&
    typeof candidate.heroHeadline === "string" &&
    typeof candidate.heroSubheadline === "string" &&
    typeof candidate.heroBadgeText === "string" &&
    typeof candidate.promoBannerText === "string" &&
    typeof candidate.heroImageUrl === "string" &&
    typeof candidate.palette?.background === "string" &&
    typeof candidate.palette?.surface === "string" &&
    typeof candidate.palette?.text === "string" &&
    typeof candidate.palette?.muted === "string" &&
    typeof candidate.palette?.border === "string" &&
    typeof candidate.palette?.primary === "string" &&
    typeof candidate.palette?.primaryForeground === "string" &&
    typeof candidate.palette?.accent === "string" &&
    typeof candidate.typography?.bodyFont === "string" &&
    typeof candidate.typography?.headingFont === "string" &&
    typeof candidate.shape?.radius === "string" &&
    typeof candidate.shape?.shadow === "string"
  )
}

function readStoredLiveTheme(tenantSlug: string) {
  if (typeof window === "undefined" || !tenantSlug) {
    return null
  }

  try {
    const raw = window.localStorage.getItem(liveThemeStorageKey(tenantSlug))
    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw) as unknown
    return isBrandTheme(parsed) ? parsed : null
  } catch {
    return null
  }
}

function apiFallbackTheme(tenantSlug: string) {
  return {
    ...joePizzaTheme,
    tenantSlug,
    name: tenantSlug || joePizzaTheme.name,
    appTitle: tenantSlug || joePizzaTheme.appTitle,
  } satisfies BrandTheme
}

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

  const cachedLiveTheme = useMemo(
    () => (source === "api" ? readStoredLiveTheme(tenantSlug) : null),
    [source, tenantSlug],
  )

  const theme = useMemo(() => {
    if (source === "api" && liveThemeQuery.data) {
      return normalizeApiTheme(liveThemeQuery.data, tenantSlug)
    }

    if (source === "api") {
      return cachedLiveTheme ?? apiFallbackTheme(tenantSlug)
    }

    if (source === "joesPizza") {
      return themePresets.joesPizza
    }

    return themePresets.cleanMinimal
  }, [cachedLiveTheme, liveThemeQuery.data, source, tenantSlug])

  useLayoutEffect(() => {
    applyThemeVariables(theme)
    if (tenantSlug) {
      document.title = theme.appTitle
    }
  }, [theme, tenantSlug])

  useLayoutEffect(() => {
    if (
      typeof window === "undefined" ||
      source !== "api" ||
      !tenantSlug ||
      !liveThemeQuery.data
    ) {
      return
    }

    const normalizedTheme = normalizeApiTheme(liveThemeQuery.data, tenantSlug)
    window.localStorage.setItem(
      liveThemeStorageKey(tenantSlug),
      JSON.stringify(normalizedTheme),
    )
  }, [liveThemeQuery.data, source, tenantSlug])

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
