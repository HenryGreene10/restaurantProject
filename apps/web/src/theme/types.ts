export type BrandTheme = {
  name: string
  appTitle: string
  description: string
  tenantSlug?: string
  palette: {
    background: string
    surface: string
    text: string
    muted: string
    border: string
    primary: string
    primaryForeground: string
    accent: string
  }
  typography: {
    bodyFont: string
    headingFont: string
  }
  shape: {
    radius: string
    shadow: string
  }
  heroGradient: string
}

export type ThemeSource = "api" | "joesPizza" | "cleanMinimal"

export type BrandConfigApiResponse = {
  brandConfig?: {
    config?: Record<string, unknown>
  } | null
  brand?: {
    config?: Record<string, unknown>
  } | Record<string, unknown> | null
}
