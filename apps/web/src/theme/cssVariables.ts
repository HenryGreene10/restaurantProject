import type { BrandTheme } from "./types"

function hexToRgbTriplet(hex: string) {
  const normalized = hex.replace("#", "").trim()
  const expanded =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => `${char}${char}`)
          .join("")
      : normalized

  const value = Number.parseInt(expanded, 16)
  const red = (value >> 16) & 255
  const green = (value >> 8) & 255
  const blue = value & 255

  return `${red} ${green} ${blue}`
}

export function applyThemeVariables(theme: BrandTheme) {
  const root = document.documentElement

  root.style.setProperty("--color-brand-background", hexToRgbTriplet(theme.palette.background))
  root.style.setProperty("--color-brand-surface", hexToRgbTriplet(theme.palette.surface))
  root.style.setProperty("--color-brand-text", hexToRgbTriplet(theme.palette.text))
  root.style.setProperty("--color-brand-muted", hexToRgbTriplet(theme.palette.muted))
  root.style.setProperty("--color-brand-border", hexToRgbTriplet(theme.palette.border))
  root.style.setProperty("--color-brand-primary", hexToRgbTriplet(theme.palette.primary))
  root.style.setProperty(
    "--color-brand-primary-foreground",
    hexToRgbTriplet(theme.palette.primaryForeground),
  )
  root.style.setProperty("--color-brand-accent", hexToRgbTriplet(theme.palette.accent))
  root.style.setProperty("--radius-brand", theme.shape.radius)
  root.style.setProperty("--shadow-brand", theme.shape.shadow)
  root.style.setProperty("--font-body", theme.typography.bodyFont)
  root.style.setProperty("--font-heading", theme.typography.headingFont)
  root.style.setProperty("--gradient-brand-hero", theme.heroGradient)
}
