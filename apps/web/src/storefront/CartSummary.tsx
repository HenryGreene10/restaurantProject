import { AnimatePresence, motion } from "framer-motion"
import { Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react"
import { useMemo, useState } from "react"

import { Button } from "../components/Button"
import { cartItemCount, cartLineTotal, cartSubtotal, type CartItem } from "./cartStore"

function formatPrice(priceCents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(priceCents / 100)
}

type CartSummaryProps = {
  items: CartItem[]
  open: boolean
  submitting?: boolean
  onOpen: () => void
  onClose: () => void
  onIncrement: (lineId: string) => void
  onDecrement: (lineId: string) => void
  onRemove: (lineId: string) => void
  onClear: () => void
  onCheckout: (payload: {
    customerName: string
    customerPhone: string
    orderNotes: string | null
  }) => Promise<void>
}

export function CartSummary({
  items,
  open,
  submitting = false,
  onOpen,
  onClose,
  onIncrement,
  onDecrement,
  onRemove,
  onClear,
  onCheckout,
}: CartSummaryProps) {
  const itemCount = cartItemCount(items)
  const subtotal = cartSubtotal(items)
  const [checkoutMode, setCheckoutMode] = useState(false)
  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [orderNotes, setOrderNotes] = useState("")
  const [formError, setFormError] = useState<string | null>(null)

  const canContinue = items.length > 0
  const normalizedPhone = customerPhone.trim()
  const canSubmit =
    customerName.trim().length >= 2 && normalizedPhone.length >= 8 && !submitting

  const taxEstimate = useMemo(() => Math.round(subtotal * 0.08), [subtotal])
  const totalEstimate = subtotal + taxEstimate

  async function handleCheckoutSubmit() {
    if (!canSubmit) {
      setFormError("Enter a name and phone number to place the pickup order.")
      return
    }

    setFormError(null)

    try {
      await onCheckout({
        customerName: customerName.trim(),
        customerPhone: normalizedPhone,
        orderNotes: orderNotes.trim() ? orderNotes.trim() : null,
      })
      setCheckoutMode(false)
      setCustomerName("")
      setCustomerPhone("")
      setOrderNotes("")
      onClose()
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Failed to place order")
    }
  }

  function handleClose() {
    setCheckoutMode(false)
    setFormError(null)
    onClose()
  }

  return (
    <>
      {itemCount > 0 ? (
        <div className="fixed inset-x-4 bottom-4 z-30 md:inset-x-auto md:right-6 md:w-[380px]">
          <div className="rounded-[28px] border border-brand-border/80 bg-brand-surface px-4 py-4 shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-brand-primary/10 p-2 text-brand-primary">
                  <ShoppingBag className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-semibold">{itemCount} item{itemCount === 1 ? "" : "s"} in cart</div>
                  <div className="text-sm text-brand-muted">Subtotal {formatPrice(subtotal)}</div>
                </div>
              </div>
              <Button onClick={onOpen}>View cart</Button>
            </div>
          </div>
        </div>
      ) : null}

      <AnimatePresence>
        {open ? (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-[2px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
            />

            <motion.aside
              className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col border-l border-brand-border bg-brand-surface shadow-2xl"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 280, damping: 28 }}
            >
              <div className="flex items-center justify-between border-b border-brand-border px-5 py-4">
                <div>
                  <div className="text-sm font-semibold uppercase tracking-[0.12em] text-brand-muted">
                    {checkoutMode ? "Pickup checkout" : "Cart"}
                  </div>
                  <h2 className="mt-1 text-2xl" style={{ fontFamily: "var(--font-heading)" }}>
                    {checkoutMode ? "Review and place order" : "Your order"}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-full border border-brand-border p-2 text-brand-muted"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
                {items.length === 0 ? (
                  <div className="rounded-brand border border-dashed border-brand-border bg-brand-background px-4 py-4 text-sm text-brand-muted">
                    Your cart is empty.
                  </div>
                ) : null}

                {!checkoutMode
                  ? items.map((item) => (
                      <article
                        key={item.lineId}
                        className="rounded-brand border border-brand-border/70 bg-brand-background px-4 py-4"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="font-semibold">{item.name}</div>
                            <div className="mt-1 text-sm text-brand-muted">
                              {item.variantName ?? "Standard"}
                            </div>
                            {item.modifiers.length > 0 ? (
                              <div className="mt-2 flex flex-wrap gap-2 text-xs text-brand-muted">
                                {item.modifiers.map((modifier) => (
                                  <span
                                    key={`${item.lineId}-${modifier.optionId}`}
                                    className="rounded-full border border-brand-border px-2 py-1"
                                  >
                                    {modifier.optionName}
                                  </span>
                                ))}
                              </div>
                            ) : null}
                            {item.notes ? (
                              <div className="mt-2 text-xs text-brand-muted">Note: {item.notes}</div>
                            ) : null}
                          </div>

                          <div className="text-right">
                            <div className="font-semibold">{formatPrice(cartLineTotal(item))}</div>
                            <button
                              type="button"
                              onClick={() => onRemove(item.lineId)}
                              className="mt-2 inline-flex items-center gap-1 text-xs text-brand-muted"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Remove
                            </button>
                          </div>
                        </div>

                        <div className="mt-4 inline-flex items-center gap-3 rounded-full border border-brand-border bg-brand-surface px-3 py-2">
                          <button
                            type="button"
                            onClick={() => onDecrement(item.lineId)}
                            className="rounded-full border border-brand-border p-2"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="min-w-8 text-center font-semibold">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => onIncrement(item.lineId)}
                            className="rounded-full border border-brand-border p-2"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      </article>
                    ))
                  : (
                    <div className="space-y-4">
                      <div className="rounded-brand border border-brand-border/70 bg-brand-background px-4 py-4">
                        <div className="text-sm font-semibold uppercase tracking-[0.12em] text-brand-muted">
                          Fulfillment
                        </div>
                        <div className="mt-3 grid gap-3">
                          <div className="rounded-brand border border-brand-primary bg-brand-primary/10 px-4 py-3">
                            <div className="font-semibold">Pickup</div>
                            <div className="mt-1 text-sm text-brand-muted">
                              Pickup is live now.
                            </div>
                          </div>
                          <div className="rounded-brand border border-dashed border-brand-border px-4 py-3 opacity-70">
                            <div className="font-semibold">Delivery</div>
                            <div className="mt-1 text-sm text-brand-muted">
                              Coming soon.
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-brand border border-brand-border/70 bg-brand-background px-4 py-4">
                        <div className="text-sm font-semibold uppercase tracking-[0.12em] text-brand-muted">
                          Pickup details
                        </div>
                        <div className="mt-4 grid gap-4">
                          <label className="grid gap-2">
                            <span className="text-sm font-medium text-brand-text">Name</span>
                            <input
                              value={customerName}
                              onChange={(event) => setCustomerName(event.target.value)}
                              className="rounded-brand border border-brand-border bg-brand-surface px-4 py-3 text-sm outline-none"
                              placeholder="Customer name"
                            />
                          </label>
                          <label className="grid gap-2">
                            <span className="text-sm font-medium text-brand-text">Phone</span>
                            <input
                              value={customerPhone}
                              onChange={(event) => setCustomerPhone(event.target.value)}
                              className="rounded-brand border border-brand-border bg-brand-surface px-4 py-3 text-sm outline-none"
                              placeholder="+1 555 555 5555"
                            />
                          </label>
                          <label className="grid gap-2">
                            <span className="text-sm font-medium text-brand-text">Order note</span>
                            <textarea
                              value={orderNotes}
                              onChange={(event) => setOrderNotes(event.target.value)}
                              rows={3}
                              className="rounded-brand border border-brand-border bg-brand-surface px-4 py-3 text-sm outline-none"
                              placeholder="Optional note for pickup"
                            />
                          </label>
                        </div>
                      </div>

                      <div className="rounded-brand border border-brand-border/70 bg-brand-background px-4 py-4">
                        <div className="text-sm font-semibold uppercase tracking-[0.12em] text-brand-muted">
                          Order summary
                        </div>
                        <div className="mt-3 space-y-3">
                          {items.map((item) => (
                            <div key={item.lineId} className="flex items-start justify-between gap-4">
                              <div>
                                <div className="font-medium">
                                  {item.quantity} × {item.name}
                                </div>
                                <div className="mt-1 text-xs text-brand-muted">
                                  {item.variantName ?? "Standard"}
                                </div>
                              </div>
                              <div className="font-medium">{formatPrice(cartLineTotal(item))}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
              </div>

              <div className="border-t border-brand-border bg-brand-surface px-5 py-4">
                <div className="mb-2 flex items-center justify-between text-sm text-brand-muted">
                  <span>Subtotal</span>
                  <span className="font-semibold text-brand-text">{formatPrice(subtotal)}</span>
                </div>
                {checkoutMode ? (
                  <div className="mb-2 flex items-center justify-between text-sm text-brand-muted">
                    <span>Estimated tax</span>
                    <span className="font-semibold text-brand-text">{formatPrice(taxEstimate)}</span>
                  </div>
                ) : null}
                <div className="mb-4 flex items-center justify-between text-sm text-brand-muted">
                  <span>
                    {checkoutMode ? "Estimated total" : `${itemCount} item${itemCount === 1 ? "" : "s"}`}
                  </span>
                  {checkoutMode ? (
                    <span className="font-semibold text-brand-text">{formatPrice(totalEstimate)}</span>
                  ) : items.length > 0 ? (
                    <button type="button" onClick={onClear} className="text-brand-muted underline">
                      Clear cart
                    </button>
                  ) : null}
                </div>
                {formError ? (
                  <div className="mb-3 rounded-brand border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {formError}
                  </div>
                ) : null}
                {!checkoutMode ? (
                  <Button
                    className="w-full justify-center"
                    disabled={!canContinue}
                    onClick={() => setCheckoutMode(true)}
                  >
                    Continue to pickup checkout
                  </Button>
                ) : (
                  <div className="grid gap-3">
                    <Button
                      className="w-full justify-center"
                      disabled={!canSubmit}
                      onClick={() => void handleCheckoutSubmit()}
                    >
                      {submitting ? "Placing order…" : "Place pickup order"}
                    </Button>
                    <button
                      type="button"
                      onClick={() => setCheckoutMode(false)}
                      className="text-sm text-brand-muted underline"
                    >
                      Back to cart
                    </button>
                  </div>
                )}
              </div>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    </>
  )
}
