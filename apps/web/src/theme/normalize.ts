import { cleanMinimalTheme } from "./presets"
import type { MenuResponse } from "../lib/menu"
import type { BrandTheme } from "./types"

type LooseConfig = Record<string, unknown>

function asRecord(value: unknown): LooseConfig | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null
  }

  return value as LooseConfig
}

function pickString(config: LooseConfig | null, ...keys: string[]) {
  for (const key of keys) {
    const value = config?.[key]
    if (typeof value === "string" && value.trim()) {
      return value
    }
  }

  return undefined
}

export function normalizeApiTheme(data: MenuResponse, tenantSlug: string): BrandTheme {
  const nestedBrand = asRecord(data.brand)
  const config =
    asRecord(data.brandConfig?.config) ??
    asRecord(nestedBrand?.config) ??
    nestedBrand

  return {
    name: pickString(config, "appTitle", "name") ?? tenantSlug,
    appTitle: pickString(config, "appTitle", "name") ?? tenantSlug,
    description:
      pickString(config, "tagline", "description") ??
      "Live brand config loaded from the API.",
    heroHeadline:
      pickString(config, "heroHeadline") ??
      pickString(config, "appTitle", "name") ??
      tenantSlug,
    heroSubheadline:
      pickString(config, "heroSubheadline", "tagline", "description") ??
      "Live brand config loaded from the API.",
    heroBadgeText: pickString(config, "heroBadgeText") ?? "Live API theme",
    promoBannerText: pickString(config, "promoBannerText") ?? "",
    heroImageUrl: pickString(config, "heroImageUrl") ?? "",
    tenantSlug,
    palette: {
      background: pickString(config, "backgroundColor") ?? cleanMinimalTheme.palette.background,
      surface: pickString(config, "surfaceColor", "cardColor") ?? cleanMinimalTheme.palette.surface,
      text: pickString(config, "textColor") ?? cleanMinimalTheme.palette.text,
      muted: pickString(config, "mutedColor") ?? cleanMinimalTheme.palette.muted,
      border: pickString(config, "borderColor") ?? cleanMinimalTheme.palette.border,
      primary: pickString(config, "primaryColor") ?? cleanMinimalTheme.palette.primary,
      primaryForeground:
        pickString(config, "onPrimary", "primaryForegroundColor") ??
        cleanMinimalTheme.palette.primaryForeground,
      accent: pickString(config, "accentColor") ?? cleanMinimalTheme.palette.accent,
    },
    typography: {
      bodyFont: pickString(config, "fontFamily", "bodyFont") ?? cleanMinimalTheme.typography.bodyFont,
      headingFont:
        pickString(config, "headingFont", "fontFamily") ?? cleanMinimalTheme.typography.headingFont,
    },
    shape: {
      radius:
        (typeof config?.radius === "number" ? `${config.radius}px` : undefined) ??
        pickString(config, "radius") ??
        cleanMinimalTheme.shape.radius,
      shadow: pickString(config, "shadow") ?? cleanMinimalTheme.shape.shadow,
    },
    heroLayout:
      config?.heroLayout === "immersive" || config?.heroLayout === "minimal"
        ? config.heroLayout
        : cleanMinimalTheme.heroLayout,
    menuCardLayout:
      config?.menuCardLayout === "compact" || config?.menuCardLayout === "photo-first"
        ? config.menuCardLayout
        : cleanMinimalTheme.menuCardLayout,
    showCategoryChips:
      typeof config?.showCategoryChips === "boolean"
        ? config.showCategoryChips
        : cleanMinimalTheme.showCategoryChips,
    showFeaturedBadges:
      typeof config?.showFeaturedBadges === "boolean"
        ? config.showFeaturedBadges
        : cleanMinimalTheme.showFeaturedBadges,
    heroGradient:
      pickString(config, "heroGradient") ?? cleanMinimalTheme.heroGradient,
  }
}
