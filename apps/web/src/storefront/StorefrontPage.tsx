import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRight,
  Megaphone,
  Search,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Tags,
  UtensilsCrossed,
  X,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import {
  createCheckoutPaymentIntent,
  fetchCheckoutStatus,
  type CheckoutPaymentIntentSession,
} from '../lib/payments'
import { fetchTenantMenu, isCategoryAvailableNow } from '../lib/menu'
import type { MenuCategory, MenuItem } from '../lib/menu'
import { fetchCustomerLoyaltyAccount } from '../lib/loyalty'
import { CartSummary } from './CartSummary'
import {
  dismissActiveOrderForSession,
  isActiveOrderDismissed,
  readActiveOrder,
  type ActiveOrderRecord,
  writeActiveOrder,
} from './activeOrder'
import { useCheckoutStore } from './checkoutStore'
import { ItemCustomizationDrawer } from './ItemCustomizationDrawer'
import { type CartItem, useCartStore } from './cartStore'
import { useTheme } from '../theme/ThemeProvider'
import { useThemePlaygroundStore } from '../theme/store'
import type { CustomerSessionController } from './useCustomerSession'

function formatPrice(priceCents: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(priceCents / 100)
}

function itemPrice(item: MenuItem) {
  return item.variants.find((variant) => variant.isDefault)?.priceCents ?? item.basePriceCents
}

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace('#', '').trim()
  const expanded =
    normalized.length === 3
      ? normalized
          .split('')
          .map((char) => `${char}${char}`)
          .join('')
      : normalized

  const value = Number.parseInt(expanded, 16)
  const red = (value >> 16) & 255
  const green = (value >> 8) & 255
  const blue = value & 255

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`
}

function visibleCategories(categories: MenuCategory[]) {
  return categories
    .filter((category) => category.visibility !== 'HIDDEN' && isCategoryAvailableNow(category))
    .map((category) => ({
      ...category,
      categoryItems: category.categoryItems.filter((entry) => entry.item.visibility !== 'HIDDEN'),
    }))
    .filter((category) => category.categoryItems.length > 0)
}

function normalizeSearchTerm(value: string) {
  return value.trim().toLowerCase()
}

function itemMatchesSearch(item: MenuItem, query: string) {
  const term = normalizeSearchTerm(query)
  if (!term) {
    return true
  }

  return [item.name, item.nameLocalized ?? '', item.description ?? '', item.tags.join(' ')]
    .join(' ')
    .toLowerCase()
    .includes(term)
}

function filterCategories(categories: MenuCategory[], query: string) {
  const term = normalizeSearchTerm(query)
  if (!term) {
    return categories
  }

  return categories
    .map((category) => {
      const categoryMatches = category.name.toLowerCase().includes(term)
      const categoryItems = categoryMatches
        ? category.categoryItems
        : category.categoryItems.filter((entry) => itemMatchesSearch(entry.item, term))

      return {
        ...category,
        categoryItems,
      }
    })
    .filter((category) => category.categoryItems.length > 0)
}

function countItems(categories: MenuCategory[]) {
  return categories.reduce((sum, category) => sum + category.categoryItems.length, 0)
}

const placeholderPromoBannerMessages = new Set([
  'Give loyal customers a direct-order reward funded by marketplace savings.',
  'Try the direct-order welcome offer and keep ordering through the restaurant.',
  'Design-forward preset for tighter brand systems.',
])

const promoBannerDismissStorageKey = 'promoBannerDismissed'

function promoBannerSessionKey(tenantSlug: string, message: string) {
  return `${tenantSlug}:${message}`
}

function dismissPromoBannerForSession(tenantSlug: string, message: string) {
  if (typeof window === 'undefined') {
    return
  }

  window.sessionStorage.setItem(
    promoBannerDismissStorageKey,
    promoBannerSessionKey(tenantSlug, message)
  )
}

function isPromoBannerDismissed(tenantSlug: string, message: string) {
  if (typeof window === 'undefined') {
    return false
  }

  return (
    window.sessionStorage.getItem(promoBannerDismissStorageKey) ===
    promoBannerSessionKey(tenantSlug, message)
  )
}

function promoBannerMessage(value: string) {
  const normalized = value.trim()
  if (!normalized || placeholderPromoBannerMessages.has(normalized)) {
    return null
  }

  return normalized
}

export function StorefrontPage({
  customerSession,
  onViewOrder,
  onViewRewardsWallet,
}: {
  customerSession: CustomerSessionController
  onViewOrder: (orderId: string) => void
  onViewRewardsWallet?: () => void
}) {
  const showDevBanner =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('dev') === 'true'
  const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? ''
  const { theme, isLoading: isThemeLoading, errorMessage: themeError } = useTheme()
  const { tenantSlug, source } = useThemePlaygroundStore()
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
  const [editingCartItem, setEditingCartItem] = useState<CartItem | null>(null)
  const [cartOpen, setCartOpen] = useState(false)
  const [submittingOrder, setSubmittingOrder] = useState(false)
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null)
  const [activeOrderBanner, setActiveOrderBanner] = useState<ActiveOrderRecord | null>(null)
  const [showPromoBanner, setShowPromoBanner] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
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
    queryKey: ['tenant-menu', tenantSlug],
    queryFn: () => fetchTenantMenu(tenantSlug),
    enabled: source === 'api',
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  })

  const loyaltyQuery = useQuery({
    queryKey: ['customer-loyalty-storefront', tenantSlug, customerSession.customerId],
    queryFn: () =>
      fetchCustomerLoyaltyAccount({
        tenantSlug,
        accessToken: customerSession.accessToken as string,
      }),
    enabled: Boolean(customerSession.accessToken && tenantSlug),
    staleTime: 60_000,
  })

  const categories = useMemo(
    () => visibleCategories(menuQuery.data?.categories ?? []),
    [menuQuery.data?.categories]
  )

  useEffect(() => {
    document.body.style.backgroundColor = theme.palette.background || '#ffffff'
  }, [theme.palette.background])

  const filteredCategories = useMemo(
    () => filterCategories(categories, searchQuery),
    [categories, searchQuery]
  )

  const featuredItems = useMemo(
    () =>
      filteredCategories.flatMap((category) =>
        category.categoryItems.map((entry) => entry.item).filter((item) => item.isFeatured)
      ),
    [filteredCategories]
  )

  const itemLookup = useMemo(
    () =>
      new Map(
        categories
          .flatMap((category) => category.categoryItems.map((entry) => entry.item))
          .map((item) => [item.id, item] as const)
      ),
    [categories]
  )

  const showLoadingSkeletons =
    source === 'api' && !menuQuery.data && (menuQuery.isLoading || isThemeLoading)
  const visiblePromoBanner = promoBannerMessage(theme.promoBannerText)
  const hasVisibleItems = filteredCategories.some((category) => category.categoryItems.length > 0)
  const totalItemCount = countItems(categories)
  const cartItemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0)

  useEffect(() => {
    if (!visiblePromoBanner) {
      setShowPromoBanner(false)
      return
    }

    setShowPromoBanner(!isPromoBannerDismissed(tenantSlug, visiblePromoBanner))
  }, [tenantSlug, visiblePromoBanner])

  useEffect(() => {
    if (!filteredCategories.length) {
      setActiveCategoryId(null)
      return
    }

    setActiveCategoryId((current) =>
      filteredCategories.some((category) => category.id === current)
        ? current
        : (filteredCategories[0]?.id ?? null)
    )

    const sections = filteredCategories
      .map((category) => document.getElementById(`category-${category.id}`))
      .filter((section): section is HTMLElement => Boolean(section))

    if (!sections.length) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => {
            const leftTopDistance = Math.abs(left.boundingClientRect.top)
            const rightTopDistance = Math.abs(right.boundingClientRect.top)

            if (leftTopDistance !== rightTopDistance) {
              return leftTopDistance - rightTopDistance
            }

            return right.intersectionRatio - left.intersectionRatio
          })[0]

        if (!visible) return

        setActiveCategoryId(visible.target.id.replace('category-', ''))
      },
      {
        rootMargin: '-120px 0px -55% 0px',
        threshold: [0.05, 0.2, 0.4, 0.65],
      }
    )

    sections.forEach((section) => observer.observe(section))
    return () => observer.disconnect()
  }, [filteredCategories])

  useEffect(() => {
    if (customerSession.customerPhone && !customerPhone.trim()) {
      setCustomerPhone(customerSession.customerPhone)
    }
  }, [customerPhone, customerSession.customerPhone, setCustomerPhone])

  useEffect(() => {
    const activeOrder = readActiveOrder()
    if (
      !activeOrder ||
      activeOrder.tenantSlug !== tenantSlug ||
      isActiveOrderDismissed(activeOrder)
    ) {
      setActiveOrderBanner(null)
      return
    }

    setActiveOrderBanner(activeOrder)
  }, [tenantSlug])

  async function createPaymentIntentForCheckout(payload: {
    customerName: string
    customerPhone: string
    orderNotes: string | null
    fulfillmentType: 'PICKUP' | 'DELIVERY'
    deliveryAddress: string | null
  }): Promise<CheckoutPaymentIntentSession> {
    return createCheckoutPaymentIntent({
      tenantSlug,
      accessToken: customerSession.accessToken,
      customerName: payload.customerName,
      customerPhone: payload.customerPhone,
      orderNotes: payload.orderNotes,
      fulfillmentType: payload.fulfillmentType,
      deliveryAddress: payload.deliveryAddress,
      items: cartItems,
    })
  }

  async function finalizePaidCheckout(paymentSession: CheckoutPaymentIntentSession) {
    setSubmittingOrder(true)

    try {
      const deadline = Date.now() + 20_000

      while (Date.now() < deadline) {
        const checkoutStatus = await fetchCheckoutStatus({
          tenantSlug,
          checkoutSessionId: paymentSession.checkoutSessionId,
        })

        if (checkoutStatus.status === 'ORDER_CREATED' && checkoutStatus.orderId) {
          const activeOrder = {
            orderId: checkoutStatus.orderId,
            tenantSlug,
            placedAt: new Date().toISOString(),
            discountCents: paymentSession.discountCents,
            isNewMember: paymentSession.isNewMember,
          } satisfies ActiveOrderRecord

          writeActiveOrder(activeOrder)
          setActiveOrderBanner(activeOrder)

          clearCart()
          resetAfterOrder()
          setCartOpen(false)
          onViewOrder(checkoutStatus.orderId)
          return
        }

        if (checkoutStatus.status === 'PAYMENT_FAILED' || checkoutStatus.status === 'EXPIRED') {
          throw new Error(checkoutStatus.error ?? 'Payment did not complete')
        }

        await new Promise((resolve) => window.setTimeout(resolve, 1000))
      }

      throw new Error('Payment succeeded, but order creation is still pending')
    } finally {
      setSubmittingOrder(false)
    }
  }

  function scrollToCategory(categoryId: string) {
    const section = document.getElementById(`category-${categoryId}`)
    if (!section) {
      return
    }

    const stickyOffset = window.innerWidth < 640 ? 144 : 160
    const top = section.getBoundingClientRect().top + window.scrollY - stickyOffset

    window.scrollTo({
      top: Math.max(0, top),
      behavior: 'smooth',
    })
    setActiveCategoryId(categoryId)
  }

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <motion.main
      className="min-h-screen text-foreground"
      style={{
        backgroundColor: theme.palette.background || '#ffffff',
        color: theme.palette.text,
        backgroundImage: `radial-gradient(circle at top center, ${hexToRgba(theme.palette.accent, 0.08)}, transparent 28%)`,
      }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: 'easeOut' }}
    >
      <header
        className="sticky top-0 z-40 border-b backdrop-blur-xl"
        style={{
          backgroundColor: hexToRgba(theme.palette.surface, 0.92),
          borderColor: hexToRgba(theme.palette.border, 0.75),
          boxShadow: `0 4px 24px ${hexToRgba(theme.palette.text, 0.04)}`,
        }}
      >
        <div className="mx-auto flex h-16 w-full max-w-[1160px] items-center gap-4 px-4 sm:px-6">
          <button type="button" className="shrink-0 text-left" onClick={scrollToTop}>
            {theme.logoUrl ? (
              <img
                src={theme.logoUrl}
                alt={theme.appTitle || 'Storefront'}
                className="h-7 w-auto max-w-[80px] object-contain"
              />
            ) : (
              <span
                className="text-xl font-extrabold tracking-tight"
                style={{ color: theme.palette.primary, fontFamily: 'var(--font-heading)' }}
              >
                {theme.appTitle || 'Storefront'}
              </span>
            )}
          </button>

          <nav className="hidden items-center gap-6 md:flex">
            <button
              type="button"
              className="border-b-2 pb-1 text-sm font-semibold transition-colors"
              style={{
                color: theme.palette.primary,
                borderColor: theme.palette.primary,
              }}
              onClick={scrollToTop}
            >
              Discover
            </button>
            <button
              type="button"
              className="text-sm font-medium transition-colors"
              style={{
                color: activeOrderBanner ? theme.palette.text : hexToRgba(theme.palette.muted, 0.9),
              }}
              onClick={() => activeOrderBanner && onViewOrder(activeOrderBanner.orderId)}
              disabled={!activeOrderBanner}
            >
              Orders
            </button>
            <button
              type="button"
              className="text-sm font-medium transition-colors"
              style={{
                color:
                  onViewRewardsWallet && customerSession.isAuthenticated
                    ? theme.palette.text
                    : hexToRgba(theme.palette.muted, 0.9),
              }}
              onClick={() => onViewRewardsWallet?.()}
              disabled={!onViewRewardsWallet || !customerSession.isAuthenticated}
            >
              Offers
            </button>
          </nav>

          <div className="ml-auto flex flex-1 items-center justify-end gap-3">
            <label
              className="hidden max-w-[30rem] flex-1 items-center gap-3 rounded-full border px-4 py-2.5 sm:flex"
              style={{
                backgroundColor: hexToRgba(theme.palette.surface, 0.96),
                borderColor: hexToRgba(theme.palette.border, 0.9),
                color: theme.palette.muted,
              }}
            >
              <Search className="h-4 w-4" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search for dishes..."
                className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-inherit"
              />
            </label>

            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="relative rounded-full"
              style={{ color: theme.palette.primary }}
              onClick={() => setCartOpen(true)}
              aria-label="Open cart"
            >
              <ShoppingCart className="h-5 w-5" />
              {cartItemCount > 0 ? (
                <span
                  className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-semibold"
                  style={{
                    backgroundColor: theme.palette.primary,
                    color: theme.palette.primaryForeground,
                  }}
                >
                  {cartItemCount}
                </span>
              ) : null}
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[1160px] flex-col gap-8 px-4 py-6 sm:px-6 sm:py-8">
        {showDevBanner ? (
          <Card className="border-border/80 bg-card shadow-sm">
            <CardContent className="flex flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <ShieldCheck className="h-4 w-4" />
                <span>
                  Live storefront for tenant{' '}
                  <span className="font-semibold text-foreground">{tenantSlug}</span>
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>Source: {source === 'api' ? 'Saved admin config' : 'Preset preview'}</span>
                <Badge
                  variant="outline"
                  className="border-border bg-background text-muted-foreground"
                >
                  Direct ordering
                </Badge>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {activeOrderBanner ? (
          <Card
            className="overflow-hidden border shadow-sm"
            style={{
              borderColor: hexToRgba(theme.palette.primary, 0.22),
              background: `linear-gradient(135deg, ${hexToRgba(theme.palette.primary, 0.16)}, ${hexToRgba(theme.palette.accent, 0.3)})`,
            }}
          >
            <CardContent className="flex flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <div className="relative flex h-3 w-3 shrink-0 items-center justify-center">
                  <span className="absolute inline-flex h-3 w-3 animate-ping rounded-full bg-emerald-500/40" />
                  <span className="relative h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.16)]" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">You have an active order</p>
                  <p className="text-sm text-muted-foreground">
                    Live updates are available while the kitchen works on it.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="rounded-full border border-white/60 bg-white/90 px-4 text-foreground shadow-sm hover:bg-white"
                  onClick={() => onViewOrder(activeOrderBanner.orderId)}
                >
                  Track it here
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="rounded-full text-muted-foreground hover:bg-white/55 hover:text-foreground"
                  onClick={() => {
                    dismissActiveOrderForSession(activeOrderBanner)
                    setActiveOrderBanner(null)
                  }}
                  aria-label="Dismiss active order banner"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
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
              <section
                className="relative overflow-hidden rounded-[24px] border shadow-[0_20px_40px_rgba(0,0,0,0.08)]"
                style={{
                  borderColor: hexToRgba(theme.palette.border, 0.75),
                  backgroundColor: theme.palette.surface,
                }}
              >
                <div
                  className="relative min-h-[240px] sm:min-h-[320px]"
                  style={{
                    background: theme.heroImageUrl
                      ? `linear-gradient(to top, rgba(0,0,0,0.78), rgba(0,0,0,0.12)), url(${theme.heroImageUrl}) center/cover`
                      : `linear-gradient(135deg, ${hexToRgba(theme.palette.primary, 0.4)}, ${hexToRgba(theme.palette.accent, 0.28)}), linear-gradient(180deg, ${theme.palette.surface}, ${theme.palette.background})`,
                  }}
                >
                  <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
                    <div className="max-w-3xl">
                      <h1
                        className="text-4xl font-bold leading-none text-white sm:text-5xl"
                        style={{ fontFamily: 'var(--font-heading)' }}
                      >
                        {theme.heroHeadline || theme.appTitle || tenantSlug}
                      </h1>

                      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-white/90 sm:text-base">
                        {theme.heroBadgeText.trim() ? (
                          <span
                            className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5"
                            style={{
                              backgroundColor: hexToRgba(theme.palette.accent, 0.18),
                              borderColor: hexToRgba(theme.palette.accent, 0.34),
                              color: theme.palette.primaryForeground,
                            }}
                          >
                            <Sparkles className="h-4 w-4" />
                            {theme.heroBadgeText}
                          </span>
                        ) : null}
                        <span>{categories.length} categories</span>
                        <span className="opacity-60">•</span>
                        <span>{totalItemCount} dishes</span>
                        <span className="opacity-60">•</span>
                        <span>Direct ordering</span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {visiblePromoBanner && showPromoBanner ? (
                <Card
                  className="overflow-hidden border-0 shadow-sm"
                  style={{
                    background: `linear-gradient(135deg, ${theme.palette.primary}, ${hexToRgba(theme.palette.primary, 0.88)})`,
                    color: theme.palette.primaryForeground,
                  }}
                >
                  <CardContent className="flex flex-wrap items-start justify-between gap-4 px-4 py-4 sm:px-6">
                    <div className="flex min-w-0 items-start gap-3">
                      <div
                        className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border"
                        style={{
                          backgroundColor: hexToRgba(theme.palette.primaryForeground, 0.16),
                          borderColor: hexToRgba(theme.palette.primaryForeground, 0.24),
                        }}
                      >
                        <Megaphone className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p
                          className="text-[11px] font-semibold uppercase tracking-[0.22em]"
                          style={{ color: hexToRgba(theme.palette.primaryForeground, 0.78) }}
                        >
                          Special offer
                        </p>
                        <p className="mt-1 text-sm font-semibold leading-6 sm:text-[0.95rem]">
                          {visiblePromoBanner}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="rounded-full border border-white/15 bg-white/10 text-inherit hover:bg-white/20 hover:text-inherit"
                      onClick={() => {
                        dismissPromoBannerForSession(tenantSlug, visiblePromoBanner)
                        setShowPromoBanner(false)
                      }}
                      aria-label="Dismiss announcement banner"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ) : null}

              <div className="sm:hidden">
                <label
                  className="flex items-center gap-3 rounded-full border px-4 py-3"
                  style={{
                    backgroundColor: hexToRgba(theme.palette.surface, 0.96),
                    borderColor: hexToRgba(theme.palette.border, 0.9),
                    color: theme.palette.muted,
                  }}
                >
                  <Search className="h-4 w-4" />
                  <input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search for dishes..."
                    className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-inherit"
                  />
                </label>
              </div>

              {filteredCategories.length > 0 ? (
                <div
                  className="sticky top-16 z-20 -mx-4 border-y px-4 py-4 backdrop-blur-xl sm:-mx-6 sm:px-6"
                  style={{
                    backgroundColor: hexToRgba(theme.palette.background, 0.84),
                    borderColor: hexToRgba(theme.palette.border, 0.7),
                  }}
                >
                  <div className="flex gap-3 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {filteredCategories.map((category) => {
                      const active = activeCategoryId === category.id
                      return (
                        <button
                          key={category.id}
                          type="button"
                          className="whitespace-nowrap rounded-full px-6 py-2.5 text-sm font-medium transition-all"
                          style={{
                            backgroundColor: active
                              ? theme.palette.primary
                              : hexToRgba(theme.palette.text, 0.06),
                            color: active ? theme.palette.primaryForeground : theme.palette.text,
                            boxShadow: active
                              ? `0 10px 24px ${hexToRgba(theme.palette.primary, 0.24)}`
                              : 'none',
                          }}
                          onClick={() => scrollToCategory(category.id)}
                        >
                          {category.name}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ) : null}

              {featuredItems.length > 0 ? (
                <section className="grid gap-6">
                  <div className="grid gap-2">
                    <div
                      className="text-[11px] font-semibold uppercase tracking-[0.16em]"
                      style={{ color: theme.palette.muted }}
                    >
                      Featured
                    </div>
                    <h2
                      className="text-3xl font-bold text-foreground sm:text-4xl"
                      style={{ fontFamily: 'var(--font-heading)' }}
                    >
                      Featured Items
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
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

              {!filteredCategories.length || !hasVisibleItems ? (
                <EmptyStateCard
                  icon={searchQuery.trim() ? Search : UtensilsCrossed}
                  title={searchQuery.trim() ? 'No matching dishes' : 'Menu coming soon'}
                  description={
                    searchQuery.trim()
                      ? `No menu items matched "${searchQuery.trim()}". Try another dish, tag, or category.`
                      : 'This storefront is getting ready for service. Check back soon for the full menu.'
                  }
                />
              ) : (
                <section className="grid gap-12">
                  {filteredCategories.map((category) => (
                    <section
                      key={category.id}
                      id={`category-${category.id}`}
                      className="scroll-mt-40 grid gap-6"
                    >
                      <div className="flex items-end justify-between gap-4">
                        <div className="grid gap-2">
                          <h2
                            className="text-3xl font-bold text-foreground sm:text-4xl"
                            style={{ fontFamily: 'var(--font-heading)' }}
                          >
                            {category.name}
                          </h2>
                          <div className="text-sm text-muted-foreground">
                            {category.categoryItems.length} item
                            {category.categoryItems.length === 1 ? '' : 's'}
                            {searchQuery.trim() ? ` matching "${searchQuery.trim()}"` : ''}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
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
                    </section>
                  ))}
                </section>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {themeError || menuQuery.error ? (
          <div className="rounded-[var(--radius)] border border-destructive/20 bg-destructive/10 px-4 py-4 text-sm text-foreground sm:px-6">
            {themeError ??
              (menuQuery.error instanceof Error
                ? menuQuery.error.message
                : 'Failed to load storefront')}
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
        tenantSlug={tenantSlug}
        brandColors={{
          accent: theme.palette.accent,
          primary: theme.palette.primary,
          primaryForeground: theme.palette.primaryForeground,
        }}
        loyaltyAccount={loyaltyQuery.data ?? null}
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
          const menuItem = cartItem ? (itemLookup.get(cartItem.itemId) ?? null) : null
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
        customerSession={customerSession}
        stripePublishableKey={stripePublishableKey}
        onCreatePaymentIntent={createPaymentIntentForCheckout}
        onPaymentConfirmed={finalizePaidCheckout}
        onViewRewardsWallet={onViewRewardsWallet}
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
  const { theme } = useTheme()
  const meta = [
    item.tags[0] ?? null,
    item.itemModifierGroups.length > 0 ? 'Customizable' : null,
    item.variants.length > 1 ? `${item.variants.length} sizes` : null,
  ].filter(Boolean)
  const badgeLabel = item.visibility === 'SOLD_OUT' ? 'Sold out' : featured ? 'Popular' : null

  return (
    <motion.div whileTap={{ scale: 0.988 }} transition={{ duration: 0.12, ease: 'easeOut' }}>
      <article
        className={cn(
          'group flex h-full flex-col overflow-hidden rounded-[24px] border',
          item.visibility === 'SOLD_OUT' && 'opacity-70'
        )}
        style={{
          backgroundColor: theme.palette.surface,
          borderColor: hexToRgba(theme.palette.border, 0.55),
          boxShadow: `0 8px 24px ${hexToRgba(theme.palette.text, 0.06)}`,
        }}
      >
        {item.photoUrl ? (
          <div className="relative h-56 overflow-hidden p-6 pb-0">
            <div
              className="h-full w-full rounded-[18px] border bg-cover bg-center transition-transform duration-500 group-hover:scale-[1.02]"
              style={{
                borderColor: hexToRgba(theme.palette.border, 0.6),
                backgroundColor: hexToRgba(theme.palette.primary, 0.08),
                backgroundImage: `url(${item.photoUrl})`,
              }}
            />

            {badgeLabel ? (
              <div className="absolute right-9 top-9">
                <span
                  className="inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em]"
                  style={{
                    backgroundColor:
                      item.visibility === 'SOLD_OUT'
                        ? hexToRgba(theme.palette.text, 0.82)
                        : theme.palette.primary,
                    color: theme.palette.primaryForeground,
                  }}
                >
                  {badgeLabel}
                </span>
              </div>
            ) : null}
          </div>
        ) : badgeLabel ? (
          <div className="px-6 pt-6">
            <span
              className="inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em]"
              style={{
                backgroundColor:
                  item.visibility === 'SOLD_OUT'
                    ? hexToRgba(theme.palette.text, 0.82)
                    : theme.palette.primary,
                color: theme.palette.primaryForeground,
              }}
            >
              {badgeLabel}
            </span>
          </div>
        ) : null}

        <div className={cn('flex flex-1 flex-col gap-4 px-6 pb-6', item.photoUrl ? 'pt-4' : 'pt-6')}>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h3
                className="text-2xl font-semibold leading-tight text-foreground"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                {item.name}
              </h3>
              {item.nameLocalized ? (
                <div className="mt-1 text-sm text-muted-foreground">{item.nameLocalized}</div>
              ) : null}
            </div>
            <div
              className="shrink-0 text-lg font-semibold"
              style={{ color: theme.palette.primary }}
            >
              {formatPrice(itemPrice(item))}
            </div>
          </div>

          {item.description ? (
            <p className="line-clamp-3 text-sm leading-7 text-muted-foreground">
              {item.description}
            </p>
          ) : null}

          {meta.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
              {meta.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full px-3 py-1.5"
                  style={{
                    backgroundColor: hexToRgba(theme.palette.text, 0.05),
                    color: theme.palette.muted,
                  }}
                >
                  <Tags className="h-3 w-3" />
                  {tag}
                </span>
              ))}
            </div>
          ) : null}

          <div className="mt-auto flex items-end justify-between gap-4">
            <div className="text-sm text-muted-foreground">
              {item.visibility === 'SOLD_OUT'
                ? 'Sold out today'
                : item.itemModifierGroups.length > 0
                  ? 'Customize before adding'
                  : 'Ready to add'}
            </div>

            {item.visibility === 'SOLD_OUT' ? (
              <span className="text-sm font-medium text-muted-foreground">Unavailable</span>
            ) : (
              <button
                type="button"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full shadow-lg transition-transform hover:-translate-y-0.5"
                style={{
                  background: `linear-gradient(135deg, ${theme.palette.primary}, ${theme.palette.accent})`,
                  color: theme.palette.primaryForeground,
                  boxShadow: `0 12px 24px ${hexToRgba(theme.palette.primary, 0.26)}`,
                }}
                onClick={onCustomize}
                aria-label={`Add ${item.name}`}
              >
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </article>
    </motion.div>
  )
}

function EmptyStateCard({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof UtensilsCrossed | typeof Search
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
          <h3
            className="text-xl font-semibold text-foreground"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
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
      <div className="rounded-[24px] border border-border/70 bg-card p-6 shadow-sm">
        <Skeleton className="h-[320px] w-full rounded-[18px]" />
      </div>

      <div className="grid gap-8">
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-11 w-28 rounded-full" />
          ))}
        </div>

        <section className="grid gap-6">
          <div className="grid gap-4">
            <Skeleton className="h-10 w-48" />
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="overflow-hidden rounded-[24px] border border-border/70 bg-card p-6 shadow-sm"
              >
                <Skeleton className="h-56 w-full rounded-[18px]" />
                <div className="mt-4 grid gap-3">
                  <Skeleton className="h-7 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-4/5" />
                  <div className="mt-4 flex items-center justify-between">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-11 w-11 rounded-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  )
}
