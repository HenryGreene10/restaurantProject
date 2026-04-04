import { Clock3, MapPin, ShoppingBag } from "lucide-react"
import { useEffect } from "react"

import { Button } from "../components/Button"
import type { CustomerOrder } from "../lib/orders"
import { clearActiveOrder, readActiveOrder } from "./activeOrder"
import { useOrderStatusPoll } from "./useOrderStatusPoll"

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
  onBackToMenu,
}: {
  orderId: string
  tenantSlug: string
  onBackToMenu: () => void
}) {
  const orderQuery = useOrderStatusPoll({
    tenantSlug,
    orderId,
  })

  useEffect(() => {
    const status = orderQuery.data?.status
    if (status !== "COMPLETED" && status !== "CANCELLED") {
      return
    }

    const activeOrder = readActiveOrder()
    if (!activeOrder) {
      return
    }

    clearActiveOrder({
      orderId,
      tenantSlug,
      placedAt: activeOrder.placedAt,
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
