import React, { useEffect, useMemo, useState } from "react"
import { UserButton, useAuth, useUser } from "@clerk/react"
import {
  DndContext,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { AnimatePresence, motion } from "framer-motion"
import { Eye, EyeOff, ImageIcon, Palette, Sparkles, Star, Trash2 } from "lucide-react"

import { AssistantPanel } from "../assistant/AssistantPanel"
import { fetchTenantMenu, type MenuCategory, type MenuResponse } from "../lib/menu"
import { adminFetchJson } from "../lib/api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

type ThemeDraft = {
  appTitle: string
  tagline: string
  logoUrl: string
  heroHeadline: string
  heroSubheadline: string
  heroBadgeText: string
  promoBannerText: string
  heroImageUrl: string
  primaryColor: string
  accentColor: string
  backgroundColor: string
  surfaceColor: string
  textColor: string
  mutedColor: string
  borderColor: string
  onPrimary: string
  bodyFont: string
  headingFont: string
  radius: number
  buttonStyle: "rounded" | "square"
  heroLayout: "immersive" | "minimal"
  menuCardLayout: "classic" | "compact" | "photo-first"
  showFeaturedBadges: boolean
  showCategoryChips: boolean
}

const defaultThemeDraft: ThemeDraft = {
  appTitle: "Restaurant",
  tagline: "Direct ordering, owned by the restaurant.",
  logoUrl: "",
  heroHeadline: "Neighborhood favorites without marketplace markup.",
  heroSubheadline: "Make repeat visits easier with direct ordering and better menu presentation.",
  heroBadgeText: "Direct ordering",
  promoBannerText: "Give loyal customers a direct-order reward funded by marketplace savings.",
  heroImageUrl: "",
  primaryColor: "#b42318",
  accentColor: "#eca934",
  backgroundColor: "#faf7f2",
  surfaceColor: "#fffcf7",
  textColor: "#271c17",
  mutedColor: "#745e54",
  borderColor: "#e8dcd1",
  onPrimary: "#fff7ed",
  bodyFont: "Inter, sans-serif",
  headingFont: "Georgia, serif",
  radius: 12,
  buttonStyle: "rounded",
  heroLayout: "minimal",
  menuCardLayout: "photo-first",
  showFeaturedBadges: true,
  showCategoryChips: true,
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function getBrandConfig(menu: MenuResponse) {
  const nested = asRecord(menu.brand)
  return asRecord(menu.brandConfig?.config) ?? asRecord(nested?.config) ?? nested ?? {}
}

function getString(config: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = config[key]
    if (typeof value === "string" && value.trim()) {
      return value
    }
  }

  return undefined
}

function buildDraft(menu: MenuResponse): ThemeDraft {
  const config = getBrandConfig(menu)
  const primaryColor = getString(config, "primaryColor") ?? defaultThemeDraft.primaryColor
  const backgroundColor = clampToLightBackground(
    getString(config, "backgroundColor") ?? defaultThemeDraft.backgroundColor,
  )

  return {
    ...defaultThemeDraft,
    appTitle: getString(config, "appTitle") ?? defaultThemeDraft.appTitle,
    tagline: getString(config, "tagline") ?? defaultThemeDraft.tagline,
    logoUrl: getString(config, "logoUrl") ?? defaultThemeDraft.logoUrl,
    heroHeadline: getString(config, "heroHeadline") ?? defaultThemeDraft.heroHeadline,
    heroSubheadline: getString(config, "heroSubheadline") ?? defaultThemeDraft.heroSubheadline,
    heroBadgeText: getString(config, "heroBadgeText") ?? defaultThemeDraft.heroBadgeText,
    promoBannerText: getString(config, "promoBannerText") ?? defaultThemeDraft.promoBannerText,
    heroImageUrl: getString(config, "heroImageUrl") ?? defaultThemeDraft.heroImageUrl,
    primaryColor,
    accentColor: derivedAccentColor(primaryColor),
    backgroundColor,
    surfaceColor: defaultThemeDraft.surfaceColor,
    textColor: defaultThemeDraft.textColor,
    mutedColor: defaultThemeDraft.mutedColor,
    borderColor: derivedBorderColor(primaryColor, backgroundColor),
    onPrimary: getString(config, "onPrimary") ?? defaultThemeDraft.onPrimary,
    bodyFont: getString(config, "fontFamily", "bodyFont") ?? defaultThemeDraft.bodyFont,
    headingFont: getString(config, "headingFont") ?? defaultThemeDraft.headingFont,
    radius: defaultThemeDraft.radius,
    buttonStyle: defaultThemeDraft.buttonStyle,
    heroLayout: defaultThemeDraft.heroLayout,
    menuCardLayout: defaultThemeDraft.menuCardLayout,
    showFeaturedBadges: defaultThemeDraft.showFeaturedBadges,
    showCategoryChips: defaultThemeDraft.showCategoryChips,
  }
}

type AdminTab = "branding" | "menu"
type AdminShellView = "assistant" | "controls"
type ThemeChangeHandler = <K extends keyof ThemeDraft>(key: K, value: ThemeDraft[K]) => void
type CategoryItemEntry = MenuCategory["categoryItems"][number]

function areThemesEqual(left: ThemeDraft, right: ThemeDraft) {
  return JSON.stringify(left) === JSON.stringify(right)
}

function themePayload(theme: ThemeDraft) {
  const backgroundColor = clampToLightBackground(theme.backgroundColor)
  const accentColor = derivedAccentColor(theme.primaryColor)
  const borderColor = derivedBorderColor(theme.primaryColor, backgroundColor)

  return {
    appTitle: theme.appTitle,
    tagline: theme.tagline,
    logoUrl: theme.logoUrl,
    heroHeadline: theme.heroHeadline,
    heroSubheadline: theme.heroSubheadline,
    heroBadgeText: theme.heroBadgeText,
    promoBannerText: theme.promoBannerText,
    heroImageUrl: theme.heroImageUrl,
    primaryColor: theme.primaryColor,
    accentColor,
    backgroundColor,
    surfaceColor: defaultThemeDraft.surfaceColor,
    textColor: defaultThemeDraft.textColor,
    mutedColor: defaultThemeDraft.mutedColor,
    borderColor,
    onPrimary: theme.onPrimary,
    fontFamily: theme.bodyFont,
    headingFont: theme.headingFont,
    radius: defaultThemeDraft.radius,
    buttonStyle: defaultThemeDraft.buttonStyle,
    heroLayout: defaultThemeDraft.heroLayout,
    menuCardLayout: defaultThemeDraft.menuCardLayout,
    showFeaturedBadges: defaultThemeDraft.showFeaturedBadges,
    showCategoryChips: defaultThemeDraft.showCategoryChips,
  }
}

const FONT_OPTIONS = [
  { label: "Inter", value: '"Inter", sans-serif' },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Playfair Display", value: '"Playfair Display", serif' },
  { label: "Lora", value: '"Lora", serif' },
  { label: "Merriweather", value: '"Merriweather", serif' },
  { label: "Raleway", value: '"Raleway", sans-serif' },
  { label: "Montserrat", value: '"Montserrat", sans-serif' },
  { label: "Nunito", value: '"Nunito", sans-serif' },
  { label: "DM Sans", value: '"DM Sans", sans-serif' },
  { label: "DM Serif Display", value: '"DM Serif Display", serif' },
  { label: "Fraunces", value: '"Fraunces", serif' },
  { label: "Cabinet Grotesk", value: '"Cabinet Grotesk", sans-serif' },
  { label: "Plus Jakarta Sans", value: '"Plus Jakarta Sans", sans-serif' },
  { label: "Libre Baskerville", value: '"Libre Baskerville", serif' },
  { label: "Cormorant Garamond", value: '"Cormorant Garamond", serif' },
] as const

function hexToRgba(hex: string, alpha: number) {
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

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`
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

function derivedAccentColor(primaryColor: string) {
  return mixHexColors(defaultThemeDraft.backgroundColor, primaryColor, 0.18)
}

function derivedBorderColor(primaryColor: string, backgroundColor: string) {
  return mixHexColors(backgroundColor, primaryColor, 0.24)
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result)
        return
      }

      reject(new Error("Failed to read file"))
    }
    reader.onerror = () => reject(new Error("Failed to read file"))
    reader.readAsDataURL(file)
  })
}

function formatPrice(priceCents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(priceCents / 100)
}

function tenantSlugFromMetadata(value: unknown) {
  if (typeof value !== "string") {
    return null
  }

  const nextValue = value.trim()
  return nextValue.length > 0 ? nextValue : null
}

function previewCategories(categories: MenuCategory[]) {
  return categories
    .filter((category) => category.visibility !== "HIDDEN")
    .map((category) => ({
      ...category,
      categoryItems: category.categoryItems.filter((entry) => entry.item.visibility !== "HIDDEN"),
    }))
    .filter((category) => category.categoryItems.length > 0)
}

function previewStyle(theme: ThemeDraft): React.CSSProperties {
  const backgroundColor = clampToLightBackground(theme.backgroundColor)
  const accentColor = derivedAccentColor(theme.primaryColor)
  const borderColor = derivedBorderColor(theme.primaryColor, backgroundColor)

  return {
    ["--preview-primary" as string]: theme.primaryColor,
    ["--preview-accent" as string]: accentColor,
    ["--preview-background" as string]: backgroundColor,
    ["--preview-surface" as string]: defaultThemeDraft.surfaceColor,
    ["--preview-text" as string]: defaultThemeDraft.textColor,
    ["--preview-muted" as string]: defaultThemeDraft.mutedColor,
    ["--preview-border" as string]: borderColor,
    ["--preview-on-primary" as string]: theme.onPrimary,
    ["--preview-radius" as string]: `${defaultThemeDraft.radius}px`,
    ["--preview-body-font" as string]: theme.bodyFont,
    ["--preview-heading-font" as string]: theme.headingFont,
  } as React.CSSProperties
}

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <Card className="gap-0 border border-border/80 bg-card py-0 shadow-sm">
      <CardHeader className="gap-1 border-b border-border/70 px-6 py-5">
        <CardTitle>{title}</CardTitle>
        {subtitle ? <CardDescription>{subtitle}</CardDescription> : null}
      </CardHeader>
      <CardContent className="px-6 py-6">{children}</CardContent>
    </Card>
  )
}

function PreviewPane({
  theme,
  categories,
}: {
  theme: ThemeDraft
  categories: MenuCategory[]
}) {
  const cardRadius = defaultThemeDraft.radius
  const visible = previewCategories(categories)

  return (
    <div
      className="min-h-[860px] rounded-[calc(var(--radius)*1.2)] border border-border/70 bg-card p-5 shadow-sm"
      style={{
        ...previewStyle(theme),
        fontFamily: "var(--preview-body-font)",
      }}
    >
      <div
        style={{
          minHeight: "100%",
          borderRadius: "24px",
          background: "var(--preview-background)",
          color: "var(--preview-text)",
          padding: 24,
          boxShadow: "var(--shadow-brand)",
        }}
      >
        <div
          style={{
            borderRadius: cardRadius,
            padding: "22px 22px 16px",
            background: theme.heroImageUrl
              ? `linear-gradient(${hexToRgba("#271c17", 0.48)}, ${hexToRgba("#271c17", 0.48)}), url(${theme.heroImageUrl}) center/cover`
              : `linear-gradient(135deg, ${hexToRgba(theme.primaryColor, 0.14)}, ${hexToRgba(theme.primaryColor, 0.1)}), var(--preview-surface)`,
            border: "1px solid var(--preview-border)",
            display: "grid",
            gap: 18,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start" }}>
            {theme.logoUrl ? (
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 12,
                  border: "1px solid var(--preview-border)",
                  background: `url(${theme.logoUrl}) center/contain no-repeat, var(--preview-surface)`,
                  flexShrink: 0,
                }}
              />
            ) : (
              <div />
            )}
            {theme.heroBadgeText.trim() ? (
              <div
                style={{
                  display: "inline-flex",
                  width: "fit-content",
                  borderRadius: cardRadius,
                  padding: "6px 10px",
                  background: hexToRgba("#fffcf7", 0.84),
                  border: "1px solid var(--preview-border)",
                  color: "var(--preview-muted)",
                  fontSize: 12,
                }}
              >
                {theme.heroBadgeText}
              </div>
            ) : (
              <div />
            )}
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            <h1
              style={{
                margin: 0,
                fontFamily: "var(--preview-heading-font)",
                fontSize: 56,
                lineHeight: 0.95,
                fontWeight: 700,
                maxWidth: 760,
                color: theme.heroImageUrl ? "#fff7ed" : "var(--preview-text)",
              }}
            >
              {theme.heroHeadline}
            </h1>
            <p
              style={{
                margin: 0,
                color: theme.heroImageUrl ? hexToRgba("#fff7ed", 0.84) : "var(--preview-muted)",
                maxWidth: 620,
                lineHeight: 1.7,
                fontSize: 19,
              }}
            >
              {theme.heroSubheadline}
            </p>
          </div>
          {theme.showCategoryChips ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {visible.map((category) => (
                <span
                  key={category.id}
                  style={{
                    borderRadius: cardRadius,
                    border: "1px solid var(--preview-border)",
                    background: "var(--preview-surface)",
                    color: "var(--preview-text)",
                    padding: "7px 12px",
                    fontSize: 13,
                  }}
                >
                  {category.name}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        {theme.promoBannerText ? (
          <div
            style={{
              marginTop: 16,
              borderRadius: cardRadius,
              border: "1px solid var(--preview-border)",
              background: "var(--preview-surface)",
              color: "var(--preview-muted)",
              padding: "13px 16px",
              fontSize: 14,
              lineHeight: 1.55,
            }}
          >
            {theme.promoBannerText}
          </div>
        ) : null}

        <div style={{ display: "grid", gap: 22, marginTop: 22 }}>
          {visible.map((category) => (
            <section key={category.id} style={{ display: "grid", gap: 12 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 16,
                }}
              >
                <h2
                  style={{
                    margin: 0,
                    fontFamily: "var(--preview-heading-font)",
                    fontSize: 30,
                    fontWeight: 700,
                  }}
                >
                  {category.name}
                </h2>
                <span style={{ color: "var(--preview-muted)", fontSize: 13 }}>
                  {category.categoryItems.length} items
                </span>
              </div>

              <div style={{ display: "grid", gap: 12 }}>
                {category.categoryItems.map(({ id, item }) => (
                  <article
                    key={id}
                    style={{
                      borderRadius: cardRadius,
                      padding: theme.menuCardLayout === "compact" ? 14 : 18,
                      border: "1px solid var(--preview-border)",
                      background: "var(--preview-surface)",
                      display: "grid",
                      gap: 12,
                      opacity: item.visibility === "SOLD_OUT" ? 0.76 : 1,
                      gridTemplateColumns: item.photoUrl ? "132px minmax(0, 1fr)" : "1fr",
                    }}
                  >
                    {item.photoUrl ? (
                      <div
                        style={{
                          minHeight: 124,
                          borderRadius: Math.max(12, cardRadius - 8),
                          border: "1px solid var(--preview-border)",
                          background: `url(${item.photoUrl}) center/cover`,
                        }}
                      />
                    ) : null}

                    <div style={{ display: "grid", gap: 12 }}>
                      <div style={{ display: "grid", gap: 8 }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            gap: 16,
                          }}
                        >
                          <div style={{ display: "grid", gap: 8 }}>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                flexWrap: "wrap",
                                gap: 8,
                              }}
                            >
                              <h3
                                style={{
                                  margin: 0,
                                  fontSize: 20,
                                  fontWeight: 600,
                                  fontFamily: "var(--preview-heading-font)",
                                }}
                              >
                                {item.name}
                              </h3>
                              {theme.showFeaturedBadges && item.isFeatured ? (
                                <span
                                  style={{
                                    borderRadius: cardRadius,
                                    border: "1px solid transparent",
                                    background: "var(--preview-primary)",
                                    color: "var(--preview-on-primary)",
                                    fontSize: 11,
                                    padding: "4px 8px",
                                  }}
                                >
                                  Featured
                                </span>
                              ) : null}
                              {item.visibility === "SOLD_OUT" ? (
                                <span
                                  style={{
                                    borderRadius: cardRadius,
                                    border: "1px solid var(--preview-border)",
                                    background: "var(--preview-surface)",
                                    color: "var(--preview-muted)",
                                    fontSize: 11,
                                    padding: "4px 8px",
                                  }}
                                >
                                  Sold out
                                </span>
                              ) : null}
                            </div>
                            {item.description ? (
                              <p
                                style={{
                                  margin: 0,
                                  color: "var(--preview-muted)",
                                  lineHeight: 1.55,
                                }}
                              >
                                {item.description}
                              </p>
                            ) : null}
                          </div>
                          <strong>{formatPrice(item.variants[0]?.priceCents ?? item.basePriceCents)}</strong>
                        </div>

                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                          {item.tags.slice(0, 1).map((tag) => (
                            <span
                              key={tag}
                              style={{
                                borderRadius: cardRadius,
                                border: "1px solid var(--preview-border)",
                                color: "var(--preview-muted)",
                                fontSize: 12,
                                padding: "4px 8px",
                              }}
                            >
                              {tag}
                            </span>
                          ))}
                          {item.prepTimeMinutes ? (
                            <span style={{ color: "var(--preview-muted)", fontSize: 12 }}>
                              {item.prepTimeMinutes} min prep
                            </span>
                          ) : null}
                        </div>
                      </div>

                      {item.visibility === "SOLD_OUT" ? (
                        <div style={{ color: "var(--preview-muted)", fontSize: 14, textAlign: "right" }}>Sold out today</div>
                      ) : (
                        <div style={{ display: "flex", justifyContent: "flex-end" }}>
                          <button
                            type="button"
                            style={{
                              width: "fit-content",
                              borderRadius: cardRadius,
                              border: "1px solid transparent",
                              padding: "10px 14px",
                              background: "var(--preview-primary)",
                              color: "var(--preview-on-primary)",
                              fontWeight: 600,
                            }}
                          >
                            Add
                          </button>
                        </div>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}

export const App: React.FC = () => {
  const { getToken } = useAuth()
  const { isLoaded, user } = useUser()
  const tenantSlug = tenantSlugFromMetadata(user?.publicMetadata?.tenantSlug)
  const linkedTenantSlug = tenantSlug ?? ""
  const [menuData, setMenuData] = useState<MenuResponse | null>(null)
  const [savedTheme, setSavedTheme] = useState<ThemeDraft>(defaultThemeDraft)
  const [draftTheme, setDraftTheme] = useState<ThemeDraft>(defaultThemeDraft)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [menuActionMessage, setMenuActionMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<AdminTab>("branding")
  const [activeShellView, setActiveShellView] = useState<AdminShellView>("assistant")

  async function patchAdminJson<T>(path: string, body: unknown) {
    return adminFetchJson<T>(path, {
      method: "PATCH",
      tenantSlug: linkedTenantSlug,
      getToken,
      body,
    })
  }

  async function postAdminJson<T>(path: string, body: unknown) {
    return adminFetchJson<T>(path, {
      method: "POST",
      tenantSlug: linkedTenantSlug,
      getToken,
      body,
    })
  }

  async function deleteAdmin(path: string) {
    await adminFetchJson<void>(path, {
      method: "DELETE",
      tenantSlug: linkedTenantSlug,
      getToken,
    })
  }

  useEffect(() => {
    if (!isLoaded) {
      return
    }

    if (!tenantSlug) {
      setIsLoading(false)
      setMenuData(null)
      setSavedTheme(defaultThemeDraft)
      setDraftTheme(defaultThemeDraft)
      setError(null)
      return
    }

    let cancelled = false

    async function load() {
      setIsLoading(true)
      setError(null)
      setSaveMessage(null)
      setMenuActionMessage(null)

      try {
        const menu = await fetchTenantMenu(linkedTenantSlug, getToken)
        if (cancelled) return
        const nextTheme = buildDraft(menu)
        setMenuData(menu)
        setSavedTheme(nextTheme)
        setDraftTheme(nextTheme)
      } catch (nextError) {
        if (cancelled) return
        setError(nextError instanceof Error ? nextError.message : "Failed to load menu")
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [getToken, isLoaded, linkedTenantSlug, tenantSlug])

  if (!isLoaded) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-background px-6 py-10">
        <div className="text-sm text-muted-foreground">Loading admin…</div>
      </main>
    )
  }

  if (!tenantSlug) {
    return (
      <motion.main
        className="mx-auto flex min-h-[100dvh] w-full max-w-[960px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
      >
        <header className="flex items-start justify-between gap-4">
          <div className="grid gap-3">
            <Badge variant="outline" className="w-fit border-border bg-background text-muted-foreground">
              Restaurant admin dashboard
            </Badge>
            <div className="grid gap-2">
              <h1 className="font-heading text-4xl text-foreground sm:text-5xl">
                Storefront customization
              </h1>
              <p className="max-w-3xl text-base leading-7 text-muted-foreground">
                Your account needs a restaurant link before the admin tools can load.
              </p>
            </div>
          </div>
          <UserButton />
        </header>

        <SectionCard title="Account setup" subtitle="Restaurant access is managed through Clerk user metadata.">
          <div className="rounded-[var(--radius)] border border-destructive/20 bg-destructive/10 px-4 py-4 text-sm text-destructive">
            Your account is not linked to a restaurant. Contact support.
          </div>
        </SectionCard>
      </motion.main>
    )
  }

  const categories = menuData?.categories ?? []
  const isThemeDirty = useMemo(
    () => !areThemesEqual(savedTheme, draftTheme),
    [draftTheme, savedTheme],
  )

  const updateTheme = <K extends keyof ThemeDraft>(key: K, value: ThemeDraft[K]) => {
    setDraftTheme((current) => ({ ...current, [key]: value }))
    setSaveMessage(null)
  }

  const updateMenuCategories = (
    updater: (categories: MenuCategory[]) => MenuCategory[],
  ) => {
    setMenuData((current) => {
      if (!current) {
        return current
      }

      return {
        ...current,
        categories: updater(current.categories),
      }
    })
  }

  const reloadMenuData = async (syncTheme = false) => {
    if (!tenantSlug) {
      throw new Error("Your account is not linked to a restaurant. Contact support.")
    }

    const refreshedMenu = await fetchTenantMenu(linkedTenantSlug, getToken)
    setMenuData(refreshedMenu)
    if (syncTheme) {
      const nextTheme = buildDraft(refreshedMenu)
      setSavedTheme(nextTheme)
      setDraftTheme(nextTheme)
    }
    return refreshedMenu
  }

  const saveTheme = async () => {
    if (!tenantSlug) {
      setSaveMessage("Your account is not linked to a restaurant. Contact support.")
      return
    }

    setIsSaving(true)
    setSaveMessage(null)

    try {
      await patchAdminJson("/admin/brand-config", themePayload(draftTheme))

      await reloadMenuData(true)
      setSaveMessage("Storefront settings saved.")
    } catch (nextError) {
      setSaveMessage(nextError instanceof Error ? nextError.message : "Failed to save theme")
    } finally {
      setIsSaving(false)
    }
  }

  const reorderCategories = async (nextCategoryIds: string[]) => {
    if (!menuData) return

    const categoryById = new Map(categories.map((category) => [category.id, category]))
    const reordered = nextCategoryIds
      .map((categoryId) => categoryById.get(categoryId))
      .filter((category): category is MenuCategory => Boolean(category))
      .map((category, index) => ({ ...category, sortOrder: index }))

    updateMenuCategories(() => reordered)

    try {
      setMenuActionMessage("Saving category order…")
      await Promise.all(
        reordered.map((category, index) =>
          patchAdminJson(`/admin/menu/categories/${category.id}`, {
            sortOrder: index,
          }),
        ),
      )
      await reloadMenuData()
      setMenuActionMessage("Category order saved.")
    } catch (nextError) {
      await reloadMenuData()
      setMenuActionMessage(
        nextError instanceof Error ? nextError.message : "Failed to reorder categories",
      )
    }
  }

  const updateCategoryVisibility = async (
    categoryId: string,
    visibility: MenuCategory["visibility"],
  ) => {
    const previousCategories = categories

    updateMenuCategories((current) =>
      current.map((category) =>
        category.id === categoryId ? { ...category, visibility } : category,
      ),
    )

    try {
      setMenuActionMessage("Saving category visibility…")
      await patchAdminJson(`/admin/menu/categories/${categoryId}/availability`, {
        visibility,
      })
      await reloadMenuData()
      setMenuActionMessage("Category visibility updated.")
    } catch (nextError) {
      updateMenuCategories(() => previousCategories)
      setMenuActionMessage(
        nextError instanceof Error ? nextError.message : "Failed to update category visibility",
      )
    }
  }

  const reorderCategoryItem = async (categoryId: string, nextItemIds: string[]) => {
    const category = categories.find((entry) => entry.id === categoryId)
    if (!category) return

    const entryByItemId = new Map(
      category.categoryItems.map((entry) => [entry.item.id, entry]),
    )
    const reorderedEntries = nextItemIds
      .map((itemId) => entryByItemId.get(itemId))
      .filter((entry): entry is CategoryItemEntry => Boolean(entry))
      .map((entry, index) => ({
        ...entry,
        sortOrder: index,
      }))

    const previousCategories = categories
    updateMenuCategories((current) =>
      current.map((entry) =>
        entry.id === categoryId
          ? { ...entry, categoryItems: reorderedEntries }
          : entry,
      ),
    )

    try {
      setMenuActionMessage("Saving item order…")
      await patchAdminJson(`/admin/menu/categories/${categoryId}/items/reorder`, {
        itemIds: nextItemIds,
      })
      await reloadMenuData()
      setMenuActionMessage("Item order saved.")
    } catch (nextError) {
      updateMenuCategories(() => previousCategories)
      setMenuActionMessage(nextError instanceof Error ? nextError.message : "Failed to reorder items")
    }
  }

  const updateItemPresentation = async (
    itemId: string,
    body: Record<string, unknown>,
    successMessage: string,
  ) => {
    const previousCategories = categories
    updateMenuCategories((current) =>
      current.map((category) => ({
        ...category,
        categoryItems: category.categoryItems.map((entry) =>
          entry.item.id === itemId
            ? {
                ...entry,
                item: {
                  ...entry.item,
                  ...(typeof body.isFeatured === "boolean"
                    ? { isFeatured: body.isFeatured }
                    : {}),
                  ...(Object.prototype.hasOwnProperty.call(body, "photoUrl")
                    ? { photoUrl: (body.photoUrl as string | null | undefined) ?? null }
                    : {}),
                },
              }
            : entry,
        ),
      })),
    )

    try {
      setMenuActionMessage("Saving item settings…")
      await patchAdminJson(`/admin/menu/items/${itemId}`, body)
      await reloadMenuData()
      setMenuActionMessage(successMessage)
    } catch (nextError) {
      updateMenuCategories(() => previousCategories)
      setMenuActionMessage(nextError instanceof Error ? nextError.message : "Failed to update item")
    }
  }

  const updateItemVisibility = async (
    itemId: string,
    visibility: CategoryItemEntry["item"]["visibility"],
  ) => {
    const previousCategories = categories
    updateMenuCategories((current) =>
      current.map((category) => ({
        ...category,
        categoryItems: category.categoryItems.map((entry) =>
          entry.item.id === itemId
            ? {
                ...entry,
                item: {
                  ...entry.item,
                  visibility,
                },
              }
            : entry,
        ),
      })),
    )

    try {
      setMenuActionMessage(
        visibility === "HIDDEN"
          ? "Hiding item…"
          : visibility === "SOLD_OUT"
            ? "Marking item sold out…"
            : "Updating item visibility…",
      )
      await patchAdminJson(`/admin/menu/items/${itemId}/availability`, { visibility })
      await reloadMenuData()
      setMenuActionMessage(
        visibility === "HIDDEN"
          ? "Item hidden."
          : visibility === "SOLD_OUT"
            ? "Item marked sold out."
            : "Item shown.",
      )
    } catch (nextError) {
      updateMenuCategories(() => previousCategories)
      setMenuActionMessage(nextError instanceof Error ? nextError.message : "Failed to update availability")
    }
  }

  const addItemToCategory = async (
    categoryId: string,
    input: { name: string; description: string; priceCents: number },
  ) => {
    const category = categories.find((entry) => entry.id === categoryId)
    if (!category) return

    try {
      setMenuActionMessage("Adding item…")
      const created = await postAdminJson<{ id: string }>("/admin/menu/items", {
        name: input.name,
        description: input.description || null,
        basePriceCents: input.priceCents,
        photoUrl: null,
        tags: [],
        prepTimeMinutes: 0,
        specialInstructionsEnabled: false,
        isFeatured: false,
        visibility: "AVAILABLE",
        categoryIds: [categoryId],
      })

      await patchAdminJson(`/admin/menu/categories/${categoryId}/items/reorder`, {
        itemIds: [...category.categoryItems.map((entry) => entry.item.id), created.id],
      })

      await reloadMenuData()
      setMenuActionMessage("Item added.")
    } catch (nextError) {
      setMenuActionMessage(nextError instanceof Error ? nextError.message : "Failed to add item")
    }
  }

  const deleteItemFromMenu = async (itemId: string) => {
    const previousCategories = categories
    updateMenuCategories((current) =>
      current.map((category) => ({
        ...category,
        categoryItems: category.categoryItems.filter((entry) => entry.item.id !== itemId),
      })),
    )

    try {
      setMenuActionMessage("Deleting item…")
      await deleteAdmin(`/admin/menu/items/${itemId}`)
      await reloadMenuData()
      setMenuActionMessage("Item deleted.")
    } catch (nextError) {
      updateMenuCategories(() => previousCategories)
      setMenuActionMessage(nextError instanceof Error ? nextError.message : "Failed to delete item")
    }
  }

  const controlsPanel = (
    <div className="grid gap-6">
      <SectionCard
        title="Storefront controls"
        subtitle="Draft edits update the preview instantly. Save persists them to the backend."
      >
        <div className="grid gap-5">
          <div className="grid gap-2">
            <Label className="text-sm text-muted-foreground">
              Linked restaurant
            </Label>
            <div className="rounded-[var(--radius)] border border-border/70 bg-background px-4 py-3 text-sm text-foreground">
              {linkedTenantSlug}
            </div>
          </div>

          {error ? (
            <div className="rounded-[var(--radius)] border border-destructive/20 bg-destructive/10 px-4 py-4 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          <TabBar activeTab={activeTab} onChange={setActiveTab} />

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="grid gap-5"
            >
              {activeTab === "branding" ? (
                <BrandingTab theme={draftTheme} onThemeChange={updateTheme} />
              ) : null}

              {activeTab === "menu" ? (
                <MenuTab
                  categories={categories}
                  menuActionMessage={menuActionMessage}
                  onAddItem={addItemToCategory}
                  onCategoryVisibilityChange={updateCategoryVisibility}
                  onCategoryReorder={reorderCategories}
                  onDeleteItem={deleteItemFromMenu}
                  onItemFeaturedChange={(itemId, isFeatured) =>
                    void updateItemPresentation(
                      itemId,
                      { isFeatured },
                      "Featured state updated.",
                    )
                  }
                  onItemImageChange={(itemId, photoUrl) =>
                    void updateItemPresentation(
                      itemId,
                      { photoUrl },
                      photoUrl ? "Item image updated." : "Item image removed.",
                    )
                  }
                  onItemReorder={reorderCategoryItem}
                  onItemVisibilityChange={updateItemVisibility}
                />
              ) : null}
            </motion.div>
          </AnimatePresence>

          {(activeTab === "branding" || isThemeDirty || saveMessage) ? (
            <ThemeSaveBar
              isDirty={isThemeDirty}
              isLoading={isLoading}
              isSaving={isSaving}
              onSave={() => void saveTheme()}
              saveMessage={saveMessage}
            />
          ) : null}
        </div>
      </SectionCard>
    </div>
  )

  const previewPanel = (
    <SectionCard
      title="Live storefront preview"
      subtitle="Uses the tenant's real menu data and the current dashboard draft settings."
    >
      <PreviewPane theme={draftTheme} categories={categories} />
    </SectionCard>
  )

  const assistantPanel = (
    <AssistantPanel
      className="h-full"
      getToken={getToken}
      tenantSlug={linkedTenantSlug}
      onRefreshTargets={(targets) => {
        if (targets.includes("menu")) {
          void reloadMenuData(true)
        }
      }}
    />
  )

  return (
    <motion.main
      className="mx-auto flex h-[100dvh] min-h-[100dvh] w-full max-w-[1680px] flex-col gap-6 overflow-hidden px-4 py-6 sm:px-6 lg:px-8"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
    >
      <header className="grid gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="grid gap-4">
            <Badge variant="outline" className="w-fit border-border bg-background text-muted-foreground">
              Restaurant admin dashboard
            </Badge>
            <div className="grid gap-3">
              <h1 className="font-heading text-4xl text-foreground sm:text-5xl">
                Storefront customization
              </h1>
              <p className="max-w-4xl text-base leading-7 text-muted-foreground">
                Tune the customer-facing storefront in one place. Theme, hero content, promo
                messaging, category visibility, featured states, and ordering all live here while
                kitchen workflows stay standardized.
              </p>
            </div>
          </div>
          <UserButton />
        </div>
      </header>

      <div className="flex flex-wrap gap-2 md:hidden">
        <ShellViewBar activeView={activeShellView} onChange={setActiveShellView} />
      </div>

      <div className="flex-1 min-h-0">
        <div className="hidden h-full min-h-0 gap-6 min-[1100px]:grid min-[1100px]:grid-cols-[320px_420px_minmax(0,1fr)]">
          <div className="min-h-0 overflow-hidden">
            {assistantPanel}
          </div>
          <div className="min-h-0 overflow-y-auto pr-1">
            {controlsPanel}
          </div>
          <div className="min-h-0 overflow-y-auto">
            {previewPanel}
          </div>
        </div>

        <div className="hidden h-full min-h-0 gap-6 md:grid min-[1100px]:hidden md:grid-cols-[320px_minmax(0,1fr)]">
          <div className="min-h-0 overflow-hidden">
            {assistantPanel}
          </div>
          <div className="min-h-0 overflow-y-auto">
            {controlsPanel}
          </div>
        </div>

        <div className="grid h-full min-h-0 gap-6 md:hidden">
          {activeShellView === "assistant" ? assistantPanel : null}
          {activeShellView === "controls" ? controlsPanel : null}
        </div>
      </div>
    </motion.main>
  )
}

function ShellViewBar({
  activeView,
  onChange,
}: {
  activeView: AdminShellView
  onChange: (value: AdminShellView) => void
}) {
  const views: Array<{ id: AdminShellView; label: string }> = [
    { id: "assistant", label: "Assistant" },
    { id: "controls", label: "Controls" },
  ]

  return (
    <div className="flex w-full flex-wrap gap-2 rounded-[var(--radius)] border border-border/70 bg-background/70 p-2">
      {views.map((view) => {
        const isActive = activeView === view.id

        return (
          <Button
            key={view.id}
            type="button"
            variant={isActive ? "secondary" : "ghost"}
            onClick={() => onChange(view.id)}
            className={cn(
              "min-h-11 flex-1 rounded-[calc(var(--radius)-8px)] px-4 text-sm sm:flex-none",
              isActive
                ? "border border-border/70 bg-card text-foreground shadow-sm"
                : "text-muted-foreground",
            )}
          >
            {view.label}
          </Button>
        )
      })}
    </div>
  )
}

function TabBar({
  activeTab,
  onChange,
}: {
  activeTab: AdminTab
  onChange: (value: AdminTab) => void
}) {
  const tabs: Array<{ id: AdminTab; label: string; icon: React.ReactNode }> = [
    { id: "branding", label: "Branding", icon: <Palette className="h-4 w-4" /> },
    { id: "menu", label: "Menu", icon: <Sparkles className="h-4 w-4" /> },
  ]

  return (
    <div className="flex flex-wrap gap-2 rounded-[var(--radius)] border border-border/70 bg-background/70 p-2">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id
        return (
          <Button
            key={tab.id}
            type="button"
            variant={isActive ? "secondary" : "ghost"}
            onClick={() => onChange(tab.id)}
            className={cn(
              "gap-2 rounded-[calc(var(--radius)-8px)] px-3 text-sm",
              isActive
                ? "border border-border/70 bg-card text-foreground shadow-sm"
                : "text-muted-foreground",
            )}
          >
            {tab.icon}
            {tab.label}
          </Button>
        )
      })}
    </div>
  )
}

function BrandingTab({
  theme,
  onThemeChange,
}: {
  theme: ThemeDraft
  onThemeChange: ThemeChangeHandler
}) {
  async function handleFileChange(
    key: "logoUrl" | "heroImageUrl",
    file: File | null,
  ) {
    if (!file) {
      return
    }

    const nextValue = await readFileAsDataUrl(file)
    onThemeChange(key, nextValue)
  }

  return (
    <div className="grid gap-5">
      <div className="grid gap-5">
        <FieldShell>
          <Label htmlFor="logo-upload" className={fieldLabelClassName}>
            Logo upload
          </Label>
          <div className="grid gap-3 rounded-[var(--radius)] border border-border/70 bg-background/70 p-4">
            <ImageDropZone
              id="logo-upload"
              copy="Drop image here or click to upload"
              imageUrl={theme.logoUrl}
              imagePresentation="contain"
              onRemove={() => onThemeChange("logoUrl", "")}
              onFile={(file) => void handleFileChange("logoUrl", file)}
            />
            {!theme.logoUrl ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ImageIcon className="h-4 w-4" />
                Upload a square or horizontal logo.
              </div>
            ) : null}
          </div>
        </FieldShell>

        <FieldShell>
          <Label htmlFor="banner-upload" className={fieldLabelClassName}>
            Banner image upload
          </Label>
          <div className="grid gap-3 rounded-[var(--radius)] border border-border/70 bg-background/70 p-4">
            <ImageDropZone
              id="banner-upload"
              copy="Drop image here or click to upload"
              imageUrl={theme.heroImageUrl}
              imagePresentation="cover"
              overlayImage
              onRemove={() => onThemeChange("heroImageUrl", "")}
              onFile={(file) => void handleFileChange("heroImageUrl", file)}
            />
            {!theme.heroImageUrl ? (
              <div className="text-sm text-muted-foreground">
                No banner uploaded. The hero will fall back to a subtle brand-color tint.
              </div>
            ) : null}
          </div>
        </FieldShell>

        <FieldShell>
          <ColorField
            label="Brand color"
            value={theme.primaryColor}
            onChange={(value) => onThemeChange("primaryColor", value)}
          />
        </FieldShell>

        <FieldShell>
          <ColorField
            label="Background color"
            value={theme.backgroundColor}
            onChange={(value) => onThemeChange("backgroundColor", clampToLightBackground(value))}
          />
          <p className="mt-2 text-sm text-muted-foreground">Light backgrounds only.</p>
        </FieldShell>

        <FieldShell>
          <SelectField
            label="Heading font"
            value={theme.headingFont}
            onChange={(value) => onThemeChange("headingFont", value)}
            options={FONT_OPTIONS as unknown as Array<{ label: string; value: string }>}
          />
        </FieldShell>

        <FieldShell>
          <SelectField
            label="Body/subheadline font"
            value={theme.bodyFont}
            onChange={(value) => onThemeChange("bodyFont", value)}
            options={FONT_OPTIONS as unknown as Array<{ label: string; value: string }>}
          />
        </FieldShell>

        <FieldShell>
          <Label htmlFor="hero-headline" className={fieldLabelClassName}>
            Hero headline
          </Label>
          <textarea
            id="hero-headline"
            value={theme.heroHeadline}
            onChange={(event) => onThemeChange("heroHeadline", event.target.value)}
            rows={2}
            className={textareaClassName}
          />
        </FieldShell>

        <FieldShell>
          <Label htmlFor="hero-subheadline" className={fieldLabelClassName}>
            Hero subheadline
          </Label>
          <textarea
            id="hero-subheadline"
            value={theme.heroSubheadline}
            onChange={(event) => onThemeChange("heroSubheadline", event.target.value)}
            rows={3}
            className={textareaClassName}
          />
        </FieldShell>

        <FieldShell>
          <Label htmlFor="hero-badge" className={fieldLabelClassName}>
            Hero badge text
          </Label>
          <Input
            id="hero-badge"
            value={theme.heroBadgeText}
            onChange={(event) => onThemeChange("heroBadgeText", event.target.value)}
          />
        </FieldShell>

        <FieldShell>
          <Label htmlFor="promo-banner" className={fieldLabelClassName}>
            Promo banner text
          </Label>
          <Input
            id="promo-banner"
            value={theme.promoBannerText}
            onChange={(event) => onThemeChange("promoBannerText", event.target.value)}
          />
        </FieldShell>
      </div>
    </div>
  )
}

function ThemeSaveBar({
  isDirty,
  isLoading,
  isSaving,
  onSave,
  saveMessage,
}: {
  isDirty: boolean
  isLoading: boolean
  isSaving: boolean
  onSave: () => void
  saveMessage: string | null
}) {
  const isSaved = Boolean(saveMessage?.toLowerCase().includes("saved"))

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-[var(--radius)] border border-border/70 bg-background/70 p-4">
      <div className="grid gap-1">
        <div className={cn("text-sm font-medium", isDirty ? "text-foreground" : "text-muted-foreground")}>
          {isDirty ? "Unsaved changes" : "Draft matches saved settings"}
        </div>
        {saveMessage ? (
          <div className={cn("text-sm", isSaved ? "text-foreground" : "text-destructive")}>
            {saveMessage}
          </div>
        ) : null}
      </div>

      <Button
        type="button"
        onClick={onSave}
        disabled={isSaving || isLoading || !isDirty}
      >
        {isSaving ? "Saving…" : "Save storefront settings"}
      </Button>
    </div>
  )
}

function MenuTab({
  onAddItem,
  categories,
  menuActionMessage,
  onCategoryReorder,
  onCategoryVisibilityChange,
  onDeleteItem,
  onItemFeaturedChange,
  onItemImageChange,
  onItemReorder,
  onItemVisibilityChange,
}: {
  onAddItem: (
    categoryId: string,
    input: { name: string; description: string; priceCents: number },
  ) => void | Promise<void>
  categories: MenuCategory[]
  menuActionMessage: string | null
  onCategoryReorder: (nextCategoryIds: string[]) => void
  onCategoryVisibilityChange: (categoryId: string, visibility: MenuCategory["visibility"]) => void
  onDeleteItem: (itemId: string) => void | Promise<void>
  onItemFeaturedChange: (itemId: string, isFeatured: boolean) => void
  onItemImageChange: (itemId: string, photoUrl: string | null) => void | Promise<void>
  onItemReorder: (categoryId: string, nextItemIds: string[]) => void
  onItemVisibilityChange: (
    itemId: string,
    visibility: CategoryItemEntry["item"]["visibility"],
  ) => void
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))
  const categoryIds = categories.map((category) => category.id)
  const [activeDragId, setActiveDragId] = useState<string | null>(null)
  const [activeDragType, setActiveDragType] = useState<"category" | "item" | null>(null)
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null)
  const [overDragId, setOverDragId] = useState<string | null>(null)

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveDragId(null)
    setActiveDragType(null)
    setActiveCategoryId(null)
    setOverDragId(null)

    if (!over || active.id === over.id) {
      return
    }

    const activeType = active.data.current?.type
    const overType = over.data.current?.type

    if (activeType === "category" && overType === "category") {
      const oldIndex = categoryIds.indexOf(String(active.id))
      const newIndex = categoryIds.indexOf(String(over.id))
      if (oldIndex >= 0 && newIndex >= 0 && oldIndex !== newIndex) {
        void Promise.resolve(onCategoryReorder(arrayMove(categoryIds, oldIndex, newIndex)))
      }
      return
    }

    if (activeType === "item" && overType === "item") {
      const activeCategory = String(active.data.current?.categoryId ?? "")
      const overCategory = String(over.data.current?.categoryId ?? "")
      if (!activeCategory || activeCategory !== overCategory) {
        return
      }

      const category = categories.find((entry) => entry.id === activeCategory)
      if (!category) {
        return
      }

      const itemIds = category.categoryItems.map((entry) => entry.item.id)
      const oldIndex = itemIds.indexOf(String(active.id))
      const newIndex = itemIds.indexOf(String(over.id))
      if (oldIndex >= 0 && newIndex >= 0 && oldIndex !== newIndex) {
        void Promise.resolve(onItemReorder(activeCategory, arrayMove(itemIds, oldIndex, newIndex)))
      }
    }
  }

  return (
    <div className="grid gap-4">
      <div className={cn("text-sm", menuActionMessage?.includes("Failed") ? "text-destructive" : "text-muted-foreground")}>
        {menuActionMessage ?? "These changes shape what customers see in the storefront."}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={(event) => {
          setActiveDragId(String(event.active.id))
          setActiveDragType((event.active.data.current?.type as "category" | "item" | undefined) ?? null)
          setActiveCategoryId(
            typeof event.active.data.current?.categoryId === "string"
              ? event.active.data.current.categoryId
              : null,
          )
        }}
        onDragOver={(event) => {
          setOverDragId(event.over ? String(event.over.id) : null)
        }}
        onDragCancel={() => {
          setActiveDragId(null)
          setActiveDragType(null)
          setActiveCategoryId(null)
          setOverDragId(null)
        }}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={categoryIds} strategy={verticalListSortingStrategy}>
          <div className="grid gap-4">
            {categories.map((category) => (
              <SortableCategoryCard
                key={category.id}
                activeCategoryId={activeCategoryId}
                activeDragId={activeDragId}
                activeDragType={activeDragType}
                category={category}
                categoryIds={categoryIds}
                onAddItem={onAddItem}
                onCategoryVisibilityChange={onCategoryVisibilityChange}
                onDeleteItem={onDeleteItem}
                onItemFeaturedChange={onItemFeaturedChange}
                onItemImageChange={onItemImageChange}
                onItemVisibilityChange={onItemVisibilityChange}
                overDragId={overDragId}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
}

function SortableCategoryCard({
  activeCategoryId,
  activeDragId,
  activeDragType,
  category,
  categoryIds,
  onAddItem,
  onCategoryVisibilityChange,
  onDeleteItem,
  onItemFeaturedChange,
  onItemImageChange,
  onItemVisibilityChange,
  overDragId,
}: {
  activeCategoryId: string | null
  activeDragId: string | null
  activeDragType: "category" | "item" | null
  category: MenuCategory
  categoryIds: string[]
  onAddItem: (
    categoryId: string,
    input: { name: string; description: string; priceCents: number },
  ) => void | Promise<void>
  onCategoryVisibilityChange: (categoryId: string, visibility: MenuCategory["visibility"]) => void
  onDeleteItem: (itemId: string) => void | Promise<void>
  onItemFeaturedChange: (itemId: string, isFeatured: boolean) => void
  onItemImageChange: (itemId: string, photoUrl: string | null) => void | Promise<void>
  onItemVisibilityChange: (
    itemId: string,
    visibility: CategoryItemEntry["item"]["visibility"],
  ) => void
  overDragId: string | null
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: category.id,
    data: { type: "category", categoryId: category.id },
  })

  const itemIds = category.categoryItems.map((entry) => entry.item.id)
  const isHidden = category.visibility === "HIDDEN"
  const categoryIndex = categoryIds.indexOf(category.id)
  const activeCategoryIndex = activeDragId ? categoryIds.indexOf(activeDragId) : -1
  const showTopDropIndicator =
    activeDragType === "category" &&
    overDragId === category.id &&
    activeCategoryIndex > categoryIndex
  const showBottomDropIndicator =
    activeDragType === "category" &&
    overDragId === category.id &&
    activeCategoryIndex >= 0 &&
    activeCategoryIndex < categoryIndex

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.7 : 1,
        position: "relative",
      }}
    >
      {showTopDropIndicator ? <DropIndicator position="top" /> : null}
      <motion.div layout>
        <Card
          className={cn(
            "gap-4 border border-border/80 py-0 shadow-sm",
            isHidden ? "bg-background/70" : "bg-card",
            activeDragType === "category" && overDragId === category.id ? "ring-2 ring-ring/20" : "",
          )}
        >
          <CardContent className="grid gap-4 px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <DragHandleButton
                  attributes={attributes}
                  listeners={listeners}
                  label={`Reorder category ${category.name}`}
                />
                <div className="min-w-0 space-y-1">
                  <div className={cn("truncate font-medium text-foreground", isHidden ? "opacity-60" : "")}>
                    {category.name}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {category.categoryItems.length} items
                  </div>
                </div>
              </div>

              <IconToggleButton
                active={!isHidden}
                label={isHidden ? `Show ${category.name}` : `Hide ${category.name}`}
                onClick={() =>
                  onCategoryVisibilityChange(
                    category.id,
                    isHidden ? "AVAILABLE" : "HIDDEN",
                  )
                }
              >
                {isHidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </IconToggleButton>
            </div>

            <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
              <div className="grid gap-3">
                {category.categoryItems.map((entry) => (
                  <SortableItemRow
                    activeCategoryId={activeCategoryId}
                    activeDragId={activeDragId}
                    activeDragType={activeDragType}
                    key={entry.item.id}
                    categoryId={category.id}
                    entry={entry}
                    itemIds={itemIds}
                    onDelete={onDeleteItem}
                    onFeaturedChange={onItemFeaturedChange}
                    onImageChange={onItemImageChange}
                    onVisibilityChange={onItemVisibilityChange}
                    overDragId={overDragId}
                  />
                ))}
              </div>
            </SortableContext>

            <Separator />

            <AddItemInlineForm categoryId={category.id} onSubmit={onAddItem} />
          </CardContent>
        </Card>
      </motion.div>
      {showBottomDropIndicator ? <DropIndicator position="bottom" /> : null}
    </div>
  )
}

function SortableItemRow({
  activeCategoryId,
  activeDragId,
  activeDragType,
  categoryId,
  entry,
  itemIds,
  onDelete,
  onFeaturedChange,
  onImageChange,
  onVisibilityChange,
  overDragId,
}: {
  activeCategoryId: string | null
  activeDragId: string | null
  activeDragType: "category" | "item" | null
  categoryId: string
  entry: CategoryItemEntry
  itemIds: string[]
  onDelete: (itemId: string) => void | Promise<void>
  onFeaturedChange: (itemId: string, isFeatured: boolean) => void
  onImageChange: (itemId: string, photoUrl: string | null) => void | Promise<void>
  onVisibilityChange: (
    itemId: string,
    visibility: CategoryItemEntry["item"]["visibility"],
  ) => void
  overDragId: string | null
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: entry.item.id,
    data: { type: "item", categoryId, itemId: entry.item.id },
  })

  const isHidden = entry.item.visibility === "HIDDEN"
  const isSoldOut = entry.item.visibility === "SOLD_OUT"
  const itemIndex = itemIds.indexOf(entry.item.id)
  const activeItemIndex = activeDragId ? itemIds.indexOf(activeDragId) : -1
  const isSameCategoryDrag = activeDragType === "item" && activeCategoryId === categoryId
  const showTopDropIndicator =
    isSameCategoryDrag &&
    overDragId === entry.item.id &&
    activeItemIndex > itemIndex
  const showBottomDropIndicator =
    isSameCategoryDrag &&
    overDragId === entry.item.id &&
    activeItemIndex >= 0 &&
    activeItemIndex < itemIndex

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : isHidden ? 0.6 : 1,
        position: "relative",
      }}
    >
      {showTopDropIndicator ? <DropIndicator position="top" inset /> : null}
      <motion.div layout>
        <div
          className={cn(
            "grid gap-3 rounded-[var(--radius)] border border-border/70 bg-background px-3 py-3",
            isSoldOut ? "bg-accent/10" : "",
            isSameCategoryDrag && overDragId === entry.item.id ? "ring-2 ring-ring/20" : "",
          )}
        >
          <div className="grid gap-3 sm:grid-cols-[auto_48px_minmax(0,1fr)] sm:items-start">
            <DragHandleButton
              attributes={attributes}
              listeners={listeners}
              label={`Reorder item ${entry.item.name}`}
            />
            <ImageDropZone
              id={`item-image-${entry.item.id}`}
              compact
              copy="Add image"
              imageUrl={entry.item.photoUrl ?? undefined}
              imagePresentation="cover"
              onRemove={() => void onImageChange(entry.item.id, null)}
              onFile={(file) =>
                void readFileAsDataUrl(file).then((value) => onImageChange(entry.item.id, value))
              }
            />
            <div className="min-w-0">
              <div className="font-medium text-foreground">{entry.item.name}</div>
              <div className="mt-1 text-sm text-muted-foreground">
                {formatPrice(entry.item.variants[0]?.priceCents ?? entry.item.basePriceCents)}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:pl-[84px]">
            <IconToggleButton
              active={!isHidden}
              label={isHidden ? `Show ${entry.item.name}` : `Hide ${entry.item.name}`}
              onClick={() =>
                onVisibilityChange(
                  entry.item.id,
                  isHidden ? "AVAILABLE" : "HIDDEN",
                )
              }
            >
              {isHidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </IconToggleButton>

            <IconToggleButton
              active={entry.item.isFeatured}
              label={entry.item.isFeatured ? `Unfeature ${entry.item.name}` : `Feature ${entry.item.name}`}
              onClick={() => onFeaturedChange(entry.item.id, !entry.item.isFeatured)}
            >
              <Star className={cn("h-4 w-4", entry.item.isFeatured ? "fill-current" : "")} />
            </IconToggleButton>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                onVisibilityChange(
                  entry.item.id,
                  isSoldOut ? "AVAILABLE" : "SOLD_OUT",
                )
              }
              className={cn(
                "rounded-[calc(var(--radius)-8px)]",
                isSoldOut ? "border-accent bg-accent/15 text-foreground" : "text-muted-foreground",
              )}
            >
              Sold out
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                if (window.confirm(`Delete ${entry.item.name}?`)) {
                  void Promise.resolve(onDelete(entry.item.id))
                }
              }}
              className="rounded-[calc(var(--radius)-8px)] border-destructive/20 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>
      </motion.div>
      {showBottomDropIndicator ? <DropIndicator position="bottom" inset /> : null}
    </div>
  )
}

function AddItemInlineForm({
  categoryId,
  onSubmit,
}: {
  categoryId: string
  onSubmit: (
    categoryId: string,
    input: { name: string; description: string; priceCents: number },
  ) => void | Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [price, setPrice] = useState("")
  const [description, setDescription] = useState("")

  async function handleSubmit() {
    const trimmedName = name.trim()
    const parsedPrice = Number(price)

    if (!trimmedName || Number.isNaN(parsedPrice) || parsedPrice < 0) {
      return
    }

    await onSubmit(categoryId, {
      name: trimmedName,
      description: description.trim(),
      priceCents: Math.round(parsedPrice * 100),
    })

    setName("")
    setPrice("")
    setDescription("")
    setOpen(false)
  }

  return (
    <div className="grid gap-3">
      {!open ? (
        <Button type="button" variant="outline" onClick={() => setOpen(true)} className="w-fit">
          Add item
        </Button>
      ) : (
        <>
          <div className="grid gap-3 lg:grid-cols-[1.5fr_0.8fr]">
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Item name"
            />
            <Input
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              placeholder="Price"
              inputMode="decimal"
            />
          </div>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Description"
            rows={2}
            className={textareaClassName}
          />
          <div className="flex flex-wrap gap-3">
            <Button type="button" onClick={() => void handleSubmit()}>
              Create item
            </Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

function DropIndicator({
  inset = false,
  position,
}: {
  inset?: boolean
  position: "top" | "bottom"
}) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute h-1 rounded-full bg-primary/70"
      style={{
        [position]: inset ? 6 : -8,
        left: inset ? 10 : 0,
        right: inset ? 10 : 0,
      }}
    />
  )
}

function DragHandleButton({
  attributes,
  label,
  listeners,
}: {
  attributes: ReturnType<typeof useSortable>["attributes"]
  label: string
  listeners: ReturnType<typeof useSortable>["listeners"]
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="icon-sm"
      aria-label={label}
      {...attributes}
      {...listeners}
      className="shrink-0 cursor-grab rounded-[calc(var(--radius)-8px)] text-muted-foreground"
    >
      <GripIcon />
    </Button>
  )
}

function IconToggleButton({
  active,
  children,
  label,
  onClick,
}: {
  active: boolean
  children: React.ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <Button
      type="button"
      aria-label={label}
      onClick={onClick}
      variant="outline"
      size="icon-sm"
      className={cn(
        "rounded-[calc(var(--radius)-8px)]",
        active ? "border-primary/30 bg-primary/10 text-foreground" : "text-muted-foreground",
      )}
    >
      {children}
    </Button>
  )
}

function GripIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="9" cy="6" r="1.6" />
      <circle cx="15" cy="6" r="1.6" />
      <circle cx="9" cy="12" r="1.6" />
      <circle cx="15" cy="12" r="1.6" />
      <circle cx="9" cy="18" r="1.6" />
      <circle cx="15" cy="18" r="1.6" />
    </svg>
  )
}

function FieldShell({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("grid gap-2", className)}>
      {children}
    </div>
  )
}

function ImageDropZone({
  compact = false,
  copy,
  id,
  imagePresentation = "cover",
  imageUrl,
  onRemove,
  overlayImage = false,
  onFile,
}: {
  compact?: boolean
  copy: string
  id: string
  imagePresentation?: "contain" | "cover"
  imageUrl?: string
  onRemove?: () => void
  overlayImage?: boolean
  onFile: (file: File) => void
}) {
  const [isDragging, setIsDragging] = useState(false)

  function handleFiles(files: FileList | null) {
    const file = files?.[0]
    if (file) {
      onFile(file)
    }
  }

  return (
    <label
      htmlFor={id}
      className={cn(
        "relative flex cursor-pointer items-center justify-center overflow-hidden rounded-[var(--radius)] border text-center text-sm text-muted-foreground transition-colors",
        imageUrl
          ? compact
            ? "h-12 w-12 border-border bg-background"
            : "min-h-28 border-border bg-card"
          : "border-dashed border-border bg-background/80 hover:bg-background",
        compact ? "px-3 py-2" : "px-4 py-6",
        !imageUrl && compact ? "min-h-12" : "",
        !imageUrl && !compact ? "min-h-28" : "",
        isDragging ? "border-primary bg-primary/10 text-foreground" : "",
      )}
      onDragOver={(event) => {
        event.preventDefault()
        setIsDragging(true)
      }}
      onDragLeave={(event) => {
        event.preventDefault()
        setIsDragging(false)
      }}
      onDrop={(event) => {
        event.preventDefault()
        setIsDragging(false)
        handleFiles(event.dataTransfer.files)
      }}
    >
      <input
        id={id}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(event) => handleFiles(event.target.files)}
      />
      {imageUrl ? (
        <>
          <div
            className={cn(
              "absolute inset-0",
              imagePresentation === "contain" ? "bg-contain bg-center bg-no-repeat" : "bg-cover bg-center",
            )}
            style={{
              backgroundImage: overlayImage
                ? `linear-gradient(rgba(39, 28, 23, 0.44), rgba(39, 28, 23, 0.44)), url(${imageUrl})`
                : `url(${imageUrl})`,
            }}
          />
          {!compact ? (
            <div className="absolute inset-x-0 bottom-0 bg-background/90 px-3 py-2 text-xs text-foreground">
              Click or drop to replace
            </div>
          ) : null}
          {onRemove ? (
            <button
              type="button"
              className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background text-foreground shadow-sm"
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
                onRemove()
              }}
              aria-label="Remove image"
            >
              ×
            </button>
          ) : null}
        </>
      ) : (
        <div className="grid gap-1">
          <div className="font-medium text-foreground">{copy}</div>
          {!compact ? <div>PNG, JPG, or WebP</div> : null}
        </div>
      )}
    </label>
  )
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <FieldShell>
      <Label className={fieldLabelClassName}>{label}</Label>
      <div className="grid gap-3">
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-12 w-full rounded-[var(--radius)] border border-input bg-background p-1"
        />
        <Input value={value} onChange={(event) => onChange(event.target.value)} />
      </div>
    </FieldShell>
  )
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: Array<{ label: string; value: string }>
}) {
  return (
    <FieldShell>
      <Label className={fieldLabelClassName}>{label}</Label>
      <select value={value} onChange={(event) => onChange(event.target.value)} className={selectClassName}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldShell>
  )
}

const fieldLabelClassName = "text-sm font-medium text-muted-foreground"
const textareaClassName =
  "min-h-24 w-full rounded-[var(--radius)] border border-input bg-background px-3 py-3 text-sm text-foreground shadow-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
const selectClassName =
  "h-10 w-full rounded-[var(--radius)] border border-input bg-background px-3 text-sm text-foreground shadow-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
