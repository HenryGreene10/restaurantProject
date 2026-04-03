export type BrandTheme = {
  name: string
  appTitle: string
  description: string
  logoUrl: string
  heroHeadline: string
  heroSubheadline: string
  heroBadgeText: string
  promoBannerText: string
  heroImageUrl: string
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
  heroLayout: "immersive" | "minimal"
  menuCardLayout: "classic" | "compact" | "photo-first"
  showCategoryChips: boolean
  showFeaturedBadges: boolean
  heroGradient: string
}

export type ThemeSource = "api" | "joesPizza" | "cleanMinimal"
