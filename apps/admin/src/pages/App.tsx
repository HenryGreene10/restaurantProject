import React, { useEffect, useMemo, useState } from "react"
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
import { CheckCircle2, Eye, EyeOff, LayoutPanelTop, Palette, Sparkles, Star, Trash2 } from "lucide-react"

import { AssistantPanel } from "../assistant/AssistantPanel"
import { fetchTenantMenu, type MenuCategory, type MenuResponse } from "../lib/menu"
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
  heroHeadline: "Neighborhood favorites without marketplace markup.",
  heroSubheadline: "Make repeat visits easier with direct ordering and better menu presentation.",
  heroBadgeText: "Direct ordering",
  promoBannerText: "Give loyal customers a direct-order reward funded by marketplace savings.",
  heroImageUrl: "",
  primaryColor: "#b42318",
  accentColor: "#f59e0b",
  backgroundColor: "#f6f1ea",
  surfaceColor: "#fffaf5",
  textColor: "#241712",
  mutedColor: "#7a6257",
  borderColor: "#e7d8ca",
  onPrimary: "#fff7ed",
  bodyFont: "Inter, sans-serif",
  headingFont: "Georgia, serif",
  radius: 24,
  buttonStyle: "rounded",
  heroLayout: "immersive",
  menuCardLayout: "classic",
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

function getString(config: Record<string, unknown>, key: string) {
  const value = config[key]
  return typeof value === "string" && value.trim() ? value : undefined
}

function buildDraft(menu: MenuResponse): ThemeDraft {
  const config = getBrandConfig(menu)

  return {
    ...defaultThemeDraft,
    appTitle: getString(config, "appTitle") ?? defaultThemeDraft.appTitle,
    tagline: getString(config, "tagline") ?? defaultThemeDraft.tagline,
    heroHeadline: getString(config, "heroHeadline") ?? defaultThemeDraft.heroHeadline,
    heroSubheadline: getString(config, "heroSubheadline") ?? defaultThemeDraft.heroSubheadline,
    heroBadgeText: getString(config, "heroBadgeText") ?? defaultThemeDraft.heroBadgeText,
    promoBannerText: getString(config, "promoBannerText") ?? defaultThemeDraft.promoBannerText,
    heroImageUrl: getString(config, "heroImageUrl") ?? defaultThemeDraft.heroImageUrl,
    primaryColor: getString(config, "primaryColor") ?? defaultThemeDraft.primaryColor,
    accentColor: getString(config, "accentColor") ?? defaultThemeDraft.accentColor,
    backgroundColor: getString(config, "backgroundColor") ?? defaultThemeDraft.backgroundColor,
    surfaceColor: getString(config, "surfaceColor") ?? defaultThemeDraft.surfaceColor,
    textColor: getString(config, "textColor") ?? defaultThemeDraft.textColor,
    mutedColor: getString(config, "mutedColor") ?? defaultThemeDraft.mutedColor,
    borderColor: getString(config, "borderColor") ?? defaultThemeDraft.borderColor,
    onPrimary: getString(config, "onPrimary") ?? defaultThemeDraft.onPrimary,
    bodyFont: getString(config, "fontFamily") ?? defaultThemeDraft.bodyFont,
    headingFont: getString(config, "headingFont") ?? defaultThemeDraft.headingFont,
    radius: typeof config.radius === "number" ? config.radius : defaultThemeDraft.radius,
    buttonStyle: config.buttonStyle === "square" ? "square" : defaultThemeDraft.buttonStyle,
    heroLayout: config.heroLayout === "minimal" ? "minimal" : defaultThemeDraft.heroLayout,
    menuCardLayout:
      config.menuCardLayout === "compact" || config.menuCardLayout === "photo-first"
        ? config.menuCardLayout
        : defaultThemeDraft.menuCardLayout,
    showFeaturedBadges:
      typeof config.showFeaturedBadges === "boolean"
        ? config.showFeaturedBadges
        : defaultThemeDraft.showFeaturedBadges,
    showCategoryChips:
      typeof config.showCategoryChips === "boolean"
        ? config.showCategoryChips
        : defaultThemeDraft.showCategoryChips,
  }
}

type AdminTab = "branding" | "layout" | "menu" | "assistant"
type ThemeChangeHandler = <K extends keyof ThemeDraft>(key: K, value: ThemeDraft[K]) => void
type CategoryItemEntry = MenuCategory["categoryItems"][number]

function areThemesEqual(left: ThemeDraft, right: ThemeDraft) {
  return JSON.stringify(left) === JSON.stringify(right)
}

