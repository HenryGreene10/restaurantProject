import { useEffect, useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowRight, ChefHat, ShieldCheck, Sparkles, UtensilsCrossed } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { createPickupOrder } from "../lib/orders"
import { fetchTenantMenu } from "../lib/menu"
import type { MenuCategory, MenuItem } from "../lib/menu"
import { CartSummary } from "./CartSummary"
import {
  dismissActiveOrderForSession,
  isActiveOrderDismissed,
  readActiveOrder,
  type ActiveOrderRecord,
  writeActiveOrder,
} from "./activeOrder"
import { useCheckoutStore } from "./checkoutStore"
import { ItemCustomizationDrawer } from "./ItemCustomizationDrawer"
import { type CartItem, useCartStore } from "./cartStore"
import { useTheme } from "../theme/ThemeProvider"
import { useThemePlaygroundStore } from "../theme/store"
import type { CustomerSessionController } from "./useCustomerSession"

function formatPrice(priceCents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(priceCents / 100)
}

function itemPrice(item: MenuItem) {
  return item.variants.find((variant) => variant.isDefault)?.priceCents ?? item.basePriceCents
}

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

function visibleCategories(categories: MenuCategory[]) {
  return categories
    .filter((category) => category.visibility !== "HIDDEN")
    .map((category) => ({
      ...category,
      categoryItems: category.categoryItems.filter(
        (entry) => entry.item.visibility !== "HIDDEN",
      ),
    }))
}

