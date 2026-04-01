import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { Flame, MapPin, ShieldCheck, Sparkles, Timer } from "lucide-react"

import { Button } from "../components/Button"
import { fetchTenantMenu } from "../lib/menu"
import type { MenuCategory, MenuItem } from "../lib/menu"
import { useTheme } from "../theme/ThemeProvider"
import { useThemePlaygroundStore } from "../theme/store"

function formatPrice(priceCents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(priceCents / 100)
}

function itemPrice(item: MenuItem) {
  return item.variants.find((variant) => variant.isDefault)?.priceCents ?? item.basePriceCents
}

function visibleCategories(categories: MenuCategory[]) {
  return categories
    .filter((category) => category.visibility !== "HIDDEN")
    .map((category) => ({
      ...category,
      categoryItems: category.categoryItems.filter(
        (entry) => entry.item.visibility !== "HIDDEN",
      ),
    }))
    .filter((category) => category.categoryItems.length > 0)
}

export function StorefrontPage() {
  const { theme, isLoading: isThemeLoading, errorMessage: themeError } = useTheme()
  const { tenantSlug, source } = useThemePlaygroundStore()
  const menuQuery = useQuery({
    queryKey: ["tenant-menu", tenantSlug],
    queryFn: () => fetchTenantMenu(tenantSlug),
    enabled: source === "api",
    staleTime: 60_000,
  })

  const categories = useMemo(
    () => visibleCategories(menuQuery.data?.categories ?? []),
    [menuQuery.data?.categories],
  )

  const featuredItems = useMemo(
    () =>
      categories.flatMap((category) =>
        category.categoryItems
          .map((entry) => entry.item)
          .filter((item) => item.isFeatured),
      ),
    [categories],
  )

  const menuCardColumns =
    theme.menuCardLayout === "compact"
      ? "md:grid-cols-2"
      : theme.menuCardLayout === "photo-first"
        ? "lg:grid-cols-2"
        : ""

  return (
    <main className="min-h-screen bg-brand-background text-brand-text">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-brand border border-brand-border/70 bg-brand-surface/90 px-4 py-3 text-sm text-brand-muted shadow-brand">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            Live storefront for tenant <span className="font-semibold text-brand-text">{tenantSlug}</span>
          </div>
          <div className="flex items-center gap-4">
            <span>Source: {source === "api" ? "Saved admin config" : "Preset preview"}</span>
            <span className="rounded-full border border-brand-border px-3 py-1">
              Direct ordering
            </span>
          </div>
        </div>

        <section className="overflow-hidden rounded-[32px] border border-brand-border/70 bg-brand-surface shadow-brand">
          <div
            className="px-6 py-10 sm:px-8 lg:px-10"
            style={{
              background:
                theme.heroImageUrl && theme.heroLayout === "immersive"
                  ? `${theme.heroGradient}, url(${theme.heroImageUrl}) center/cover`
                  : theme.heroGradient,
            }}
          >
            <div className="max-w-3xl space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-brand-border/70 bg-brand-surface/75 px-3 py-1 text-sm text-brand-muted backdrop-blur">
                <Sparkles className="h-4 w-4" />
                {theme.heroBadgeText}
              </div>

              <div className="space-y-3">
                <h1
                  className="max-w-3xl text-4xl leading-tight sm:text-5xl"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  {theme.heroHeadline}
                </h1>
                <p className="max-w-2xl text-base text-brand-muted sm:text-lg">
                  {theme.heroSubheadline}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button>Start order</Button>
                <Button className="bg-brand-surface text-brand-text">Browse menu</Button>
              </div>

              <div className="flex flex-wrap gap-5 pt-2 text-sm text-brand-muted">
                <div className="flex items-center gap-2">
                  <Timer className="h-4 w-4" />
                  Prep times visible on menu items
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Direct pickup ordering
                </div>
              </div>
            </div>
          </div>
        </section>

        {theme.promoBannerText ? (
          <section className="mt-5 rounded-brand border border-brand-border/70 bg-brand-surface px-5 py-4 shadow-brand">
            <div className="flex items-start gap-3">
              <Flame className="mt-0.5 h-5 w-5 text-brand-primary" />
              <div>
                <div className="text-sm font-semibold uppercase tracking-[0.12em] text-brand-muted">
                  Current Offer
                </div>
                <div className="mt-1 text-lg font-semibold">{theme.promoBannerText}</div>
              </div>
            </div>
          </section>
        ) : null}

        {theme.showCategoryChips && categories.length > 0 ? (
          <section className="mt-5 flex flex-wrap gap-3">
            {categories.map((category) => (
              <a
                key={category.id}
                href={`#category-${category.id}`}
                className="rounded-full border border-brand-border bg-brand-surface px-4 py-2 text-sm font-medium text-brand-text shadow-brand"
              >
                {category.name}
              </a>
            ))}
          </section>
        ) : null}

        {featuredItems.length > 0 ? (
          <section className="mt-10">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <div className="text-sm font-semibold uppercase tracking-[0.12em] text-brand-muted">
                  Featured
                </div>
                <h2 className="mt-1 text-3xl" style={{ fontFamily: "var(--font-heading)" }}>
                  Most popular right now
                </h2>
              </div>
            </div>

            <div className={`grid gap-4 ${menuCardColumns}`}>
              {featuredItems.map((item) => (
                <MenuItemCard key={`featured-${item.id}`} item={item} themeMode={theme.menuCardLayout} featured />
              ))}
            </div>
          </section>
        ) : null}

        <section className="mt-12 space-y-10">
          {categories.map((category) => (
            <div key={category.id} id={`category-${category.id}`}>
              <div className="mb-4 flex items-center justify-between gap-4">
                <h2 className="text-3xl" style={{ fontFamily: "var(--font-heading)" }}>
                  {category.name}
                </h2>
                <div className="text-sm text-brand-muted">{category.categoryItems.length} items</div>
              </div>

              <div className={`grid gap-4 ${menuCardColumns}`}>
                {category.categoryItems.map((entry) => (
                  <MenuItemCard
                    key={entry.id}
                    item={entry.item}
                    themeMode={theme.menuCardLayout}
                  />
                ))}
              </div>
            </div>
          ))}
        </section>

        {(isThemeLoading || menuQuery.isLoading) && source === "api" ? (
          <div className="mt-8 rounded-brand border border-dashed border-brand-border bg-brand-surface px-5 py-4 text-sm text-brand-muted">
            Loading tenant storefront…
          </div>
        ) : null}

        {themeError || menuQuery.error ? (
          <div className="mt-8 rounded-brand border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            {themeError ?? (menuQuery.error instanceof Error ? menuQuery.error.message : "Failed to load storefront")}
          </div>
        ) : null}
      </div>
    </main>
  )
}

