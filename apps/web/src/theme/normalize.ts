import { cleanMinimalTheme } from "./presets"
import type { BrandConfigApiResponse, BrandTheme } from "./types"

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

export function normalizeApiTheme(data: BrandConfigApiResponse, tenantSlug: string): BrandTheme {
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
      radius: pickString(config, "radius") ?? cleanMinimalTheme.shape.radius,
      shadow: pickString(config, "shadow") ?? cleanMinimalTheme.shape.shadow,
    },
    heroGradient:
      pickString(config, "heroGradient") ?? cleanMinimalTheme.heroGradient,
  }
}
