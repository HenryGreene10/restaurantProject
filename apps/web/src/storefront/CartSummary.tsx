import { AnimatePresence, motion } from "framer-motion"
import { Minus, Plus, ShoppingBag, Trash2, UtensilsCrossed, X } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { CustomerOtpStep } from "./CustomerOtpStep"
import { cartItemCount, cartLineTotal, cartSubtotal, type CartItem } from "./cartStore"
import type { CustomerSessionController } from "./useCustomerSession"

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
  customerSession: CustomerSessionController
  orderNotes: string
  open: boolean
  submitting?: boolean
  onOpen: () => void
  onClose: () => void
  onIncrement: (lineId: string) => void
  onDecrement: (lineId: string) => void
  onRemove: (lineId: string) => void
  onClear: () => void
  onCustomerNameChange: (value: string) => void
  onCustomerPhoneChange: (value: string) => void
  onOrderNotesChange: (value: string) => void
  onRequestOtp: (phone: string) => Promise<void>
  onVerifyOtp: (phone: string, code: string) => Promise<void>
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
  customerSession,
  orderNotes,
  open,
  submitting = false,
  onOpen,
  onClose,
  onIncrement,
  onDecrement,
  onRemove,
  onClear,
  onCustomerNameChange,
  onCustomerPhoneChange,
  onOrderNotesChange,
  onRequestOtp,
  onVerifyOtp,
  onCheckout,
}: CartSummaryProps) {
  const itemCount = cartItemCount(items)
  const subtotal = cartSubtotal(items)
  const [checkoutMode, setCheckoutMode] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [otpCode, setOtpCode] = useState("")
  const [otpError, setOtpError] = useState<string | null>(null)
  const [otpSent, setOtpSent] = useState(false)
  const [otpPhone, setOtpPhone] = useState<string | null>(null)
  const [sendingOtp, setSendingOtp] = useState(false)
  const [verifyingOtp, setVerifyingOtp] = useState(false)

  const canContinue = items.length > 0
  const normalizedPhone = customerPhone.trim()
  const hasDraftDetails = customerName.trim().length >= 2 && normalizedPhone.length >= 8
  const isPhoneVerified = customerSession.isVerifiedPhone(normalizedPhone)
  const canSubmit = hasDraftDetails && isPhoneVerified && !submitting
  const canSendCode = hasDraftDetails && !sendingOtp && !customerSession.isRestoring
  const canVerifyCode = otpCode.trim().length >= 4 && !verifyingOtp

  const taxEstimate = useMemo(() => Math.round(subtotal * 0.08), [subtotal])
  const totalEstimate = subtotal + taxEstimate

  useEffect(() => {
    if (isPhoneVerified) {
      setOtpCode("")
      setOtpError(null)
      setOtpSent(false)
      setOtpPhone(null)
    }
  }, [isPhoneVerified])

  useEffect(() => {
    if (otpSent && otpPhone && normalizedPhone !== otpPhone) {
      setOtpCode("")
      setOtpError(null)
      setOtpSent(false)
      setOtpPhone(null)
    }
  }, [normalizedPhone, otpPhone, otpSent])

  async function handleCheckoutSubmit() {
    if (!canSubmit) {
      setFormError("Verify your phone number before placing the pickup order.")
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
      setOtpCode("")
      setOtpError(null)
      setOtpSent(false)
      setOtpPhone(null)
      onClose()
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Failed to place order")
    }
  }

  async function handleRequestOtp() {
    if (!hasDraftDetails) {
      setFormError("Enter a name and phone number before requesting a verification code.")
      return
    }

    setFormError(null)
    setOtpError(null)
    setSendingOtp(true)

    try {
      await onRequestOtp(normalizedPhone)
      setOtpSent(true)
      setOtpPhone(normalizedPhone)
    } catch (error) {
      setOtpError(error instanceof Error ? error.message : "Failed to send verification code")
    } finally {
      setSendingOtp(false)
    }
  }

  async function handleVerifyOtp() {
    if (!canVerifyCode) {
      setOtpError("Enter the verification code we sent to your phone.")
      return
    }

    setOtpError(null)
    setVerifyingOtp(true)

    try {
      await onVerifyOtp(normalizedPhone, otpCode.trim())
    } catch (error) {
      setOtpError(error instanceof Error ? error.message : "Failed to verify code")
    } finally {
      setVerifyingOtp(false)
    }
  }

  function handleClose() {
    setCheckoutMode(false)
    setFormError(null)
    setOtpError(null)
    setOtpCode("")
    setOtpSent(false)
    setOtpPhone(null)
    onClose()
  }

  return (
    <>
      {itemCount > 0 ? (
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
              className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-[2px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleClose}
            />

            <motion.aside
              className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col border-l border-border bg-card shadow-2xl"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 280, damping: 28 }}
            >
              <div className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-6 sm:py-6">
                <div>
                  <div className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                    {checkoutMode ? "Pickup checkout" : "Cart"}
                  </div>
                  <h2 className="mt-2 text-2xl text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
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

              <div className="flex-1 space-y-6 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
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
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => onRemove(item.lineId)}
                              className="mt-2 h-auto px-0 text-xs text-muted-foreground hover:text-foreground"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Remove
                            </Button>
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
                              placeholder="+1 555 555 5555"
                            />
                          </div>
                          {isPhoneVerified ? (
                          <div className="rounded-[var(--radius)] border border-primary/20 bg-primary/10 px-4 py-4 text-sm text-foreground">
                            Phone verified for this checkout.
                          </div>
                        ) : customerSession.isRestoring ? (
                            <div className="rounded-[var(--radius)] border border-border bg-background px-4 py-4 text-sm text-muted-foreground">
                              Restoring saved customer session…
                            </div>
                          ) : null}
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

                      {!isPhoneVerified && otpSent && otpPhone ? (
                        <CustomerOtpStep
                          code={otpCode}
                          errorMessage={otpError}
                          phone={otpPhone}
                          sending={sendingOtp}
                          verifying={verifyingOtp}
                          onCodeChange={setOtpCode}
                          onEditPhone={() => {
                            setOtpSent(false)
                            setOtpCode("")
                            setOtpError(null)
                            setOtpPhone(null)
                          }}
                          onResend={() => void handleRequestOtp()}
                        />
                      ) : null}

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
                    {isPhoneVerified ? (
                      <Button
                        className="min-h-11 w-full justify-center"
                        disabled={!canSubmit}
                        onClick={() => void handleCheckoutSubmit()}
                      >
                        {submitting ? "Placing order…" : "Place pickup order"}
                      </Button>
                    ) : otpSent ? (
                      <Button
                        className="min-h-11 w-full justify-center"
                        disabled={!canVerifyCode}
                        onClick={() => void handleVerifyOtp()}
                      >
                        {verifyingOtp ? "Verifying…" : "Verify code"}
                      </Button>
                    ) : (
                      <Button
                        className="min-h-11 w-full justify-center"
                        disabled={!canSendCode}
                        onClick={() => void handleRequestOtp()}
                      >
                        {sendingOtp ? "Sending code…" : "Send verification code"}
                      </Button>
                    )}
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
}