export function StorefrontPage({
  customerSession,
  onViewOrder,
}: {
  customerSession: CustomerSessionController
  onViewOrder: (orderId: string) => void
}) {
  const showDevBanner =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("dev") === "true"
  const { theme, isLoading: isThemeLoading, errorMessage: themeError } = useTheme()
  const { tenantSlug, source } = useThemePlaygroundStore()
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
  const [editingCartItem, setEditingCartItem] = useState<CartItem | null>(null)
  const [cartOpen, setCartOpen] = useState(false)
  const [submittingOrder, setSubmittingOrder] = useState(false)
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null)
  const [activeOrderBanner, setActiveOrderBanner] = useState<ActiveOrderRecord | null>(null)
  const cartItems = useCartStore((state) => state.items)
  const addItem = useCartStore((state) => state.addItem)
  const updateCartItem = useCartStore((state) => state.updateItem)
  const removeItem = useCartStore((state) => state.removeItem)
  const incrementQuantity = useCartStore((state) => state.incrementQuantity)
  const decrementQuantity = useCartStore((state) => state.decrementQuantity)
  const clearCart = useCartStore((state) => state.clear)
  const customerName = useCheckoutStore((state) => state.customerName)
  const customerPhone = useCheckoutStore((state) => state.customerPhone)
  const orderNotes = useCheckoutStore((state) => state.orderNotes)
  const setCustomerName = useCheckoutStore((state) => state.setCustomerName)
  const setCustomerPhone = useCheckoutStore((state) => state.setCustomerPhone)
  const setOrderNotes = useCheckoutStore((state) => state.setOrderNotes)
  const resetAfterOrder = useCheckoutStore((state) => state.resetAfterOrder)
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
  const itemLookup = useMemo(
    () =>
      new Map(
        categories
          .flatMap((category) => category.categoryItems.map((entry) => entry.item))
          .map((item) => [item.id, item] as const),
      ),
    [categories],
  )

  const hasVisibleItems = categories.some((category) => category.categoryItems.length > 0)
  const showLoadingSkeletons = source === "api" && !menuQuery.data && (menuQuery.isLoading || isThemeLoading)

  useEffect(() => {
    if (!categories.length) {
      setActiveCategoryId(null)
      return
    }

    setActiveCategoryId((current) => current ?? categories[0]?.id ?? null)

    const sections = categories
      .map((category) => document.getElementById(`category-${category.id}`))
      .filter((section): section is HTMLElement => Boolean(section))

    if (!sections.length) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0]

        if (!visible) return

        setActiveCategoryId(visible.target.id.replace("category-", ""))
      },
      {
        rootMargin: "-20% 0px -55% 0px",
        threshold: [0.2, 0.45, 0.7],
      },
    )

    sections.forEach((section) => observer.observe(section))
    return () => observer.disconnect()
  }, [categories])

  useEffect(() => {
    if (customerSession.customerPhone && !customerPhone.trim()) {
      setCustomerPhone(customerSession.customerPhone)
    }
  }, [customerPhone, customerSession.customerPhone, setCustomerPhone])

  useEffect(() => {
    const activeOrder = readActiveOrder()
    if (!activeOrder || activeOrder.tenantSlug !== tenantSlug || isActiveOrderDismissed(activeOrder)) {
      setActiveOrderBanner(null)
      return
    }

    setActiveOrderBanner(activeOrder)
  }, [tenantSlug])

  async function submitPickupOrder(payload: {
    customerName: string
    customerPhone: string
    orderNotes: string | null
  }) {
    setSubmittingOrder(true)

    try {
      const order = await createPickupOrder({
        tenantSlug,
        accessToken: customerSession.accessToken,
        customerName: payload.customerName,
        customerPhone: payload.customerPhone,
        orderNotes: payload.orderNotes,
        items: cartItems,
      })

      const activeOrder = {
        orderId: order.id,
        tenantSlug,
        placedAt: new Date().toISOString(),
      } satisfies ActiveOrderRecord

      writeActiveOrder(activeOrder)
      setActiveOrderBanner(activeOrder)

      clearCart()
      resetAfterOrder()
      setCartOpen(false)
      onViewOrder(order.id)
    } finally {
      setSubmittingOrder(false)
    }
  }

  function scrollToCategory(categoryId: string) {
    document.getElementById(`category-${categoryId}`)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    })
    setActiveCategoryId(categoryId)
  }

  return (
    <motion.main
      className="min-h-screen bg-background text-foreground"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: "easeOut" }}
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-8">
        {showDevBanner ? (
          <Card className="border-border/80 bg-card shadow-sm">
            <CardContent className="flex flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <ShieldCheck className="h-4 w-4" />
                <span>
                  Live storefront for tenant{" "}
                  <span className="font-semibold text-foreground">{tenantSlug}</span>
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>Source: {source === "api" ? "Saved admin config" : "Preset preview"}</span>
                <Badge variant="outline" className="border-border bg-background text-muted-foreground">
                  Direct ordering
                </Badge>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {activeOrderBanner ? (
          <Card className="border-border/80 bg-card shadow-sm">
            <CardContent className="flex flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
              <div className="text-sm text-muted-foreground">
                You have an active order —{" "}
                <button
                  type="button"
                  className="font-semibold text-foreground underline"
                  onClick={() => onViewOrder(activeOrderBanner.orderId)}
                >
                  track it here
                </button>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => {
                  dismissActiveOrderForSession(activeOrderBanner)
                  setActiveOrderBanner(null)
                }}
                aria-label="Dismiss active order banner"
              >
                <span aria-hidden="true">×</span>
              </Button>
            </CardContent>
          </Card>
        ) : null}

        <AnimatePresence mode="wait">
          {showLoadingSkeletons ? (
            <motion.div
              key="storefront-skeletons"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="grid gap-8"
            >
              <StorefrontLoadingSkeleton />
            </motion.div>
          ) : (
            <motion.div
              key="storefront-content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="grid gap-8"
            >
              <section className="overflow-hidden rounded-[var(--radius)] border border-border/80 bg-card shadow-sm">
                <div
                  className="flex min-h-[200px] items-end px-4 py-8 sm:px-6 sm:py-12 lg:min-h-[320px] lg:px-8 lg:py-12"
                  style={{
                    background: theme.heroImageUrl
                      ? `linear-gradient(${hexToRgba(theme.palette.text, 0.56)}, ${hexToRgba(theme.palette.text, 0.56)}), url(${theme.heroImageUrl}) center/cover`
                      : `linear-gradient(135deg, ${hexToRgba(theme.palette.primary, 0.15)}, ${hexToRgba(theme.palette.primary, 0.1)}), ${theme.palette.surface}`,
                  }}
                >
                  <div className="grid max-w-4xl gap-6">
                    {theme.logoUrl ? (
                      <div
                        className="h-16 w-16 rounded-[12px] border border-border/80 bg-card/90 bg-contain bg-center bg-no-repeat shadow-sm"
                        style={{ backgroundImage: `url(${theme.logoUrl})` }}
                      />
                    ) : null}

                    {theme.heroBadgeText.trim() ? (
                      <Badge
                        variant="outline"
                        className="w-fit border-border/80 bg-card/90 px-4 py-2 text-sm text-muted-foreground backdrop-blur"
                      >
                        <Sparkles className="h-4 w-4" />
                        {theme.heroBadgeText}
                      </Badge>
                    ) : null}

                    <div className="grid gap-4">
                      <h1
                        className="max-w-4xl font-bold leading-[0.95]"
                        style={{
                          fontFamily: "var(--font-heading)",
                          fontSize: "clamp(3rem, 7vw, 5.5rem)",
                          color: theme.heroImageUrl ? theme.palette.primaryForeground : undefined,
                        }}
                      >
                        {theme.heroHeadline}
                      </h1>
                      <p
                        className="max-w-3xl leading-8"
                        style={{
                          fontSize: "clamp(1.1rem, 2.8vw, 1.2rem)",
                          color: theme.heroImageUrl ? hexToRgba(theme.palette.primaryForeground, 0.84) : theme.palette.muted,
                        }}
                      >
                        {theme.heroSubheadline}
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {theme.promoBannerText ? (
                <Card className="border-border/80 bg-card shadow-sm">
                  <CardContent className="px-4 py-4 sm:px-6">
                    <p className="text-sm leading-6 text-muted-foreground">{theme.promoBannerText}</p>
                  </CardContent>
                </Card>
              ) : null}

              {categories.length > 0 ? (
                <div className="sticky top-0 z-20 -mx-4 border-y border-border/70 bg-background/95 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
                  <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    <div className="flex w-max min-w-full gap-2">
                      {categories.map((category) => (
                        <Button
                          key={category.id}
                          type="button"
                          variant={activeCategoryId === category.id ? "default" : "outline"}
                          className={cn(
                            "min-h-11 rounded-full px-4",
                            activeCategoryId === category.id
                              ? "shadow-sm"
                              : "bg-card text-foreground hover:bg-card",
                          )}
                          onClick={() => scrollToCategory(category.id)}
                        >
                          {category.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}

              {featuredItems.length > 0 ? (
                <section className="grid gap-6">
                  <div className="flex items-end justify-between gap-4">
                    <div className="grid gap-2">
                      <div className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                        Featured
                      </div>
                      <h2
                        className="text-3xl font-bold text-foreground sm:text-4xl"
                        style={{ fontFamily: "var(--font-heading)" }}
                      >
                        Most popular right now
                      </h2>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {featuredItems.map((item) => (
                      <MenuItemCard
                        key={`featured-${item.id}`}
                        item={item}
                        featured
                        onCustomize={() => {
                          setEditingCartItem(null)
                          setSelectedItem(item)
                        }}
                      />
                    ))}
                  </div>
                </section>
              ) : null}

              {!categories.length || !hasVisibleItems ? (
                <EmptyStateCard
                  icon={UtensilsCrossed}
                  title="Menu coming soon"
                  description="This storefront is getting ready for service. Check back soon for the full menu."
                />
              ) : (
                <section className="grid gap-12">
                  {categories.map((category) => (
                    <section key={category.id} id={`category-${category.id}`} className="scroll-mt-28 grid gap-6">
                      <div className="flex items-end justify-between gap-4">
                        <div className="grid gap-2">
                          <h2
                            className="text-3xl font-bold text-foreground sm:text-4xl"
                            style={{ fontFamily: "var(--font-heading)" }}
                          >
                            {category.name}
                          </h2>
                          <div className="text-sm text-muted-foreground">
                            {category.categoryItems.length} item{category.categoryItems.length === 1 ? "" : "s"}
                          </div>
                        </div>
                      </div>

                      {category.categoryItems.length > 0 ? (
                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                          {category.categoryItems.map((entry) => (
                            <MenuItemCard
                              key={entry.id}
                              item={entry.item}
                              onCustomize={() => {
                                setEditingCartItem(null)
                                setSelectedItem(entry.item)
                              }}
                            />
                          ))}
                        </div>
                      ) : (
                        <EmptyStateCard
                          icon={ChefHat}
                          title="No items available in this category"
                          description="The kitchen team has this section hidden for now. Check another category."
                        />
                      )}
                    </section>
                  ))}
                </section>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {themeError || menuQuery.error ? (
          <div className="rounded-[var(--radius)] border border-destructive/20 bg-destructive/10 px-4 py-4 text-sm text-foreground sm:px-6">
            {themeError ?? (menuQuery.error instanceof Error ? menuQuery.error.message : "Failed to load storefront")}
          </div>
        ) : null}
      </div>

      <ItemCustomizationDrawer
        item={selectedItem}
        editingItem={editingCartItem}
        open={!!selectedItem}
        onClose={() => {
          setSelectedItem(null)
          setEditingCartItem(null)
        }}
        onAddToCart={(payload) => {
          if (editingCartItem) {
            updateCartItem(editingCartItem.lineId, payload)
          } else {
            addItem(payload)
          }
          setEditingCartItem(null)
        }}
      />

      <CartSummary
        items={cartItems}
        customerName={customerName}
        customerPhone={customerPhone}
        orderNotes={orderNotes}
        open={cartOpen}
        hideStickyCartBar={cartOpen || !!selectedItem}
        submitting={submittingOrder}
        onOpen={() => setCartOpen(true)}
        onClose={() => setCartOpen(false)}
        onIncrement={incrementQuantity}
        onDecrement={decrementQuantity}
        onRemove={removeItem}
        onClear={clearCart}
        onEdit={(lineId) => {
          const cartItem = cartItems.find((entry) => entry.lineId === lineId) ?? null
          const menuItem = cartItem ? itemLookup.get(cartItem.itemId) ?? null : null
          if (!cartItem || !menuItem) {
            return
          }
          setEditingCartItem(cartItem)
          setSelectedItem(menuItem)
          setCartOpen(false)
        }}
        onCustomerNameChange={setCustomerName}
        onCustomerPhoneChange={setCustomerPhone}
        onOrderNotesChange={setOrderNotes}
        onCheckout={submitPickupOrder}
      />
    </motion.main>
  )
}

function MenuItemCard({
  item,
  featured = false,
  onCustomize,
}: {
  item: MenuItem
  featured?: boolean
  onCustomize: () => void
}) {
  const isPhotoFirst = Boolean(item.photoUrl)
  const meta = [
    item.tags[0] ?? null,
    item.itemModifierGroups.length > 0 ? "Customizable" : null,
    item.variants.length > 1 ? `${item.variants.length} sizes` : null,
  ].filter(Boolean)
  const badgeLabel =
    item.visibility === "SOLD_OUT" ? "Sold out" : featured ? "Featured" : null

  return (
    <motion.div whileTap={{ scale: 0.988 }} transition={{ duration: 0.12, ease: "easeOut" }}>
      <Card
        className={cn(
          "overflow-hidden border-border/80 bg-card shadow-sm",
          isPhotoFirst && "grid grid-cols-1 gap-0 sm:grid-cols-[minmax(10rem,12rem)_minmax(0,1fr)]",
          item.visibility === "SOLD_OUT" && "opacity-70",
        )}
      >
        {isPhotoFirst ? (
          <div
            className="aspect-[4/3] w-full bg-cover bg-center sm:h-full sm:min-h-[12rem] sm:aspect-auto"
            style={{ backgroundImage: `url(${item.photoUrl})` }}
          />
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col">
          <CardHeader className="grid gap-4 px-4 pt-4 sm:px-6 sm:pt-6">
            <div className="flex items-start justify-between gap-4">
              <h3
                className="min-w-0 flex-1 text-xl font-bold text-foreground sm:text-2xl"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {item.name}
              </h3>
              <div className="shrink-0 text-base font-semibold text-foreground sm:text-lg">
                {formatPrice(itemPrice(item))}
              </div>
            </div>

            {item.description ? (
              <p className="text-sm leading-6 text-muted-foreground">{item.description}</p>
            ) : null}

            {badgeLabel || meta.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2">
                {badgeLabel ? (
                  <Badge
                    variant="outline"
                    className={
                      featured && item.visibility !== "SOLD_OUT"
                        ? "border-primary/20 bg-primary/10 text-foreground"
                        : "border-border bg-background text-muted-foreground"
                    }
                  >
                    {badgeLabel}
                  </Badge>
                ) : null}
                {meta.slice(0, 1).map((tag) => (
                  <span key={tag} className="text-sm text-muted-foreground">
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </CardHeader>

          <CardFooter className="justify-end px-4 pb-4 pt-0 sm:px-6 sm:pb-6">
            {item.visibility === "SOLD_OUT" ? (
              <div className="text-sm text-muted-foreground">Sold out today</div>
            ) : (
              <Button className="min-h-11" onClick={onCustomize}>
                Add
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </CardFooter>
        </div>
      </Card>
    </motion.div>
  )
}

function EmptyStateCard({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof UtensilsCrossed
  title: string
  description: string
}) {
  return (
    <Card className="border-dashed border-border/80 bg-card shadow-sm">
      <CardContent className="flex min-h-48 flex-col items-center justify-center gap-4 px-6 py-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-background text-muted-foreground">
          <Icon className="h-5 w-5" />
        </div>
        <div className="grid gap-2">
          <h3 className="text-xl font-semibold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
            {title}
          </h3>
          <p className="mx-auto max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function StorefrontLoadingSkeleton() {
  return (
    <>
      <Card className="overflow-hidden border-border/80 bg-card shadow-sm">
        <CardContent className="grid min-h-[200px] gap-6 px-4 py-8 sm:px-6 sm:py-12 lg:min-h-[320px] lg:px-8 lg:py-12">
          <Skeleton className="h-16 w-16 rounded-[12px]" />
          <div className="grid gap-4">
            <Skeleton className="h-8 w-32 rounded-full" />
            <Skeleton className="h-16 w-full max-w-3xl" />
            <Skeleton className="h-8 w-full max-w-2xl" />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-8">
        <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex w-max min-w-full gap-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-11 w-28 rounded-full" />
            ))}
          </div>
        </div>

        <section className="grid gap-6">
          <div className="grid gap-4">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-5 w-28" />
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <Card key={index} className="overflow-hidden border-border/80 bg-card shadow-sm">
                <div className="grid grid-cols-1 sm:grid-cols-[minmax(10rem,12rem)_minmax(0,1fr)]">
                  <Skeleton className="aspect-[4/3] w-full sm:h-full sm:min-h-[12rem] sm:aspect-auto" />
                  <CardContent className="grid gap-4 px-4 py-4 sm:px-6 sm:py-6">
                    <div className="flex items-center justify-between gap-4">
                      <Skeleton className="h-6 w-40" />
                      <Skeleton className="h-5 w-16" />
                    </div>
                    <div className="grid gap-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-4/5" />
                    </div>
                    <Skeleton className="h-8 w-20 rounded-full" />
                  </CardContent>
                </div>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </>
  )
}