function themePayload(theme: ThemeDraft) {
  return {
    appTitle: theme.appTitle,
    tagline: theme.tagline,
    heroHeadline: theme.heroHeadline,
    heroSubheadline: theme.heroSubheadline,
    heroBadgeText: theme.heroBadgeText,
    promoBannerText: theme.promoBannerText,
    heroImageUrl: theme.heroImageUrl,
    primaryColor: theme.primaryColor,
    accentColor: theme.accentColor,
    backgroundColor: theme.backgroundColor,
    surfaceColor: theme.surfaceColor,
    textColor: theme.textColor,
    mutedColor: theme.mutedColor,
    borderColor: theme.borderColor,
    onPrimary: theme.onPrimary,
    fontFamily: theme.bodyFont,
    headingFont: theme.headingFont,
    radius: theme.radius,
    buttonStyle: theme.buttonStyle,
    heroLayout: theme.heroLayout,
    menuCardLayout: theme.menuCardLayout,
    showFeaturedBadges: theme.showFeaturedBadges,
    showCategoryChips: theme.showCategoryChips,
  }
}

function formatPrice(priceCents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(priceCents / 100)
}

async function patchAdminJson<T>(tenantSlug: string, path: string, body: unknown) {
  const response = await fetch(`/api${path}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "x-tenant-slug": tenantSlug,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(payload?.error ?? `Request failed (${response.status})`)
  }

  return response.json() as Promise<T>
}

async function postAdminJson<T>(tenantSlug: string, path: string, body: unknown) {
  const response = await fetch(`/api${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-tenant-slug": tenantSlug,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(payload?.error ?? `Request failed (${response.status})`)
  }

  return response.json() as Promise<T>
}

async function deleteAdmin(tenantSlug: string, path: string) {
  const response = await fetch(`/api${path}`, {
    method: "DELETE",
    headers: {
      "x-tenant-slug": tenantSlug,
    },
  })

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(payload?.error ?? `Request failed (${response.status})`)
  }
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
  const radius = `${theme.radius}px`
  return {
    ["--preview-primary" as string]: theme.primaryColor,
    ["--preview-accent" as string]: theme.accentColor,
    ["--preview-background" as string]: theme.backgroundColor,
    ["--preview-surface" as string]: theme.surfaceColor,
    ["--preview-text" as string]: theme.textColor,
    ["--preview-muted" as string]: theme.mutedColor,
    ["--preview-border" as string]: theme.borderColor,
    ["--preview-on-primary" as string]: theme.onPrimary,
    ["--preview-radius" as string]: radius,
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
  const cardRadius = theme.buttonStyle === "square" ? 10 : theme.radius
  const visible = previewCategories(categories)
  const cardColumns =
    theme.menuCardLayout === "compact" ? "repeat(2, minmax(0, 1fr))" : "minmax(0, 1fr)"

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
          borderRadius: "calc(var(--preview-radius) + 10px)",
          background: "var(--preview-background)",
          color: "var(--preview-text)",
          padding: 24,
          boxShadow: "var(--shadow-brand)",
        }}
      >
        <div
          style={{
            borderRadius: cardRadius,
            padding: theme.heroLayout === "immersive" ? "32px 28px" : "22px 22px 16px",
            background:
              theme.heroImageUrl && theme.heroLayout === "immersive"
                ? `linear-gradient(135deg, ${theme.primaryColor}bb, ${theme.accentColor}55), url(${theme.heroImageUrl}) center/cover`
                : theme.heroLayout === "immersive"
                  ? `linear-gradient(135deg, ${theme.primaryColor}16, ${theme.accentColor}14)`
                  : "var(--preview-surface)",
            border: "1px solid var(--preview-border)",
            display: "grid",
            gap: 18,
          }}
        >
          <div
            style={{
              display: "inline-flex",
              width: "fit-content",
              borderRadius: cardRadius,
              padding: "6px 10px",
              background: "var(--preview-surface)",
              border: "1px solid var(--preview-border)",
              color: "var(--preview-muted)",
              fontSize: 12,
            }}
          >
            {theme.heroBadgeText}
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            <h1
              style={{
                margin: 0,
                fontFamily: "var(--preview-heading-font)",
                fontSize: 38,
                lineHeight: 1.05,
                maxWidth: 680,
              }}
            >
              {theme.heroHeadline}
            </h1>
            <p
              style={{
                margin: 0,
                color: "var(--preview-muted)",
                maxWidth: 560,
                lineHeight: 1.55,
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
              background: `${theme.accentColor}14`,
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
                    fontSize: 24,
                  }}
                >
                  {category.name}
                </h2>
                <span style={{ color: "var(--preview-muted)", fontSize: 13 }}>
                  {category.categoryItems.length} items
                </span>
              </div>

              <div style={{ display: "grid", gap: 12, gridTemplateColumns: cardColumns }}>
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
                      gridTemplateColumns:
                        theme.menuCardLayout === "photo-first" ? "132px minmax(0, 1fr)" : "1fr",
                    }}
                  >
                    {theme.menuCardLayout === "photo-first" ? (
                      <div
                        style={{
                          minHeight: 124,
                          borderRadius: Math.max(12, cardRadius - 8),
                          border: "1px solid var(--preview-border)",
                          background: `linear-gradient(135deg, ${theme.primaryColor}12, ${theme.accentColor}12)`,
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
                                  fontSize: 18,
                                  fontFamily: "var(--preview-heading-font)",
                                }}
                              >
                                {item.name}
                              </h3>
                              {theme.showFeaturedBadges && item.isFeatured ? (
                                <span
                                  style={{
                                    borderRadius: cardRadius,
                                    border: "1px solid var(--preview-border)",
                                    color: "var(--preview-muted)",
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
                                    background: `${theme.accentColor}12`,
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
                        <div style={{ color: "var(--preview-muted)", fontSize: 14 }}>Sold out today</div>
                      ) : (
                        <button
                          type="button"
                          style={{
                            width: "fit-content",
                            borderRadius: cardRadius,
                            border: "1px solid var(--preview-border)",
                            padding: "10px 14px",
                            background: "transparent",
                            color: "var(--preview-text)",
                            fontWeight: 600,
                          }}
                        >
                          Add
                        </button>
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
  const [tenantSlug, setTenantSlug] = useState("joes-pizza")
  const [menuData, setMenuData] = useState<MenuResponse | null>(null)
  const [savedTheme, setSavedTheme] = useState<ThemeDraft>(defaultThemeDraft)
  const [draftTheme, setDraftTheme] = useState<ThemeDraft>(defaultThemeDraft)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [menuActionMessage, setMenuActionMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<AdminTab>("branding")

  useEffect(() => {
    let cancelled = false

    async function load() {
      setIsLoading(true)
      setError(null)
      setSaveMessage(null)
      setMenuActionMessage(null)

      try {
        const menu = await fetchTenantMenu(tenantSlug)
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
  }, [tenantSlug])

  const categories = menuData?.categories ?? []
  const featuredCount = useMemo(
    () =>
      categories.reduce(
        (count, category) =>
          count + category.categoryItems.filter((entry) => entry.item.isFeatured).length,
        0,
      ),
    [categories],
  )
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
    const refreshedMenu = await fetchTenantMenu(tenantSlug)
    setMenuData(refreshedMenu)
    if (syncTheme) {
      const nextTheme = buildDraft(refreshedMenu)
      setSavedTheme(nextTheme)
      setDraftTheme(nextTheme)
    }
    return refreshedMenu
  }

  const saveTheme = async () => {
    setIsSaving(true)
    setSaveMessage(null)

    try {
      const response = await fetch("/api/admin/brand-config", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-slug": tenantSlug,
        },
        body: JSON.stringify(themePayload(draftTheme)),
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null
        throw new Error(payload?.error ?? `Failed to save theme (${response.status})`)
      }

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
          patchAdminJson(tenantSlug, `/admin/menu/categories/${category.id}`, {
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
      await patchAdminJson(tenantSlug, `/admin/menu/categories/${categoryId}/availability`, {
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
      await patchAdminJson(tenantSlug, `/admin/menu/categories/${categoryId}/items/reorder`, {
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
                },
              }
            : entry,
        ),
      })),
    )

    try {
      setMenuActionMessage("Saving item settings…")
      await patchAdminJson(tenantSlug, `/admin/menu/items/${itemId}`, body)
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
      await patchAdminJson(tenantSlug, `/admin/menu/items/${itemId}/availability`, { visibility })
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
      const created = await postAdminJson<{ id: string }>(tenantSlug, "/admin/menu/items", {
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

      await patchAdminJson(tenantSlug, `/admin/menu/categories/${categoryId}/items/reorder`, {
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
      await deleteAdmin(tenantSlug, `/admin/menu/items/${itemId}`)
      await reloadMenuData()
      setMenuActionMessage("Item deleted.")
    } catch (nextError) {
      updateMenuCategories(() => previousCategories)
      setMenuActionMessage(nextError instanceof Error ? nextError.message : "Failed to delete item")
    }
  }

  return (
    <motion.main
      className="mx-auto flex w-full max-w-[1560px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
    >
      <header className="grid gap-4">
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
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(360px,0.38fr)_minmax(0,0.62fr)] xl:items-start">
        <div className="grid gap-6">
          <SectionCard
            title="Tenant and storefront"
            subtitle="Use the live tenant menu as the preview data source."
          >
            <div className="grid gap-5">
              <div className="grid gap-2">
                <Label htmlFor="tenant-slug" className="text-sm text-muted-foreground">
                  Tenant slug
                </Label>
                <Input
                  id="tenant-slug"
                  value={tenantSlug}
                  onChange={(event) => setTenantSlug(event.target.value)}
                />
              </div>

              <div className="grid gap-3 rounded-[var(--radius)] border border-border/70 bg-background/70 p-4">
                <StatusRow label="Status" value={isLoading ? "Loading" : error ? "Error" : "Loaded"} />
                <StatusRow label="Categories" value={String(categories.length)} />
                <StatusRow label="Featured items" value={String(featuredCount)} />
                {error ? (
                  <div className="text-sm text-destructive">{error}</div>
                ) : null}
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Storefront controls"
            subtitle="Draft edits update the preview instantly. Save persists them to the backend."
          >
            <div className="grid gap-5">
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

                  {activeTab === "layout" ? (
                    <LayoutTab theme={draftTheme} onThemeChange={updateTheme} />
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
                      onItemReorder={reorderCategoryItem}
                      onItemVisibilityChange={updateItemVisibility}
                    />
                  ) : null}

                  {activeTab === "assistant" ? (
                    <AssistantPanel
                      tenantSlug={tenantSlug}
                      onRefreshTargets={(targets) => {
                        if (targets.includes("menu")) {
                          void reloadMenuData()
                        }
                      }}
                    />
                  ) : null}
                </motion.div>
              </AnimatePresence>

              {(activeTab === "branding" || activeTab === "layout" || isThemeDirty || saveMessage) ? (
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

        <SectionCard
          title="Live storefront preview"
          subtitle="Uses the tenant's real menu data and the current dashboard draft settings."
        >
          <PreviewPane theme={draftTheme} categories={categories} />
        </SectionCard>
      </div>
    </motion.main>
  )
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
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
    { id: "layout", label: "Layout", icon: <LayoutPanelTop className="h-4 w-4" /> },
    { id: "menu", label: "Menu", icon: <Sparkles className="h-4 w-4" /> },
    { id: "assistant", label: "AI Assistant", icon: <CheckCircle2 className="h-4 w-4" /> },
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
  return (
    <div className="grid gap-5">
      <div className="grid gap-5 lg:grid-cols-2">
        <FieldShell className="lg:col-span-2">
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

        <FieldShell className="lg:col-span-2">
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <ColorField label="Primary" value={theme.primaryColor} onChange={(value) => onThemeChange("primaryColor", value)} />
        <ColorField label="Accent" value={theme.accentColor} onChange={(value) => onThemeChange("accentColor", value)} />
        <ColorField label="Background" value={theme.backgroundColor} onChange={(value) => onThemeChange("backgroundColor", value)} />
        <ColorField label="Surface" value={theme.surfaceColor} onChange={(value) => onThemeChange("surfaceColor", value)} />
        <ColorField label="Text" value={theme.textColor} onChange={(value) => onThemeChange("textColor", value)} />
        <ColorField label="Border" value={theme.borderColor} onChange={(value) => onThemeChange("borderColor", value)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SelectField
          label="Body font"
          value={theme.bodyFont}
          onChange={(value) => onThemeChange("bodyFont", value)}
          options={[
            { label: "Inter", value: "Inter, sans-serif" },
            { label: "System UI", value: "system-ui, sans-serif" },
            { label: "Arial", value: "Arial, sans-serif" },
          ]}
        />
        <SelectField
          label="Heading font"
          value={theme.headingFont}
          onChange={(value) => onThemeChange("headingFont", value)}
          options={[
            { label: "Georgia", value: "Georgia, serif" },
            { label: "Inter", value: "Inter, sans-serif" },
            { label: "Times", value: "\"Times New Roman\", serif" },
          ]}
        />
      </div>

      <details className="rounded-[var(--radius)] border border-border/70 bg-background/70 p-4">
        <summary className="cursor-pointer list-none text-sm font-medium text-foreground">
          Advanced settings
        </summary>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <FieldShell>
            <Label htmlFor="app-title" className={fieldLabelClassName}>
              App title
            </Label>
            <Input
              id="app-title"
              value={theme.appTitle}
              onChange={(event) => onThemeChange("appTitle", event.target.value)}
            />
          </FieldShell>

          <FieldShell>
            <Label htmlFor="hero-image-url" className={fieldLabelClassName}>
              Hero image URL
            </Label>
            <Input
              id="hero-image-url"
              value={theme.heroImageUrl}
              onChange={(event) => onThemeChange("heroImageUrl", event.target.value)}
              placeholder="https://..."
            />
          </FieldShell>

          <FieldShell className="lg:col-span-2">
            <Label htmlFor="tagline" className={fieldLabelClassName}>
              Tagline
            </Label>
            <textarea
              id="tagline"
              value={theme.tagline}
              onChange={(event) => onThemeChange("tagline", event.target.value)}
              rows={2}
              className={textareaClassName}
            />
          </FieldShell>
        </div>
      </details>
    </div>
  )
}

function LayoutTab({
  theme,
  onThemeChange,
}: {
  theme: ThemeDraft
  onThemeChange: ThemeChangeHandler
}) {
  return (
    <div className="grid gap-5">
      <div className="grid gap-4 lg:grid-cols-3">
        <SelectField
          label="Button style"
          value={theme.buttonStyle}
          onChange={(value) => onThemeChange("buttonStyle", value as ThemeDraft["buttonStyle"])}
          options={[
            { label: "Rounded", value: "rounded" },
            { label: "Square", value: "square" },
          ]}
        />
        <SelectField
          label="Hero layout"
          value={theme.heroLayout}
          onChange={(value) => onThemeChange("heroLayout", value as ThemeDraft["heroLayout"])}
          options={[
            { label: "Immersive", value: "immersive" },
            { label: "Minimal", value: "minimal" },
          ]}
        />
        <SelectField
          label="Menu card layout"
          value={theme.menuCardLayout}
          onChange={(value) => onThemeChange("menuCardLayout", value as ThemeDraft["menuCardLayout"])}
          options={[
            { label: "Classic", value: "classic" },
            { label: "Compact grid", value: "compact" },
            { label: "Photo-first", value: "photo-first" },
          ]}
        />
      </div>

      <FieldShell>
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="radius" className={fieldLabelClassName}>
            Card radius
          </Label>
          <span className="text-sm text-muted-foreground">{theme.radius}px</span>
        </div>
        <input
          id="radius"
          type="range"
          min={8}
          max={32}
          step={2}
          value={theme.radius}
          onChange={(event) => onThemeChange("radius", Number(event.target.value))}
          className="accent-primary"
        />
      </FieldShell>

      <div className="grid gap-3 rounded-[var(--radius)] border border-border/70 bg-background/70 p-4">
        <ToggleRow
          checked={theme.showFeaturedBadges}
          label="Show featured item badges"
          onChange={(checked) => onThemeChange("showFeaturedBadges", checked)}
        />
        <Separator />
        <ToggleRow
          checked={theme.showCategoryChips}
          label="Show category chips in the hero"
          onChange={(checked) => onThemeChange("showCategoryChips", checked)}
        />
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
            "flex items-center justify-between gap-3 rounded-[var(--radius)] border border-border/70 bg-background px-3 py-3",
            isSoldOut ? "bg-accent/10" : "",
            isSameCategoryDrag && overDragId === entry.item.id ? "ring-2 ring-ring/20" : "",
          )}
        >
          <div className="flex min-w-0 items-center gap-3">
            <DragHandleButton
              attributes={attributes}
              listeners={listeners}
              label={`Reorder item ${entry.item.name}`}
            />
            <div className="min-w-0">
              <div className="truncate font-medium text-foreground">{entry.item.name}</div>
              <div className="text-sm text-muted-foreground">
                {formatPrice(entry.item.variants[0]?.priceCents ?? entry.item.basePriceCents)}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
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
      <div className="grid grid-cols-[54px_minmax(0,1fr)] items-center gap-3">
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 w-[54px] rounded-[var(--radius)] border border-input bg-background p-1"
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

function ToggleRow({
  checked,
  label,
  onChange,
}: {
  checked: boolean
  label: string
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex items-center justify-between gap-4 text-sm text-foreground">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 accent-primary"
      />
    </label>
  )
}

const fieldLabelClassName = "text-sm font-medium text-muted-foreground"
const textareaClassName =
  "min-h-24 w-full rounded-[var(--radius)] border border-input bg-background px-3 py-3 text-sm text-foreground shadow-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
const selectClassName =
  "h-10 w-full rounded-[var(--radius)] border border-input bg-background px-3 text-sm text-foreground shadow-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
