import { useEffect, useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { ChevronRight, ShieldCheck, Sparkles } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { createPickupOrder } from "../lib/orders"
import { fetchTenantMenu } from "../lib/menu"
import type { MenuCategory, MenuItem } from "../lib/menu"
import { CartSummary } from "./CartSummary"
import { useCheckoutStore } from "./checkoutStore"
import { ItemCustomizationDrawer } from "./ItemCustomizationDrawer"
import { useCartStore } from "./cartStore"
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

export function StorefrontPage({
  customerSession,
  onViewOrder,
}: {
  customerSession: CustomerSessionController
  onViewOrder: (orderId: string) => void
}) {
  const { theme, isLoading: isThemeLoading, errorMessage: themeError } = useTheme()
  const { tenantSlug, source } = useThemePlaygroundStore()
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
  const [cartOpen, setCartOpen] = useState(false)
  const [submittingOrder, setSubmittingOrder] = useState(false)
  const cartItems = useCartStore((state) => state.items)
  const addItem = useCartStore((state) => state.addItem)
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

  const menuCardColumns =
    theme.menuCardLayout === "compact"
      ? "md:grid-cols-2"
      : theme.menuCardLayout === "photo-first"
        ? "lg:grid-cols-2"
        : ""

  useEffect(() => {
    if (customerSession.customerPhone && !customerPhone.trim()) {
      setCustomerPhone(customerSession.customerPhone)
    }
  }, [customerPhone, customerSession.customerPhone, setCustomerPhone])

  async function submitPickupOrder(payload: {
    customerName: string
    customerPhone: string
    orderNotes: string | null
  }) {
    setSubmittingOrder(true)

    try {
      let accessToken = customerSession.accessToken

      if (!accessToken) {
        const restored = await customerSession.restoreSession()
        accessToken = restored?.accessToken ?? null
      }

      if (!accessToken) {
        throw new Error("Verify your phone number before placing the pickup order.")
      }

      let order
      try {
        order = await createPickupOrder({
          tenantSlug,
          accessToken,
          customerName: payload.customerName,
          customerPhone: payload.customerPhone,
          orderNotes: payload.orderNotes,
          items: cartItems,
        })
      } catch (error) {
        if (error instanceof Error && error.message.includes("(401)")) {
          const restored = await customerSession.restoreSession()
          if (!restored?.accessToken) {
            throw new Error("Your customer session expired. Verify your phone number again.")
          }

          order = await createPickupOrder({
            tenantSlug,
            accessToken: restored.accessToken,
            customerName: payload.customerName,
            customerPhone: payload.customerPhone,
            orderNotes: payload.orderNotes,
            items: cartItems,
          })
        } else {
          throw error
        }
      }

      clearCart()
      resetAfterOrder()
      setCartOpen(false)
      onViewOrder(order.id)
    } finally {
      setSubmittingOrder(false)
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8 lg:gap-10">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius)] border border-border/80 bg-card px-5 py-4 text-sm text-muted-foreground shadow-sm">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            Live storefront for tenant <span className="font-semibold text-foreground">{tenantSlug}</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span>Source: {source === "api" ? "Saved admin config" : "Preset preview"}</span>
            <Badge variant="outline" className="border-border bg-background text-muted-foreground">
              Direct ordering
            </Badge>
          </div>
        </div>

        <section className="overflow-hidden rounded-[var(--radius)] border border-border/80 bg-card shadow-sm">
          <div
            className="px-6 py-14 sm:px-8 lg:px-10 lg:py-20"
            style={{
              background:
                theme.heroImageUrl && theme.heroLayout === "immersive"
                  ? `${theme.heroGradient}, url(${theme.heroImageUrl}) center/cover`
                  : theme.heroGradient,
            }}
          >
            <div className="max-w-3xl space-y-6">
              <Badge
                variant="outline"
                className="inline-flex border-border/80 bg-card/80 px-3 py-1 text-sm text-muted-foreground backdrop-blur"
              >
                <Sparkles className="h-4 w-4" />
                {theme.heroBadgeText}
              </Badge>

              <div className="space-y-4">
                <h1
                  className="max-w-3xl text-4xl leading-tight text-foreground sm:text-5xl lg:text-6xl"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  {theme.heroHeadline}
                </h1>
                <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                  {theme.heroSubheadline}
                </p>
              </div>
            </div>
          </div>
        </section>

        {theme.promoBannerText ? (
          <section className="rounded-[var(--radius)] border border-border/80 bg-card px-5 py-4 shadow-sm">
            <p className="text-sm leading-6 text-muted-foreground">{theme.promoBannerText}</p>
          </section>
        ) : null}

        {theme.showCategoryChips && categories.length > 0 ? (
          <section className="flex flex-wrap gap-2.5">
            {categories.map((category) => (
              <Badge
                key={category.id}
                asChild
                variant="outline"
                className="border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground shadow-sm"
              >
                <a href={`#category-${category.id}`}>{category.name}</a>
              </Badge>
            ))}
          </section>
        ) : null}

        {featuredItems.length > 0 ? (
          <section className="space-y-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  Featured
                </div>
                <h2 className="mt-2 text-3xl text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
                  Most popular right now
                </h2>
              </div>
            </div>

            <div className={`grid gap-5 ${menuCardColumns}`}>
              {featuredItems.map((item) => (
                <MenuItemCard
                  key={`featured-${item.id}`}
                  item={item}
                  themeMode={theme.menuCardLayout}
                  featured
                  onCustomize={() => setSelectedItem(item)}
                />
              ))}
            </div>
          </section>
        ) : null}

        <section className="space-y-12">
          {categories.map((category) => (
            <div key={category.id} id={`category-${category.id}`} className="space-y-5">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-3xl text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
                  {category.name}
                </h2>
                <div className="text-sm text-muted-foreground">{category.categoryItems.length} items</div>
              </div>

              <div className={`grid gap-5 ${menuCardColumns}`}>
                {category.categoryItems.map((entry) => (
                  <MenuItemCard
                    key={entry.id}
                    item={entry.item}
                    themeMode={theme.menuCardLayout}
                    onCustomize={() => setSelectedItem(entry.item)}
                  />
                ))}
              </div>
            </div>
          ))}
        </section>

        {(isThemeLoading || menuQuery.isLoading) && source === "api" ? (
          <div className="rounded-[var(--radius)] border border-dashed border-border bg-card px-5 py-4 text-sm text-muted-foreground">
            Loading tenant storefront…
          </div>
        ) : null}

        {themeError || menuQuery.error ? (
          <div className="rounded-[var(--radius)] border border-destructive/20 bg-destructive/10 px-5 py-4 text-sm text-foreground">
            {themeError ?? (menuQuery.error instanceof Error ? menuQuery.error.message : "Failed to load storefront")}
          </div>
        ) : null}
      </div>

      <ItemCustomizationDrawer
        item={selectedItem}
        open={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        onAddToCart={(payload) => addItem(payload)}
      />

      <CartSummary
        items={cartItems}
        customerName={customerName}
        customerPhone={customerPhone}
        customerSession={customerSession}
        orderNotes={orderNotes}
        open={cartOpen}
        submitting={submittingOrder}
        onOpen={() => setCartOpen(true)}
        onClose={() => setCartOpen(false)}
        onIncrement={incrementQuantity}
        onDecrement={decrementQuantity}
        onRemove={removeItem}
        onClear={clearCart}
        onCustomerNameChange={setCustomerName}
        onCustomerPhoneChange={setCustomerPhone}
        onOrderNotesChange={setOrderNotes}
        onRequestOtp={customerSession.sendCode}
        onVerifyOtp={async (phone, code) => {
          await customerSession.verifyCode(phone, code)
        }}
        onCheckout={submitPickupOrder}
      />
    </main>
  )
}

function MenuItemCard({
  item,
  themeMode,
  featured = false,
  onCustomize,
}: {
  item: MenuItem
  themeMode: "classic" | "compact" | "photo-first"
  featured?: boolean
  onCustomize: () => void
}) {
  const isPhotoFirst = themeMode === "photo-first"
  const isCompact = themeMode === "compact"
  const meta = [
    item.prepTimeMinutes ? `${item.prepTimeMinutes} min prep` : null,
    item.itemModifierGroups.length > 0 ? "Customizable" : null,
    item.variants.length > 1 ? `${item.variants.length} sizes` : null,
  ].filter(Boolean)
  const badgeLabel =
    item.visibility === "SOLD_OUT" ? "Sold out" : featured ? "Featured" : null

  return (
    <Card
      size={isCompact ? "sm" : "default"}
      className={[
        "border border-border/80 bg-card shadow-sm",
        isPhotoFirst ? "grid grid-cols-[132px_minmax(0,1fr)] gap-0 overflow-hidden" : "",
        item.visibility === "SOLD_OUT" ? "opacity-70" : "",
      ].join(" ")}
    >
      {isPhotoFirst ? <div className="min-h-full bg-brand-hero" /> : null}

      <div className="flex flex-col">
        <CardHeader className={isPhotoFirst ? "px-5 pt-5" : ""}>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-3">
              {badgeLabel ? (
                <Badge
                  variant="outline"
                  className="border-border bg-background text-muted-foreground"
                >
                  {badgeLabel}
                </Badge>
              ) : null}
              <div className="flex items-start justify-between gap-6">
                <h3
                  className={isCompact ? "text-lg text-foreground" : "text-xl text-foreground"}
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  {item.name}
                </h3>
                <div className="shrink-0 text-base font-semibold text-foreground">
                  {formatPrice(itemPrice(item))}
                </div>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className={isPhotoFirst ? "px-5" : ""}>
          {item.description ? (
            <p className="text-sm leading-6 text-muted-foreground">{item.description}</p>
          ) : null}
          {meta.length > 0 ? (
            <>
              <Separator className="my-4" />
              <div className="text-sm text-muted-foreground">{meta.join(" · ")}</div>
            </>
          ) : null}
        </CardContent>

        <CardFooter className={isPhotoFirst ? "px-5 pb-5 pt-0" : "pt-0"}>
          {item.visibility === "SOLD_OUT" ? (
            <div className="text-sm text-muted-foreground">Sold out today</div>
          ) : (
            <Button variant="outline" onClick={onCustomize}>
              Add
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </CardFooter>
      </div>
    </Card>
  )
}
