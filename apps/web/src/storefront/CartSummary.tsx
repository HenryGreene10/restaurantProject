import { AnimatePresence, motion } from "framer-motion"
import { Minus, Plus, ShoppingBag, Trash2, UtensilsCrossed, X } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { createPortal } from "react-dom"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { cartItemCount, cartLineTotal, cartSubtotal, type CartItem } from "./cartStore"

function formatPrice(priceCents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(priceCents / 100)
}

type CartSummaryProps = {
  items: CartItem[]
  customerName: string
  customerPhone: string
  orderNotes: string
  open: boolean
  hideStickyCartBar?: boolean
  submitting?: boolean
  onOpen: () => void
  onClose: () => void
  onIncrement: (lineId: string) => void
  onDecrement: (lineId: string) => void
  onRemove: (lineId: string) => void
  onClear: () => void
  onEdit: (lineId: string) => void
  onCustomerNameChange: (value: string) => void
  onCustomerPhoneChange: (value: string) => void
  onOrderNotesChange: (value: string) => void
  onCheckout: (payload: {
    customerName: string
    customerPhone: string
    orderNotes: string | null
  }) => Promise<void>
}

export function CartSummary({
  items,
  customerName,
  customerPhone,
  orderNotes,
  open,
  hideStickyCartBar = false,
  submitting = false,
  onOpen,
  onClose,
  onIncrement,
  onDecrement,
  onRemove,
  onClear,
  onEdit,
  onCustomerNameChange,
  onCustomerPhoneChange,
  onOrderNotesChange,
  onCheckout,
}: CartSummaryProps) {
  const itemCount = cartItemCount(items)
  const subtotal = cartSubtotal(items)
  const [checkoutMode, setCheckoutMode] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const canContinue = items.length > 0
  const trimmedName = customerName.trim()
  const trimmedPhone = customerPhone.trim()
  const hasDraftDetails = trimmedName.length > 0 && trimmedPhone.length >= 7
  const canSubmit = hasDraftDetails && !submitting

  const taxEstimate = useMemo(() => Math.round(subtotal * 0.08), [subtotal])
  const totalEstimate = subtotal + taxEstimate

  useEffect(() => {
    if (!open || typeof document === "undefined") return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  useEffect(() => {
    if (!checkoutMode || canSubmit) return
    if (!trimmedName && !trimmedPhone) return

    console.log("Checkout validation blocked", {
      nameLength: trimmedName.length,
      phoneLength: trimmedPhone.length,
      hasName: trimmedName.length > 0,
      hasPhone: trimmedPhone.length > 0,
      hasDraftDetails,
      submitting,
    })
  }, [canSubmit, checkoutMode, hasDraftDetails, submitting, trimmedName, trimmedPhone])

  async function handleCheckoutSubmit() {
    if (!canSubmit) {
      console.log("Checkout validation blocked", {
        nameLength: trimmedName.length,
        phoneLength: trimmedPhone.length,
        hasName: trimmedName.length > 0,
        hasPhone: trimmedPhone.length > 0,
        hasDraftDetails,
        submitting,
      })
      setFormError("Enter your name and phone number before placing the pickup order.")
      return
    }

    setFormError(null)

    try {
      await onCheckout({
        customerName: trimmedName,
        customerPhone: trimmedPhone,
        orderNotes: orderNotes.trim() ? orderNotes.trim() : null,
      })
      setCheckoutMode(false)
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

  const drawer = (
    <>
      {itemCount > 0 && !open && !hideStickyCartBar ? (
        <div className="fixed inset-x-4 bottom-4 z-30 md:inset-x-auto md:right-6 md:w-full md:max-w-md">
          <Card className="gap-0 border border-border/80 bg-card py-0 shadow-xl">
            <CardContent className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6">
              <div className="flex items-center gap-4">
                <div className="rounded-[var(--radius)] border border-border bg-background p-2 text-primary">
                  <ShoppingBag className="h-5 w-5" />
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-semibold text-foreground">
                    {itemCount} item{itemCount === 1 ? "" : "s"} in cart
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Total so far {formatPrice(subtotal)}
                  </div>
                </div>
              </div>
              <Button className="min-h-11" onClick={onOpen}>View cart</Button>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <AnimatePresence>
        {open ? (
          <>
            <motion.div
              className="fixed inset-0 z-[9999] bg-[rgba(0,0,0,0.6)]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleClose}
            />

            <motion.aside
              className="fixed bottom-0 left-0 right-0 z-[10000] flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[12px] border border-neutral-200 bg-white text-black shadow-[0_25px_50px_rgba(0,0,0,0.3)] md:bottom-0 md:left-auto md:right-0 md:top-0 md:max-h-[100dvh] md:w-full md:max-w-[560px] md:rounded-none md:border-l"
              initial={{ x: "100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0 }}
              transition={{ type: "spring", stiffness: 280, damping: 28 }}
            >
              <div className="shrink-0 flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-4 sm:px-6 sm:py-6">
                <div>
                  <div className="text-xs font-medium uppercase tracking-[0.12em] text-neutral-500">
                    {checkoutMode ? "Pickup checkout" : "Cart"}
                  </div>
                  <h2 className="mt-2 text-2xl text-black" style={{ fontFamily: "var(--font-heading)" }}>
                    {checkoutMode ? "Review and place order" : "Your order"}
                  </h2>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={handleClose}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="flex-1 space-y-6 overflow-y-auto bg-white px-4 py-4 sm:px-6 sm:py-6">
                {items.length === 0 ? (
                  <Card size="sm" className="border border-dashed border-border bg-background shadow-none">
                    <CardContent className="flex min-h-48 flex-col items-center justify-center gap-4 px-6 py-12 text-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-card text-muted-foreground">
                        <UtensilsCrossed className="h-5 w-5" />
                      </div>
                      <div className="grid gap-2">
                        <div className="text-xl font-semibold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
                          Your cart is empty
                        </div>
                        <div className="text-sm leading-6 text-muted-foreground">
                          Add a few favorites to start your pickup order.
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : null}

                {!checkoutMode
                  ? items.map((item) => (
                      <Card
                        key={item.lineId}
                        size="sm"
                        className="gap-4 border border-border/80 bg-card shadow-sm"
                      >
                        <CardContent className="space-y-4 px-4 py-4 sm:px-6 sm:py-6">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="font-semibold text-foreground">{item.name}</div>
                            <div className="mt-2 text-sm text-muted-foreground">
                              {item.variantName ?? "Standard"}
                            </div>
                            {item.modifiers.length > 0 ? (
                              <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
                                {item.modifiers.map((modifier) => (
                                  <Badge
                                    key={`${item.lineId}-${modifier.optionId}`}
                                    variant="outline"
                                    className="border-border bg-background text-muted-foreground"
                                  >
                                    {modifier.optionName}
                                  </Badge>
                                ))}
                              </div>
                            ) : null}
                            {item.notes ? (
                              <div className="mt-2 text-xs text-muted-foreground">Note: {item.notes}</div>
                            ) : null}
                          </div>

                          <div className="text-right">
                            <div className="font-semibold text-foreground">{formatPrice(cartLineTotal(item))}</div>
                            <div className="mt-2 flex items-center justify-end gap-3">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => onEdit(item.lineId)}
                                className="h-auto px-0 text-xs text-muted-foreground hover:text-foreground"
                              >
                                Edit
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => onRemove(item.lineId)}
                                className="h-auto px-0 text-xs text-muted-foreground hover:text-foreground"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Remove
                              </Button>
                            </div>
                          </div>
                        </div>

                        <div className="inline-flex min-h-11 items-center gap-2 rounded-[var(--radius)] border border-border bg-background px-2 py-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => onDecrement(item.lineId)}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="min-w-8 text-center text-sm font-semibold text-foreground">{item.quantity}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => onIncrement(item.lineId)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        </CardContent>
                      </Card>
                    ))
                  : (
                    <div className="space-y-6">
                      <Card size="sm" className="gap-4 border border-border/80 bg-card shadow-sm">
                        <CardHeader className="gap-2">
                          <Badge variant="outline" className="border-border bg-background text-muted-foreground">
                            Fulfillment
                          </Badge>
                          <CardTitle style={{ fontFamily: "var(--font-heading)" }}>Pickup</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-4">
                          <div className="rounded-[var(--radius)] border border-primary/20 bg-primary/10 px-4 py-4">
                            <div className="font-semibold text-foreground">Pickup</div>
                            <div className="mt-2 text-sm text-muted-foreground">
                              Pickup is live now.
                            </div>
                          </div>
                          <div className="rounded-[var(--radius)] border border-dashed border-border px-4 py-4">
                            <div className="font-semibold text-foreground">Delivery</div>
                            <div className="mt-2 text-sm text-muted-foreground">
                              Coming soon.
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card size="sm" className="gap-4 border border-border/80 bg-card shadow-sm">
                        <CardHeader className="gap-2">
                          <Badge variant="outline" className="border-border bg-background text-muted-foreground">
                            Pickup details
                          </Badge>
                          <CardTitle style={{ fontFamily: "var(--font-heading)" }}>Customer details</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-4">
                          <div className="grid gap-2">
                            <Label htmlFor="checkout-name">Name</Label>
                            <Input
                              id="checkout-name"
                              value={customerName}
                              onChange={(event) => onCustomerNameChange(event.target.value)}
                              placeholder="Customer name"
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="checkout-phone">Phone</Label>
                            <Input
                              id="checkout-phone"
                              value={customerPhone}
                              onChange={(event) => onCustomerPhoneChange(event.target.value)}
                              placeholder="(555) 555-5555"
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="checkout-note">Order note</Label>
                            <textarea
                              id="checkout-note"
                              value={orderNotes}
                              onChange={(event) => onOrderNotesChange(event.target.value)}
                              rows={3}
                              className="min-h-24 w-full rounded-[var(--radius)] border border-input bg-background px-4 py-4 text-sm text-foreground shadow-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
                              placeholder="Optional note for pickup"
                            />
                          </div>
                        </CardContent>
                      </Card>

                      <Card size="sm" className="gap-4 border border-border/80 bg-card shadow-sm">
                        <CardHeader className="gap-2">
                          <Badge variant="outline" className="border-border bg-background text-muted-foreground">
                            Order summary
                          </Badge>
                          <CardTitle style={{ fontFamily: "var(--font-heading)" }}>What you’re ordering</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {items.map((item) => (
                            <div key={item.lineId} className="flex items-start justify-between gap-4 text-sm">
                              <div>
                                <div className="font-medium text-foreground">
                                  {item.quantity} × {item.name}
                                </div>
                                <div className="mt-2 text-xs text-muted-foreground">
                                  {item.variantName ?? "Standard"}
                                </div>
                              </div>
                              <div className="font-medium text-foreground">{formatPrice(cartLineTotal(item))}</div>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    </div>
                  )}
              </div>

              <div className="border-t border-border bg-card px-4 py-4 sm:px-6 sm:py-6">
                <div className="space-y-4">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="font-semibold text-foreground">{formatPrice(subtotal)}</span>
                </div>
                {checkoutMode ? (
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Estimated tax</span>
                    <span className="font-semibold text-foreground">{formatPrice(taxEstimate)}</span>
                  </div>
                ) : null}
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>
                    {checkoutMode ? "Estimated total" : `${itemCount} item${itemCount === 1 ? "" : "s"}`}
                  </span>
                  {checkoutMode ? (
                    <span className="text-base font-semibold text-foreground">{formatPrice(totalEstimate)}</span>
                  ) : items.length > 0 ? (
                    <Button type="button" variant="ghost" size="sm" onClick={onClear} className="h-auto px-0 text-muted-foreground hover:text-foreground">
                      Clear cart
                    </Button>
                  ) : null}
                </div>
                <Separator />
                {formError ? (
                  <div className="rounded-[var(--radius)] border border-destructive/20 bg-destructive/10 px-4 py-4 text-sm text-foreground">
                    {formError}
                  </div>
                ) : null}
                {!checkoutMode ? (
                  <Button
                    className="min-h-11 w-full justify-center"
                    disabled={!canContinue}
                    onClick={() => setCheckoutMode(true)}
                  >
                    Continue to pickup checkout
                  </Button>
                ) : (
                  <div className="grid gap-4">
                    <Button
                      className="min-h-11 w-full justify-center"
                      disabled={!canSubmit}
                      onClick={() => void handleCheckoutSubmit()}
                    >
                      {submitting ? "Placing order…" : "Place pickup order"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setCheckoutMode(false)}
                    >
                      Back to cart
                    </Button>
                  </div>
                )}
                </div>
              </div>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    </>
  )

  if (typeof document === "undefined") {
    return drawer
  }

  return createPortal(drawer, document.body)
}
