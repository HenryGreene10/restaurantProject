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

function parseHexColor(hex: string) {
  const normalized = hex.replace("#", "").trim()
  const expanded =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => `${char}${char}`)
          .join("")
      : normalized

  const value = Number.parseInt(expanded, 16)

  return {
    red: (value >> 16) & 255,
    green: (value >> 8) & 255,
    blue: value & 255,
  }
}

function toHexColor(red: number, green: number, blue: number) {
  return `#${[red, green, blue]
    .map((value) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, "0"))
    .join("")}`
}

function mixHexColors(base: string, overlay: string, alpha: number) {
  const background = parseHexColor(base)
  const foreground = parseHexColor(overlay)

  return toHexColor(
    background.red * (1 - alpha) + foreground.red * alpha,
    background.green * (1 - alpha) + foreground.green * alpha,
    background.blue * (1 - alpha) + foreground.blue * alpha,
  )
}

function clampToLightBackground(hex: string) {
  const { red, green, blue } = parseHexColor(hex)
  const brightestChannel = Math.max(red, green, blue)
  const minimumChannel = Math.max(224, 244 - Math.round(brightestChannel * 0.08))

  return toHexColor(
    Math.max(red, minimumChannel),
    Math.max(green, minimumChannel),
    Math.max(blue, minimumChannel),
  )
}

export function normalizeApiTheme(data: MenuResponse, tenantSlug: string): BrandTheme {
  const nestedBrand = asRecord(data.brand)
  const config =
    asRecord(data.brandConfig?.config) ??
    asRecord(nestedBrand?.config) ??
    nestedBrand
  const background =
    clampToLightBackground(
      pickString(config, "backgroundColor") ?? cleanMinimalTheme.palette.background,
    )
  const primary = pickString(config, "primaryColor") ?? cleanMinimalTheme.palette.primary

  return {
    name: pickString(config, "appTitle", "name") ?? tenantSlug,
    appTitle: pickString(config, "appTitle", "name") ?? tenantSlug,
    description:
      pickString(config, "tagline", "description") ??
      "Live brand config loaded from the API.",
    logoUrl: pickString(config, "logoUrl") ?? "",
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
      background,
      surface: pickString(config, "surfaceColor", "cardColor") ?? cleanMinimalTheme.palette.surface,
      text: pickString(config, "textColor") ?? cleanMinimalTheme.palette.text,
      muted: pickString(config, "mutedColor") ?? cleanMinimalTheme.palette.muted,
      border: pickString(config, "borderColor") ?? mixHexColors(background, primary, 0.24),
      primary,
      primaryForeground:
        pickString(config, "onPrimary", "primaryForegroundColor") ??
        cleanMinimalTheme.palette.primaryForeground,
      accent: pickString(config, "accentColor") ?? mixHexColors(background, primary, 0.18),
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
