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

import { AssistantPanel } from "../assistant/AssistantPanel"
import { fetchTenantMenu, type MenuCategory, type MenuResponse } from "../lib/menu"

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
    <section
      style={{
        background: "#ffffff",
        border: "1px solid #dbe5f0",
        borderRadius: 24,
        padding: 20,
        boxShadow: "0 18px 48px rgba(15, 23, 42, 0.08)",
      }}
    >
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>{title}</h2>
        {subtitle ? (
          <p style={{ margin: "6px 0 0", color: "#61708a", fontSize: 14 }}>{subtitle}</p>
        ) : null}
      </div>
      {children}
    </section>
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
  const visibleCategories = previewCategories(categories)
  const cardColumns =
    theme.menuCardLayout === "compact" ? "repeat(2, minmax(0, 1fr))" : "minmax(0, 1fr)"

  return (
    <div
      style={{
        ...previewStyle(theme),
        minHeight: 860,
        borderRadius: 36,
        border: "1px solid rgba(15, 23, 42, 0.08)",
        background: "var(--preview-background)",
        color: "var(--preview-text)",
        padding: 24,
        boxShadow: "0 24px 80px rgba(15, 23, 42, 0.12)",
        fontFamily: "var(--preview-body-font)",
      }}
    >
      <div
        style={{
          borderRadius: cardRadius,
          padding: theme.heroLayout === "immersive" ? "28px 24px" : "20px 20px 12px",
          background:
            theme.heroImageUrl && theme.heroLayout === "immersive"
              ? `linear-gradient(135deg, ${theme.primaryColor}bb, ${theme.accentColor}66), url(${theme.heroImageUrl}) center/cover`
              : theme.heroLayout === "immersive"
                ? `linear-gradient(135deg, ${theme.primaryColor}22, ${theme.accentColor}28)`
                : "var(--preview-surface)",
          border: "1px solid var(--preview-border)",
          marginBottom: 18,
        }}
      >
        <div
          style={{
            display: "inline-flex",
            borderRadius: 999,
            padding: "6px 10px",
            background: "var(--preview-surface)",
            border: "1px solid var(--preview-border)",
            color: "var(--preview-muted)",
            fontSize: 12,
            marginBottom: 14,
          }}
        >
          {theme.heroBadgeText}
        </div>
        <h1
          style={{
            margin: 0,
            fontFamily: "var(--preview-heading-font)",
            fontSize: 36,
            lineHeight: 1.1,
            maxWidth: 640,
          }}
        >
          {theme.heroHeadline}
        </h1>
        <p style={{ margin: "10px 0 0", color: "var(--preview-muted)", maxWidth: 520 }}>
          {theme.heroSubheadline}
        </p>
        {theme.showCategoryChips ? (
          <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
            {visibleCategories.map((category) => (
              <span
                key={category.id}
                style={{
                  padding: "8px 12px",
                  borderRadius: 999,
                  background: "var(--preview-surface)",
                  border: "1px solid var(--preview-border)",
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
            borderRadius: cardRadius,
            marginBottom: 18,
            padding: "14px 16px",
            background: `${theme.accentColor}20`,
            border: "1px solid var(--preview-border)",
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          {theme.promoBannerText}
        </div>
      ) : null}

      <div style={{ display: "grid", gap: 16 }}>
        {visibleCategories.map((category) => (
          <div key={category.id}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 10,
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
                    padding: theme.menuCardLayout === "compact" ? 12 : 16,
                    background: "var(--preview-surface)",
                    border: "1px solid var(--preview-border)",
                    opacity: item.visibility === "SOLD_OUT" ? 0.72 : 1,
                    display: "grid",
                    gap: 10,
                    gridTemplateColumns:
                      theme.menuCardLayout === "photo-first" ? "120px minmax(0, 1fr)" : "1fr",
                  }}
                >
                  {theme.menuCardLayout === "photo-first" ? (
                    <div
                      style={{
                        minHeight: 110,
                        borderRadius: Math.max(12, cardRadius - 8),
                        background:
                          `linear-gradient(135deg, ${theme.primaryColor}22, ${theme.accentColor}18)`,
                        border: "1px solid var(--preview-border)",
                      }}
                    />
                  ) : null}
                  <div style={{ display: "grid", gap: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                      <div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            flexWrap: "wrap",
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
                                fontSize: 11,
                                fontWeight: 700,
                                letterSpacing: "0.04em",
                                textTransform: "uppercase",
                                color: "var(--preview-on-primary)",
                                background: "var(--preview-primary)",
                                borderRadius: 999,
                                padding: "5px 8px",
                              }}
                            >
                              Featured
                            </span>
                          ) : null}
                          {item.visibility === "SOLD_OUT" ? (
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                letterSpacing: "0.04em",
                                textTransform: "uppercase",
                                color: "var(--preview-muted)",
                                background: "transparent",
                                border: "1px solid var(--preview-border)",
                                borderRadius: 999,
                                padding: "5px 8px",
                              }}
                            >
                              Sold out
                            </span>
                          ) : null}
                        </div>
                        {item.description ? (
                          <p style={{ margin: "6px 0 0", color: "var(--preview-muted)" }}>
                            {item.description}
                          </p>
                        ) : null}
                      </div>
                      <strong>{formatPrice(item.variants[0]?.priceCents ?? item.basePriceCents)}</strong>
                    </div>

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {item.tags.map((tag) => (
                        <span
                          key={tag}
                          style={{
                            padding: "4px 8px",
                            borderRadius: 999,
                            background: `${theme.accentColor}1f`,
                            color: "var(--preview-text)",
                            fontSize: 12,
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

                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <button
                        type="button"
                        disabled={item.visibility === "SOLD_OUT"}
                        style={{
                          border: "1px solid var(--preview-border)",
                          borderRadius: 999,
                          padding: "10px 14px",
                          background: item.visibility === "SOLD_OUT" ? "var(--preview-surface)" : "var(--preview-primary)",
                          color: item.visibility === "SOLD_OUT" ? "var(--preview-muted)" : "var(--preview-on-primary)",
                          fontWeight: 700,
                          cursor: item.visibility === "SOLD_OUT" ? "not-allowed" : "pointer",
                        }}
                      >
                        {item.visibility === "SOLD_OUT" ? "Sold out" : "Customize"}
                      </button>
                      {item.variants.length > 1 ? (
                        <div style={{ fontSize: 13, color: "var(--preview-muted)" }}>
                          {item.variants.map((variant) => variant.name).join(" · ")}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ))}
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
    <div style={{ maxWidth: 1560, margin: "0 auto", padding: 24 }}>
      <header style={{ marginBottom: 20 }}>
        <div style={{ color: "#5f6f88", fontSize: 14, fontWeight: 600 }}>
          Restaurant admin dashboard
        </div>
        <h1 style={{ margin: "8px 0 6px", fontSize: 38 }}>Storefront customization</h1>
        <p style={{ margin: 0, maxWidth: 900, color: "#5f6f88", lineHeight: 1.55 }}>
          This dashboard is now the control surface for the customer-facing storefront. Theme,
          hero content, promo messaging, category visibility, featured states, and ordering all
          live here. Kitchen UI stays standardized for now.
        </p>
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(360px, 0.4fr) minmax(0, 0.6fr)",
          gap: 20,
          alignItems: "start",
        }}
      >
        <div style={{ display: "grid", gap: 20 }}>
          <SectionCard
            title="Tenant and storefront"
            subtitle="Use the live tenant menu as the preview data source."
          >
            <div style={{ display: "grid", gap: 12 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 13, color: "#5f6f88", fontWeight: 600 }}>Tenant slug</span>
                <input
                  value={tenantSlug}
                  onChange={(event) => setTenantSlug(event.target.value)}
                  style={inputStyle}
                />
              </label>

              <div
                style={{
                  display: "grid",
                  gap: 8,
                  padding: 14,
                  borderRadius: 16,
                  background: "#f7fafe",
                  border: "1px solid #dbe5f0",
                  fontSize: 14,
                }}
              >
                <div>
                  <strong>Status:</strong> {isLoading ? "Loading" : error ? "Error" : "Loaded"}
                </div>
                <div>
                  <strong>Categories:</strong> {categories.length}
                </div>
                <div>
                  <strong>Featured items:</strong> {featuredCount}
                </div>
                {error ? <div style={{ color: "#b42318" }}>{error}</div> : null}
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Storefront controls"
            subtitle="Draft edits update the preview instantly. Save persists them to the backend."
          >
            <div style={{ display: "grid", gap: 20 }}>
              <TabBar activeTab={activeTab} onChange={setActiveTab} />

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

              {activeTab === "assistant" ? <AssistantPanel /> : null}

              {(activeTab === "branding" || activeTab === "layout" || isThemeDirty || saveMessage) ? (
                <ThemeSaveBar
                  isDirty={isThemeDirty}
                  isLoading={isLoading}
                  isSaving={isSaving}
                  primaryColor={draftTheme.primaryColor}
                  onPrimary={draftTheme.onPrimary}
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
  const tabs: Array<{ id: AdminTab; label: string }> = [
    { id: "branding", label: "Branding" },
    { id: "layout", label: "Layout" },
    { id: "menu", label: "Menu" },
    { id: "assistant", label: "AI Assistant" },
  ]

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 8,
        padding: 8,
        borderRadius: 18,
        background: "#f7fafe",
        border: "1px solid #dbe5f0",
      }}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            style={{
              border: "none",
              borderRadius: 12,
              padding: "10px 14px",
              background: isActive ? "#172033" : "transparent",
              color: isActive ? "#ffffff" : "#5f6f88",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {tab.label}
          </button>
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
    <div style={{ display: "grid", gap: 14 }}>
      <label style={{ display: "grid", gap: 6 }}>
        <span style={labelStyle}>Hero headline</span>
        <textarea
          value={theme.heroHeadline}
          onChange={(event) => onThemeChange("heroHeadline", event.target.value)}
          rows={2}
          style={{ ...inputStyle, resize: "vertical" }}
        />
      </label>

      <label style={{ display: "grid", gap: 6 }}>
        <span style={labelStyle}>Hero subheadline</span>
        <textarea
          value={theme.heroSubheadline}
          onChange={(event) => onThemeChange("heroSubheadline", event.target.value)}
          rows={2}
          style={{ ...inputStyle, resize: "vertical" }}
        />
      </label>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={labelStyle}>Hero badge text</span>
          <input
            value={theme.heroBadgeText}
            onChange={(event) => onThemeChange("heroBadgeText", event.target.value)}
            style={inputStyle}
          />
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={labelStyle}>Promo banner text</span>
          <input
            value={theme.promoBannerText}
            onChange={(event) => onThemeChange("promoBannerText", event.target.value)}
            style={inputStyle}
          />
        </label>
      </div>

      <label style={{ display: "grid", gap: 6 }}>
        <span style={labelStyle}>Hero image URL</span>
        <input
          value={theme.heroImageUrl}
          onChange={(event) => onThemeChange("heroImageUrl", event.target.value)}
          style={inputStyle}
          placeholder="https://..."
        />
      </label>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <ColorField label="Primary" value={theme.primaryColor} onChange={(value) => onThemeChange("primaryColor", value)} />
        <ColorField label="Accent" value={theme.accentColor} onChange={(value) => onThemeChange("accentColor", value)} />
        <ColorField label="Background" value={theme.backgroundColor} onChange={(value) => onThemeChange("backgroundColor", value)} />
        <ColorField label="Surface" value={theme.surfaceColor} onChange={(value) => onThemeChange("surfaceColor", value)} />
        <ColorField label="Text" value={theme.textColor} onChange={(value) => onThemeChange("textColor", value)} />
        <ColorField label="Border" value={theme.borderColor} onChange={(value) => onThemeChange("borderColor", value)} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
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

      <details
        style={{
          border: "1px solid #dbe5f0",
          borderRadius: 16,
          background: "#f9fbfe",
          padding: 16,
        }}
      >
        <summary style={{ cursor: "pointer", fontSize: 14, fontWeight: 700, color: "#172033" }}>
          Advanced settings
        </summary>
        <div style={{ display: "grid", gap: 14, marginTop: 14 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={labelStyle}>App title</span>
            <input
              value={theme.appTitle}
              onChange={(event) => onThemeChange("appTitle", event.target.value)}
              style={inputStyle}
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span style={labelStyle}>Tagline</span>
            <textarea
              value={theme.tagline}
              onChange={(event) => onThemeChange("tagline", event.target.value)}
              rows={2}
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span style={labelStyle}>Hero image URL</span>
            <input
              value={theme.heroImageUrl}
              onChange={(event) => onThemeChange("heroImageUrl", event.target.value)}
              style={inputStyle}
              placeholder="https://..."
            />
          </label>
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
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
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

      <label style={{ display: "grid", gap: 6 }}>
        <span style={labelStyle}>Card radius ({theme.radius}px)</span>
        <input
          type="range"
          min={8}
          max={32}
          step={2}
          value={theme.radius}
          onChange={(event) => onThemeChange("radius", Number(event.target.value))}
        />
      </label>

      <label style={checkboxRowStyle}>
        <input
          type="checkbox"
          checked={theme.showFeaturedBadges}
          onChange={(event) => onThemeChange("showFeaturedBadges", event.target.checked)}
        />
        Show featured item badges
      </label>

      <label style={checkboxRowStyle}>
        <input
          type="checkbox"
          checked={theme.showCategoryChips}
          onChange={(event) => onThemeChange("showCategoryChips", event.target.checked)}
        />
        Show category chips in the hero
      </label>
    </div>
  )
}

function ThemeSaveBar({
  isDirty,
  isLoading,
  isSaving,
  onPrimary,
  onSave,
  primaryColor,
  saveMessage,
}: {
  isDirty: boolean
  isLoading: boolean
  isSaving: boolean
  onPrimary: string
  onSave: () => void
  primaryColor: string
  saveMessage: string | null
}) {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 12,
        alignItems: "center",
        justifyContent: "space-between",
        padding: 16,
        borderRadius: 18,
        border: "1px solid #dbe5f0",
        background: "#f9fbfe",
      }}
    >
      <div style={{ display: "grid", gap: 4 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: isDirty ? "#b45309" : "#5f6f88" }}>
          {isDirty ? "Unsaved changes" : "Draft matches saved settings"}
        </div>
        {saveMessage ? (
          <div
            style={{
              fontSize: 14,
              color: saveMessage.includes("saved") ? "#0f766e" : "#b42318",
            }}
          >
            {saveMessage}
          </div>
        ) : null}
      </div>

      <button
        type="button"
        onClick={onSave}
        disabled={isSaving || isLoading || !isDirty}
        style={{
          border: "none",
          borderRadius: 14,
          padding: "12px 18px",
          background: isSaving || !isDirty ? "#9aa8bc" : primaryColor,
          color: onPrimary,
          fontWeight: 700,
          cursor: isSaving || !isDirty ? "not-allowed" : "pointer",
        }}
      >
        {isSaving ? "Saving…" : "Save storefront settings"}
      </button>
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
      const activeCategoryId = String(active.data.current?.categoryId ?? "")
      const overCategoryId = String(over.data.current?.categoryId ?? "")
      if (!activeCategoryId || activeCategoryId !== overCategoryId) {
        return
      }

      const category = categories.find((entry) => entry.id === activeCategoryId)
      if (!category) {
        return
      }

      const itemIds = category.categoryItems.map((entry) => entry.item.id)
      const oldIndex = itemIds.indexOf(String(active.id))
      const newIndex = itemIds.indexOf(String(over.id))
      if (oldIndex >= 0 && newIndex >= 0 && oldIndex !== newIndex) {
        void Promise.resolve(onItemReorder(activeCategoryId, arrayMove(itemIds, oldIndex, newIndex)))
      }
    }
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div
        style={{
          fontSize: 14,
          color: menuActionMessage?.includes("Failed") ? "#b42318" : "#5f6f88",
        }}
      >
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
          <div style={{ display: "grid", gap: 14 }}>
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
        opacity: isDragging ? 0.6 : 1,
        position: "relative",
      }}
    >
      {showTopDropIndicator ? <DropIndicator position="top" /> : null}
      <div
        style={{
          border: "1px solid #dbe5f0",
          borderRadius: 18,
          padding: 16,
          background: isHidden ? "#f5f7fb" : "#f9fbfe",
          display: "grid",
          gap: 12,
          boxShadow:
            activeDragType === "category" && overDragId === category.id
              ? "0 0 0 2px rgba(23, 32, 51, 0.12)"
              : "none",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <DragHandleButton attributes={attributes} listeners={listeners} label={`Reorder category ${category.name}`} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, opacity: isHidden ? 0.6 : 1 }}>{category.name}</div>
              <div style={{ fontSize: 13, color: "#5f6f88" }}>
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
            <EyeIcon crossed={isHidden} />
          </IconToggleButton>
        </div>

        <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
          <div style={{ display: "grid", gap: 10 }}>
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

        <AddItemInlineForm
          categoryId={category.id}
          onSubmit={onAddItem}
        />
      </div>
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
        opacity: isDragging ? 0.55 : isHidden ? 0.58 : 1,
        position: "relative",
        border: "1px solid #dde6f1",
        borderRadius: 14,
        padding: 14,
        background: isSoldOut ? "#fff7ed" : "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        boxShadow:
          isSameCategoryDrag && overDragId === entry.item.id
            ? "0 0 0 2px rgba(23, 32, 51, 0.12)"
            : "none",
      }}
    >
      {showTopDropIndicator ? <DropIndicator position="top" inset /> : null}
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        <DragHandleButton attributes={attributes} listeners={listeners} label={`Reorder item ${entry.item.name}`} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700 }}>{entry.item.name}</div>
          <div style={{ fontSize: 13, color: "#5f6f88" }}>
            {formatPrice(entry.item.variants[0]?.priceCents ?? entry.item.basePriceCents)}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
          <EyeIcon crossed={isHidden} />
        </IconToggleButton>

        <IconToggleButton
          active={entry.item.isFeatured}
          label={entry.item.isFeatured ? `Unfeature ${entry.item.name}` : `Feature ${entry.item.name}`}
          onClick={() => onFeaturedChange(entry.item.id, !entry.item.isFeatured)}
        >
          <StarIcon filled={entry.item.isFeatured} />
        </IconToggleButton>

        <button
          type="button"
          onClick={() =>
            onVisibilityChange(
              entry.item.id,
              isSoldOut ? "AVAILABLE" : "SOLD_OUT",
            )
          }
          style={{
            border: "1px solid",
            borderColor: isSoldOut ? "#f97316" : "#d7e1ec",
            borderRadius: 999,
            padding: "8px 12px",
            background: isSoldOut ? "#f97316" : "#ffffff",
            color: isSoldOut ? "#ffffff" : "#172033",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Sold out
        </button>

        <button
          type="button"
          onClick={() => {
            if (window.confirm(`Delete ${entry.item.name}?`)) {
              void Promise.resolve(onDelete(entry.item.id))
            }
          }}
          style={{
            border: "1px solid #fecaca",
            borderRadius: 999,
            padding: "8px 12px",
            background: "#ffffff",
            color: "#b42318",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Delete
        </button>
      </div>
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
    <div
      style={{
        borderTop: "1px solid #e2e8f0",
        paddingTop: 12,
        display: "grid",
        gap: 10,
      }}
    >
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          style={{
            ...secondaryButtonStyle,
            width: "fit-content",
            padding: "10px 14px",
            fontWeight: 700,
          }}
        >
          Add item
        </button>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 0.8fr", gap: 10 }}>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Item name"
              style={inputStyle}
            />
            <input
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              placeholder="Price"
              inputMode="decimal"
              style={inputStyle}
            />
          </div>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Description"
            rows={2}
            style={{ ...inputStyle, resize: "vertical" }}
          />
          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              onClick={() => void handleSubmit()}
              style={{
                border: "none",
                borderRadius: 12,
                padding: "10px 14px",
                background: "#172033",
                color: "#ffffff",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Create item
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={secondaryButtonStyle}
            >
              Cancel
            </button>
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
      style={{
        position: "absolute",
        [position]: inset ? 6 : -8,
        left: inset ? 10 : 0,
        right: inset ? 10 : 0,
        height: 4,
        borderRadius: 999,
        background: "#172033",
        pointerEvents: "none",
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
    <button
      type="button"
      aria-label={label}
      {...attributes}
      {...listeners}
      style={{
        border: "1px solid #d7e1ec",
        borderRadius: 10,
        width: 34,
        height: 34,
        display: "grid",
        placeItems: "center",
        background: "#ffffff",
        color: "#61708a",
        cursor: "grab",
        flexShrink: 0,
      }}
    >
      <GripIcon />
    </button>
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
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      style={{
        border: "1px solid",
        borderColor: active ? "#172033" : "#d7e1ec",
        borderRadius: 10,
        width: 34,
        height: 34,
        display: "grid",
        placeItems: "center",
        background: active ? "#172033" : "#ffffff",
        color: active ? "#ffffff" : "#61708a",
        cursor: "pointer",
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  )
}

function EyeIcon({ crossed = false }: { crossed?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6Z" />
      <circle cx="12" cy="12" r="3" />
      {crossed ? <path d="M4 4l16 16" /> : null}
    </svg>
  )
}

function StarIcon({ filled = false }: { filled?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3 2.75 5.57 6.15.89-4.45 4.33 1.05 6.12L12 17.02 6.5 19.91l1.05-6.12L3.1 9.46l6.15-.89L12 3Z" />
    </svg>
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
    <label style={{ display: "grid", gap: 6 }}>
      <span style={labelStyle}>{label}</span>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "52px 1fr",
          gap: 10,
          alignItems: "center",
        }}
      >
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          style={{
            width: 52,
            height: 42,
            padding: 4,
            border: "1px solid #d7e1ec",
            borderRadius: 12,
            background: "#ffffff",
          }}
        />
        <input value={value} onChange={(event) => onChange(event.target.value)} style={inputStyle} />
      </div>
    </label>
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
    <label style={{ display: "grid", gap: 6 }}>
      <span style={labelStyle}>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} style={inputStyle}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

const labelStyle: React.CSSProperties = {
  fontSize: 13,
  color: "#5f6f88",
  fontWeight: 600,
}

const checkboxRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 8,
  alignItems: "center",
  fontSize: 14,
}

const inputStyle: React.CSSProperties = {
  border: "1px solid #d7e1ec",
  borderRadius: 14,
  padding: "12px 14px",
  background: "#f9fbfe",
  color: "#172033",
}

const secondaryButtonStyle: React.CSSProperties = {
  border: "1px solid #d7e1ec",
  borderRadius: 12,
  padding: "8px 12px",
  background: "#ffffff",
  color: "#172033",
  cursor: "pointer",
}
