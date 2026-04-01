import React, { useEffect, useMemo, useState } from "react"

import { AssistantPanel } from "../assistant/AssistantPanel"
import { fetchTenantMenu, type MenuCategory, type MenuResponse } from "../lib/menu"

type ThemeDraft = {
  appTitle: string
  tagline: string
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
  showFeaturedBadges: boolean
}

const defaultThemeDraft: ThemeDraft = {
  appTitle: "Restaurant",
  tagline: "Direct ordering, owned by the restaurant.",
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
  showFeaturedBadges: true,
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function getBrandConfig(menu: MenuResponse) {
  const nested = asRecord(menu.brand)
  return (
    asRecord(menu.brandConfig?.config) ??
    asRecord(nested?.config) ??
    nested ??
    {}
  )
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
    radius:
      typeof config.radius === "number" ? config.radius : defaultThemeDraft.radius,
    buttonStyle:
      config.buttonStyle === "square" ? "square" : defaultThemeDraft.buttonStyle,
    heroLayout:
      config.heroLayout === "minimal" ? "minimal" : defaultThemeDraft.heroLayout,
    showFeaturedBadges:
      typeof config.showFeaturedBadges === "boolean"
        ? config.showFeaturedBadges
        : defaultThemeDraft.showFeaturedBadges,
  }
}

function formatPrice(priceCents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(priceCents / 100)
}