function MenuItemCard({
  item,
  themeMode,
  featured = false,
}: {
  item: MenuItem
  themeMode: "classic" | "compact" | "photo-first"
  featured?: boolean
}) {
  const isPhotoFirst = themeMode === "photo-first"
  const isCompact = themeMode === "compact"

  return (
    <article
      className={[
        "rounded-[28px] border border-brand-border/70 bg-brand-surface shadow-brand",
        isPhotoFirst ? "grid grid-cols-[112px_minmax(0,1fr)] gap-0 overflow-hidden" : "p-5",
      ].join(" ")}
    >
      {isPhotoFirst ? <div className="min-h-full bg-brand-hero" /> : null}

      <div className={isPhotoFirst ? "p-5" : ""}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3
                className={isCompact ? "text-lg" : "text-xl"}
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {item.name}
              </h3>
              {featured ? (
                <span className="rounded-full bg-brand-primary px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-primary-foreground">
                  Featured
                </span>
              ) : null}
              {item.visibility === "SOLD_OUT" ? (
                <span className="rounded-full border border-brand-border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-muted">
                  Sold out
                </span>
              ) : null}
            </div>
            {item.description ? (
              <p className="mt-2 text-sm leading-6 text-brand-muted">{item.description}</p>
            ) : null}
          </div>
          <div className="text-right">
            <div className="text-lg font-semibold">{formatPrice(itemPrice(item))}</div>
            <div className="mt-1 text-xs text-brand-muted">
              {item.variants.length > 1 ? `${item.variants.length} sizes` : "Standard"}
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {item.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-brand-primary/10 px-2.5 py-1 text-xs font-medium text-brand-text"
            >
              {tag}
            </span>
          ))}
          {item.prepTimeMinutes ? (
            <span className="rounded-full border border-brand-border px-2.5 py-1 text-xs text-brand-muted">
              {item.prepTimeMinutes} min
            </span>
          ) : null}
          {item.itemModifierGroups.length > 0 ? (
            <span className="rounded-full border border-brand-border px-2.5 py-1 text-xs text-brand-muted">
              Customizable
            </span>
          ) : null}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button className="text-sm">Customize</Button>
          {item.variants.length > 1 ? (
            <div className="text-sm text-brand-muted">
              {item.variants.map((variant) => variant.name).join(" · ")}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  )
}
