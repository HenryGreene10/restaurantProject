import { Clock3, MapPin, ShoppingBag } from "lucide-react"
import { useEffect, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"

import { Button } from "../components/Button"
import { fetchCustomerLoyaltyAccount } from "../lib/loyalty"
import type { CustomerOrder } from "../lib/orders"
import { clearActiveOrder, readActiveOrder } from "./activeOrder"
import { useOrderStatusPoll } from "./useOrderStatusPoll"
import type { CustomerSessionController } from "./useCustomerSession"

function formatPrice(priceCents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(priceCents / 100)
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value))
}

function statusCopy(status: CustomerOrder["status"]) {
  switch (status) {
    case "PENDING":
      return "Order received"
    case "CONFIRMED":
      return "Order confirmed"
    case "PREPARING":
      return "Kitchen is preparing your order"
    case "READY":
      return "Ready for pickup"
    case "COMPLETED":
      return "Order completed"
    case "CANCELLED":
      return "Order cancelled"
  }
}

export function OrderStatusPage({
  orderId,
  tenantSlug,
  customerSession,
  onBackToMenu,
}: {
  orderId: string
  tenantSlug: string
  customerSession: CustomerSessionController
  onBackToMenu: () => void
}) {
  const orderQuery = useOrderStatusPoll({
    tenantSlug,
    orderId,
  })
  const activeOrder = useMemo(() => {
    const record = readActiveOrder()
    if (!record || record.orderId !== orderId || record.tenantSlug !== tenantSlug) {
      return null
    }

    return record
  }, [orderId, tenantSlug])
  const loyaltyQuery = useQuery({
    queryKey: ["customer-loyalty", tenantSlug, customerSession.customerId, orderId],
    queryFn: () =>
      fetchCustomerLoyaltyAccount({
        tenantSlug,
        accessToken: customerSession.accessToken as string,
      }),
    enabled: Boolean(orderQuery.data && customerSession.accessToken),
    refetchInterval: (query) => {
      const hasCurrentOrderPoints = query.state.data?.history?.some(
        (event) => event.orderId === orderId && event.delta > 0,
      )
      const status = orderQuery.data?.status
      if (hasCurrentOrderPoints || status === "COMPLETED" || status === "CANCELLED") {
        return false
      }

      return 3000
    },
  })
  const pointsEarnedThisOrder = useMemo(
    () =>
      loyaltyQuery.data?.history
        .filter((event) => event.orderId === orderId && event.delta > 0)
        .reduce((sum, event) => sum + event.delta, 0) ?? 0,
    [loyaltyQuery.data, orderId],
  )
  const appliedDiscountCents = orderQuery.data?.discountCents ?? activeOrder?.discountCents ?? 0
  const welcomeOfferApplied =
    Boolean(activeOrder?.isNewMember) ||
    Boolean(
      loyaltyQuery.data?.history.some(
        (event) => event.orderId === orderId && event.type === "WELCOME_BONUS",
      ),
    )

  useEffect(() => {
    const status = orderQuery.data?.status
    if (status !== "COMPLETED" && status !== "CANCELLED") {
      return
    }

    const existingActiveOrder = readActiveOrder()
    if (!existingActiveOrder) {
      return
    }

    clearActiveOrder({
      orderId,
      tenantSlug,
      placedAt: existingActiveOrder.placedAt,
    })
  }, [orderId, orderQuery.data?.status, tenantSlug])

  return (
    <main className="min-h-screen bg-brand-background text-brand-text">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-brand border border-brand-border/70 bg-brand-surface/90 px-4 py-3 text-sm text-brand-muted shadow-brand">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-4 w-4" />
            Tracking order for tenant <span className="font-semibold text-brand-text">{tenantSlug}</span>
          </div>
          <button type="button" className="underline" onClick={onBackToMenu}>
            Back to menu
          </button>
        </div>

        <>
            {orderQuery.isLoading ? (
              <section className="rounded-[32px] border border-brand-border/70 bg-brand-surface px-6 py-8 shadow-brand">
                Loading live order status…
              </section>
            ) : null}

            {orderQuery.error ? (
              <section className="rounded-[32px] border border-red-200 bg-red-50 px-6 py-8 shadow-brand">
                <div className="text-sm font-semibold uppercase tracking-[0.12em] text-red-700">
                  Unable to load order
                </div>
                <div className="mt-2 text-red-800">
                  {orderQuery.error instanceof Error ? orderQuery.error.message : "Order lookup failed"}
                </div>
                <div className="mt-4">
                  <Button type="button" onClick={() => void orderQuery.refetch()}>
                    Retry
                  </Button>
                </div>
              </section>
            ) : null}

            {orderQuery.data ? (
              <section className="space-y-5">
                <div className="rounded-[32px] border border-brand-border/70 bg-brand-surface px-6 py-8 shadow-brand">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold uppercase tracking-[0.12em] text-brand-muted">
                        Pickup order #{orderQuery.data.orderNumber}
                      </div>
                      <h1 className="mt-2 text-3xl" style={{ fontFamily: "var(--font-heading)" }}>
                        {statusCopy(orderQuery.data.status)}
                      </h1>
                      <div className="mt-3 flex flex-wrap gap-4 text-sm text-brand-muted">
                        <div className="flex items-center gap-2">
                          <Clock3 className="h-4 w-4" />
                          Placed {formatTimestamp(orderQuery.data.createdAt)}
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          Pickup for {orderQuery.data.customerNameSnapshot ?? "guest"}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-full border border-brand-border bg-brand-background px-4 py-2 text-sm font-semibold">
                      {orderQuery.data.status}
                    </div>
                  </div>

                  {orderQuery.data.notes ? (
                    <div className="mt-5 rounded-brand border border-brand-border/70 bg-brand-background px-4 py-4 text-sm text-brand-muted">
                      Note: {orderQuery.data.notes}
                    </div>
                  ) : null}
                </div>

                <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
                  <div className="rounded-[32px] border border-brand-border/70 bg-brand-surface px-6 py-6 shadow-brand">
                    <div className="text-sm font-semibold uppercase tracking-[0.12em] text-brand-muted">
                      Order summary
                    </div>
                    <div className="mt-4 space-y-4">
                      {orderQuery.data.items.map((item) => (
                        <article key={item.id} className="rounded-brand border border-brand-border/70 bg-brand-background px-4 py-4">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="font-semibold">
                                {item.quantity} × {item.name}
                              </div>
                              <div className="mt-1 text-sm text-brand-muted">
                                {item.variantName ?? "Standard"}
                              </div>
                              {item.modifierSelections.length > 0 ? (
                                <div className="mt-2 flex flex-wrap gap-2 text-xs text-brand-muted">
                                  {item.modifierSelections.map((modifier) => (
                                    <span key={modifier.id} className="rounded-full border border-brand-border px-2 py-1">
                                      {modifier.optionName}
                                    </span>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                            <div className="font-semibold">{formatPrice(item.linePriceCents)}</div>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-5">
                    <div className="rounded-[32px] border border-brand-border/70 bg-brand-surface px-6 py-6 shadow-brand">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-semibold uppercase tracking-[0.12em] text-brand-muted">
                          Loyalty
                        </div>
                        {welcomeOfferApplied ? (
                          <div className="rounded-full border border-brand-border bg-brand-background px-3 py-1 text-xs font-semibold">
                            Welcome offer
                          </div>
                        ) : null}
                      </div>

                      {customerSession.isRestoring ? (
                        <div className="mt-4 text-sm text-brand-muted">
                          Restoring your loyalty balance…
                        </div>
                      ) : loyaltyQuery.isLoading ? (
                        <div className="mt-4 text-sm text-brand-muted">
                          Loading loyalty points…
                        </div>
                      ) : loyaltyQuery.error ? (
                        <div className="mt-4 text-sm text-brand-muted">
                          Loyalty summary unavailable right now.
                        </div>
                      ) : loyaltyQuery.data ? (
                        <div className="mt-4 space-y-2 text-sm text-brand-muted">
                          <div className="flex items-center justify-between">
                            <span>Points earned this order</span>
                            <span className="font-semibold text-brand-text">
                              {pointsEarnedThisOrder.toLocaleString()} pts
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Total balance</span>
                            <span className="font-semibold text-brand-text">
                              {loyaltyQuery.data.balance.toLocaleString()} pts
                            </span>
                          </div>
                          {appliedDiscountCents > 0 ? (
                            <div className="flex items-center justify-between">
                              <span>Reward applied at checkout</span>
                              <span className="font-semibold text-brand-text">
                                -{formatPrice(appliedDiscountCents)}
                              </span>
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <div className="mt-4 text-sm text-brand-muted">
                          Loyalty summary unavailable right now.
                        </div>
                      )}
                    </div>

                    <div className="rounded-[32px] border border-brand-border/70 bg-brand-surface px-6 py-6 shadow-brand">
                      <div className="text-sm font-semibold uppercase tracking-[0.12em] text-brand-muted">
                        Total
                      </div>
                      <div className="mt-4 space-y-2 text-sm text-brand-muted">
                        <div className="flex items-center justify-between">
                          <span>Subtotal</span>
                          <span className="font-semibold text-brand-text">{formatPrice(orderQuery.data.subtotalCents)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Tax</span>
                          <span className="font-semibold text-brand-text">{formatPrice(orderQuery.data.taxCents)}</span>
                        </div>
                        {appliedDiscountCents > 0 ? (
                          <div className="flex items-center justify-between">
                            <span>Discount</span>
                            <span className="font-semibold text-brand-text">
                              -{formatPrice(appliedDiscountCents)}
                            </span>
                          </div>
                        ) : null}
                        <div className="flex items-center justify-between text-base">
                          <span>Total</span>
                          <span className="font-semibold text-brand-text">{formatPrice(orderQuery.data.totalCents)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[32px] border border-brand-border/70 bg-brand-surface px-6 py-6 shadow-brand">
                      <div className="text-sm font-semibold uppercase tracking-[0.12em] text-brand-muted">
                        Status timeline
                      </div>
                      <div className="mt-4 space-y-3">
                        {orderQuery.data.statusEvents.map((event) => (
                          <div key={event.id} className="rounded-brand border border-brand-border/70 bg-brand-background px-4 py-3">
                            <div className="font-semibold">{event.toStatus}</div>
                            <div className="mt-1 text-sm text-brand-muted">
                              {formatTimestamp(event.createdAt)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            ) : null}
          </>
      </div>
    </main>
  )
}