async function patchAdminJson<T>(
  tenantSlug: string,
  path: string,
  body: unknown,
) {
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
            theme.heroLayout === "immersive"
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
          Customer menu preview
        </div>
        <h1
          style={{
            margin: 0,
            fontFamily: "var(--preview-heading-font)",
            fontSize: 36,
            lineHeight: 1.1,
          }}
        >
          {theme.appTitle}
        </h1>
        <p style={{ margin: "10px 0 0", color: "var(--preview-muted)", maxWidth: 480 }}>
          {theme.tagline}
        </p>
        <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
          {categories.map((category) => (
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
      </div>

      <div style={{ display: "grid", gap: 16 }}>
        {categories.map((category) => (
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

            <div style={{ display: "grid", gap: 12 }}>
              {category.categoryItems.map(({ id, item }) => (
                <article
                  key={id}
                  style={{
                    borderRadius: cardRadius,
                    padding: 16,
                    background: "var(--preview-surface)",
                    border: "1px solid var(--preview-border)",
                    display: "grid",
                    gap: 10,
                  }}
                >
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
  const [themeDraft, setThemeDraft] = useState<ThemeDraft>(defaultThemeDraft)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [menuActionMessage, setMenuActionMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

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
        setMenuData(menu)
        setThemeDraft(buildDraft(menu))
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

  const updateTheme = <K extends keyof ThemeDraft>(key: K, value: ThemeDraft[K]) => {
    setThemeDraft((current) => ({ ...current, [key]: value }))
  }

  const reloadMenu = async () => {
    const refreshedMenu = await fetchTenantMenu(tenantSlug)
    setMenuData(refreshedMenu)
    setThemeDraft(buildDraft(refreshedMenu))
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
        body: JSON.stringify({
          appTitle: themeDraft.appTitle,
          tagline: themeDraft.tagline,
          primaryColor: themeDraft.primaryColor,
          accentColor: themeDraft.accentColor,
          backgroundColor: themeDraft.backgroundColor,
          surfaceColor: themeDraft.surfaceColor,
          textColor: themeDraft.textColor,
          mutedColor: themeDraft.mutedColor,
          borderColor: themeDraft.borderColor,
          onPrimary: themeDraft.onPrimary,
          fontFamily: themeDraft.bodyFont,
          headingFont: themeDraft.headingFont,
          radius: themeDraft.radius,
          buttonStyle: themeDraft.buttonStyle,
          heroLayout: themeDraft.heroLayout,
          showFeaturedBadges: themeDraft.showFeaturedBadges,
        }),
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null
        throw new Error(payload?.error ?? `Failed to save theme (${response.status})`)
      }

      await reloadMenu()
      setSaveMessage("Storefront settings saved.")
    } catch (nextError) {
      setSaveMessage(nextError instanceof Error ? nextError.message : "Failed to save theme")
    } finally {
      setIsSaving(false)
    }
  }

  const reorderCategories = async (categoryId: string, direction: "up" | "down") => {
    if (!menuData) return

    const currentIndex = categories.findIndex((category) => category.id === categoryId)
    const swapIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1
    if (currentIndex < 0 || swapIndex < 0 || swapIndex >= categories.length) return

    const reordered = [...categories]
    ;[reordered[currentIndex], reordered[swapIndex]] = [reordered[swapIndex], reordered[currentIndex]]

    try {
      setMenuActionMessage("Saving category order…")
      await Promise.all(
        reordered.map((category, index) =>
          patchAdminJson(tenantSlug, `/admin/menu/categories/${category.id}`, {
            sortOrder: index,
          }),
        ),
      )
      await reloadMenu()
      setMenuActionMessage("Category order saved.")
    } catch (nextError) {
      setMenuActionMessage(nextError instanceof Error ? nextError.message : "Failed to reorder categories")
    }
  }

  const reorderCategoryItem = async (
    categoryId: string,
    itemId: string,
    direction: "up" | "down",
  ) => {
    const category = categories.find((entry) => entry.id === categoryId)
    if (!category) return

    const itemIndex = category.categoryItems.findIndex((entry) => entry.item.id === itemId)
    const swapIndex = direction === "up" ? itemIndex - 1 : itemIndex + 1
    if (itemIndex < 0 || swapIndex < 0 || swapIndex >= category.categoryItems.length) return

    const nextOrder = [...category.categoryItems.map((entry) => entry.item.id)]
    ;[nextOrder[itemIndex], nextOrder[swapIndex]] = [nextOrder[swapIndex], nextOrder[itemIndex]]

    try {
      setMenuActionMessage("Saving item order…")
      await patchAdminJson(tenantSlug, `/admin/menu/categories/${categoryId}/items/reorder`, {
        itemIds: nextOrder,
      })
      await reloadMenu()
      setMenuActionMessage("Item order saved.")
    } catch (nextError) {
      setMenuActionMessage(nextError instanceof Error ? nextError.message : "Failed to reorder items")
    }
  }

  const updateItemPresentation = async (
    itemId: string,
    body: Record<string, unknown>,
    successMessage: string,
  ) => {
    try {
      setMenuActionMessage("Saving item settings…")
      await patchAdminJson(tenantSlug, `/admin/menu/items/${itemId}`, body)
      await reloadMenu()
      setMenuActionMessage(successMessage)
    } catch (nextError) {
      setMenuActionMessage(nextError instanceof Error ? nextError.message : "Failed to update item")
    }
  }

  const updateItemVisibility = async (itemId: string, visibility: string) => {
    try {
      setMenuActionMessage("Saving availability…")
      await patchAdminJson(tenantSlug, `/admin/menu/items/${itemId}/availability`, { visibility })
      await reloadMenu()
      setMenuActionMessage("Availability updated.")
    } catch (nextError) {
      setMenuActionMessage(nextError instanceof Error ? nextError.message : "Failed to update availability")
    }
  }

  return (
    <div style={{ maxWidth: 1520, margin: "0 auto", padding: 24 }}>
      <header style={{ marginBottom: 20 }}>
        <div style={{ color: "#5f6f88", fontSize: 14, fontWeight: 600 }}>
          Restaurant admin dashboard
        </div>
        <h1 style={{ margin: "8px 0 6px", fontSize: 38 }}>Storefront customization</h1>
        <p style={{ margin: 0, maxWidth: 900, color: "#5f6f88", lineHeight: 1.55 }}>
          This dashboard now prioritizes customer-facing menu presentation controls. Kitchen UI
          remains standardized for now. The right pane previews how the storefront changes as the
          restaurant edits its brand and menu presentation.
        </p>
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "420px minmax(0, 1fr)",
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
                  style={{
                    border: "1px solid #d7e1ec",
                    borderRadius: 14,
                    padding: "12px 14px",
                    background: "#f9fbfe",
                  }}
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
                  <strong>Status:</strong>{" "}
                  {isLoading ? "Loading" : error ? "Error" : "Loaded"}
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
            title="Brand and layout controls"
            subtitle="These are the controls the restaurant owner uses to shape the storefront."
          >
            <div style={{ display: "grid", gap: 14 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 13, color: "#5f6f88", fontWeight: 600 }}>App title</span>
                <input
                  value={themeDraft.appTitle}
                  onChange={(event) => updateTheme("appTitle", event.target.value)}
                  style={inputStyle}
                />
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 13, color: "#5f6f88", fontWeight: 600 }}>Tagline</span>
                <textarea
                  value={themeDraft.tagline}
                  onChange={(event) => updateTheme("tagline", event.target.value)}
                  rows={3}
                  style={{ ...inputStyle, resize: "vertical" }}
                />
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <ColorField
                  label="Primary"
                  value={themeDraft.primaryColor}
                  onChange={(value) => updateTheme("primaryColor", value)}
                />
                <ColorField
                  label="Accent"
                  value={themeDraft.accentColor}
                  onChange={(value) => updateTheme("accentColor", value)}
                />
                <ColorField
                  label="Background"
                  value={themeDraft.backgroundColor}
                  onChange={(value) => updateTheme("backgroundColor", value)}
                />
                <ColorField
                  label="Surface"
                  value={themeDraft.surfaceColor}
                  onChange={(value) => updateTheme("surfaceColor", value)}
                />
                <ColorField
                  label="Text"
                  value={themeDraft.textColor}
                  onChange={(value) => updateTheme("textColor", value)}
                />
                <ColorField
                  label="Border"
                  value={themeDraft.borderColor}
                  onChange={(value) => updateTheme("borderColor", value)}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <SelectField
                  label="Body font"
                  value={themeDraft.bodyFont}
                  onChange={(value) => updateTheme("bodyFont", value)}
                  options={[
                    { label: "Inter", value: "Inter, sans-serif" },
                    { label: "System UI", value: "system-ui, sans-serif" },
                    { label: "Arial", value: "Arial, sans-serif" },
                  ]}
                />
                <SelectField
                  label="Heading font"
                  value={themeDraft.headingFont}
                  onChange={(value) => updateTheme("headingFont", value)}
                  options={[
                    { label: "Georgia", value: "Georgia, serif" },
                    { label: "Inter", value: "Inter, sans-serif" },
                    { label: "Times", value: "\"Times New Roman\", serif" },
                  ]}
                />
                <SelectField
                  label="Button style"
                  value={themeDraft.buttonStyle}
                  onChange={(value) =>
                    updateTheme("buttonStyle", value as ThemeDraft["buttonStyle"])
                  }
                  options={[
                    { label: "Rounded", value: "rounded" },
                    { label: "Square", value: "square" },
                  ]}
                />
                <SelectField
                  label="Hero layout"
                  value={themeDraft.heroLayout}
                  onChange={(value) =>
                    updateTheme("heroLayout", value as ThemeDraft["heroLayout"])
                  }
                  options={[
                    { label: "Immersive", value: "immersive" },
                    { label: "Minimal", value: "minimal" },
                  ]}
                />
              </div>

              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 13, color: "#5f6f88", fontWeight: 600 }}>
                  Card radius ({themeDraft.radius}px)
                </span>
                <input
                  type="range"
                  min={8}
                  max={32}
                  step={2}
                  value={themeDraft.radius}
                  onChange={(event) => updateTheme("radius", Number(event.target.value))}
                />
              </label>

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 0 0",
                  fontSize: 14,
                }}
              >
                <input
                  type="checkbox"
                  checked={themeDraft.showFeaturedBadges}
                  onChange={(event) =>
                    updateTheme("showFeaturedBadges", event.target.checked)
                  }
                />
                Show featured item badges in the storefront preview
              </label>

              <div style={{ display: "flex", gap: 12, alignItems: "center", paddingTop: 6 }}>
                <button
                  type="button"
                  onClick={saveTheme}
                  disabled={isSaving || isLoading}
                  style={{
                    border: "none",
                    borderRadius: 14,
                    padding: "12px 18px",
                    background: isSaving ? "#9aa8bc" : themeDraft.primaryColor,
                    color: themeDraft.onPrimary,
                    fontWeight: 700,
                    cursor: isSaving ? "wait" : "pointer",
                  }}
                >
                  {isSaving ? "Saving…" : "Save storefront settings"}
                </button>
                {saveMessage ? (
                  <span
                    style={{
                      fontSize: 14,
                      color: saveMessage.includes("saved") ? "#0f766e" : "#b42318",
                    }}
                  >
                    {saveMessage}
                  </span>
                ) : null}
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Menu presentation controls"
            subtitle="Reorder categories and items, control featured states, and manage storefront visibility."
          >
            <div style={{ display: "grid", gap: 16 }}>
              <div
                style={{
                  fontSize: 14,
                  color: menuActionMessage?.includes("Failed") || menuActionMessage?.includes("error")
                    ? "#b42318"
                    : "#5f6f88",
                }}
              >
                {menuActionMessage ?? "All changes here immediately shape the customer-facing menu."}
              </div>

              {categories.map((category, categoryIndex) => (
                <div
                  key={category.id}
                  style={{
                    border: "1px solid #dbe5f0",
                    borderRadius: 18,
                    padding: 14,
                    background: "#f9fbfe",
                    display: "grid",
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700 }}>{category.name}</div>
                      <div style={{ fontSize: 13, color: "#5f6f88" }}>
                        {category.categoryItems.length} items
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => reorderCategories(category.id, "up")}
                        disabled={categoryIndex === 0}
                        style={secondaryButtonStyle}
                      >
                        Move up
                      </button>
                      <button
                        type="button"
                        onClick={() => reorderCategories(category.id, "down")}
                        disabled={categoryIndex === categories.length - 1}
                        style={secondaryButtonStyle}
                      >
                        Move down
                      </button>
                    </div>
                  </div>

                  <div style={{ display: "grid", gap: 10 }}>
                    {category.categoryItems.map((entry, itemIndex) => (
                      <div
                        key={entry.id}
                        style={{
                          border: "1px solid #dde6f1",
                          borderRadius: 14,
                          padding: 12,
                          background: "#ffffff",
                          display: "grid",
                          gap: 10,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "start",
                            gap: 12,
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 700 }}>{entry.item.name}</div>
                            <div style={{ fontSize: 13, color: "#5f6f88" }}>
                              {formatPrice(entry.item.variants[0]?.priceCents ?? entry.item.basePriceCents)}
                              {" · "}
                              {entry.item.isFeatured ? "Featured" : "Standard"}
                              {" · "}
                              {entry.item.visibility}
                            </div>
                          </div>

                          <div style={{ display: "flex", gap: 8 }}>
                            <button
                              type="button"
                              onClick={() => reorderCategoryItem(category.id, entry.item.id, "up")}
                              disabled={itemIndex === 0}
                              style={secondaryButtonStyle}
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              onClick={() => reorderCategoryItem(category.id, entry.item.id, "down")}
                              disabled={itemIndex === category.categoryItems.length - 1}
                              style={secondaryButtonStyle}
                            >
                              ↓
                            </button>
                          </div>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                          <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14 }}>
                            <input
                              type="checkbox"
                              checked={entry.item.isFeatured}
                              onChange={(event) =>
                                void updateItemPresentation(
                                  entry.item.id,
                                  { isFeatured: event.target.checked },
                                  "Featured state updated.",
                                )
                              }
                            />
                            Featured item
                          </label>

                          <label style={{ display: "grid", gap: 6 }}>
                            <span style={{ fontSize: 13, color: "#5f6f88", fontWeight: 600 }}>
                              Visibility
                            </span>
                            <select
                              value={entry.item.visibility}
                              onChange={(event) =>
                                void updateItemVisibility(entry.item.id, event.target.value)
                              }
                              style={inputStyle}
                            >
                              <option value="AVAILABLE">Available</option>
                              <option value="SOLD_OUT">Sold out</option>
                              <option value="HIDDEN">Hidden</option>
                              <option value="SCHEDULED">Scheduled</option>
                            </select>
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <AssistantPanel />
        </div>

        <SectionCard
          title="Live storefront preview"
          subtitle="Uses the tenant's real menu data and the current dashboard draft settings."
        >
          <PreviewPane theme={themeDraft} categories={categories} />
        </SectionCard>
      </div>
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
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 13, color: "#5f6f88", fontWeight: 600 }}>{label}</span>
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
      <span style={{ fontSize: 13, color: "#5f6f88", fontWeight: 600 }}>{label}</span>
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
