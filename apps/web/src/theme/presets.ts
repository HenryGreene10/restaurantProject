import type { BrandTheme } from "./types"

export const joePizzaTheme: BrandTheme = {
  name: "Joe's Pizza",
  appTitle: "Joe's Pizza",
  description: "Warm casual neighborhood pizza ordering theme.",
  logoUrl: "",
  heroHeadline: "Pizza night without marketplace markup.",
  heroSubheadline: "Direct ordering keeps the experience branded and the customer relationship owned by the restaurant.",
  heroBadgeText: "Warm casual theme",
  promoBannerText: "Try the direct-order welcome offer and keep ordering through the restaurant.",
  heroImageUrl: "",
  tenantSlug: "joes-pizza",
  palette: {
    background: "#faf7f2",
    surface: "#fffcf7",
    text: "#271c17",
    muted: "#745e54",
    border: "#e8dcd1",
    primary: "#c25325",
    primaryForeground: "#fff7f1",
    accent: "#ecaa34",
  },
  typography: {
    bodyFont: '"Inter", sans-serif',
    headingFont: '"Bree Serif", serif',
  },
  shape: {
    radius: "24px",
    shadow: "0 18px 48px rgba(39, 28, 23, 0.12)",
  },
  heroLayout: "immersive",
  menuCardLayout: "classic",
  showCategoryChips: true,
  showFeaturedBadges: true,
  heroGradient:
    "linear-gradient(135deg, rgba(194, 83, 37, 0.15), rgba(236, 170, 52, 0.25))",
}

export const cleanMinimalTheme: BrandTheme = {
  name: "Clean Minimal",
  appTitle: "Daily Counter",
  description: "Clean minimal storefront with quieter contrast and sharper lines.",
  logoUrl: "",
  heroHeadline: "Clean ordering flow for a modern storefront.",
  heroSubheadline: "Minimal presentation, strong hierarchy, and just enough contrast for food-forward browsing.",
  heroBadgeText: "Minimal theme",
  promoBannerText: "Design-forward preset for tighter brand systems.",
  heroImageUrl: "",
  palette: {
    background: "#f5f7fb",
    surface: "#ffffff",
    text: "#0f172a",
    muted: "#64748b",
    border: "#dbe4f0",
    primary: "#0f172a",
    primaryForeground: "#f8fafc",
    accent: "#38bdf8",
  },
  typography: {
    bodyFont: '"Inter", sans-serif',
    headingFont: '"Inter", sans-serif',
  },
  shape: {
    radius: "18px",
    shadow: "0 18px 44px rgba(15, 23, 42, 0.08)",
  },
  heroLayout: "minimal",
  menuCardLayout: "compact",
  showCategoryChips: true,
  showFeaturedBadges: false,
  heroGradient:
    "linear-gradient(135deg, rgba(15, 23, 42, 0.08), rgba(56, 189, 248, 0.14))",
}

export const themePresets = {
  joesPizza: joePizzaTheme,
  cleanMinimal: cleanMinimalTheme,
} satisfies Record<string, BrandTheme>
