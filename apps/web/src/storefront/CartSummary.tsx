import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft,
  CheckCircle2,
  Minus,
  Plus,
  ShoppingBag,
  Sparkles,
  Trash2,
  UtensilsCrossed,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import type { CheckoutPaymentIntentSession } from '@/lib/payments'
import { redeemLoyaltyPoints, type CustomerLoyaltyAccount } from '@/lib/loyalty'
import { cartItemCount, cartLineTotal, cartSubtotal, type CartItem } from './cartStore'
import { CustomerOtpStep } from './CustomerOtpStep'
import { StripeCheckoutForm } from './StripeCheckoutForm'
import type { CustomerSessionController } from './useCustomerSession'
import { useTheme } from '../theme/ThemeProvider'

const NAME_PATTERN = /^[A-Za-z\s'-]+$/
const ORDER_NOTE_MAX_LENGTH = 500

function formatPrice(priceCents: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(priceCents / 100)
}

function normalizePhoneNumber(value: string) {
  const digits = value.replace(/\D/g, '')

  if (digits.length === 10) {
    return `+1${digits}`
  }

  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`
  }

  return null
}

function validateCustomerName(value: string) {
  const trimmed = value.trim()
  if (trimmed.length < 2 || !NAME_PATTERN.test(trimmed)) {
    return 'Please enter your full name'
  }

  return null
}

function validateCustomerPhone(value: string) {
  const digits = value.replace(/\D/g, '')
  if (digits.length < 10 || !normalizePhoneNumber(value)) {
    return 'Please enter a valid 10-digit phone number'
  }

  return null
}

const NEW_MEMBER_BULLETS = [
  '10% new-member discount applied instantly',
  'Auto-enrolled in rewards',
  '200 welcome bonus points after verification',
]

type CartSummaryProps = {
  items: CartItem[]
  tenantSlug: string
  brandColors?: {
    accent: string
    primary: string
    primaryForeground: string
  }
  loyaltyAccount?: CustomerLoyaltyAccount | null
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
  customerSession: CustomerSessionController
  stripePublishableKey: string
  onCreatePaymentIntent: (payload: {
    customerName: string
    customerPhone: string
    orderNotes: string | null
    fulfillmentType: 'PICKUP' | 'DELIVERY'
    deliveryAddress: string | null
  }) => Promise<CheckoutPaymentIntentSession>
  onPaymentConfirmed: (paymentSession: CheckoutPaymentIntentSession) => Promise<void>
  onViewRewardsWallet?: () => void
}

export function CartSummary({
  items,
  tenantSlug,
  brandColors,
  loyaltyAccount,
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
  customerSession,
  stripePublishableKey,
  onCreatePaymentIntent,
  onPaymentConfirmed,
  onViewRewardsWallet: _onViewRewardsWallet,
}: CartSummaryProps) {
  const { theme } = useTheme()
  const itemCount = cartItemCount(items)
  const subtotal = cartSubtotal(items)
  const [checkoutMode, setCheckoutMode] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [nameTouched, setNameTouched] = useState(false)
  const [phoneTouched, setPhoneTouched] = useState(false)
  const [addressTouched, setAddressTouched] = useState(false)
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [paymentSession, setPaymentSession] = useState<CheckoutPaymentIntentSession | null>(null)
  const [isPreparingPayment, setIsPreparingPayment] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [otpError, setOtpError] = useState<string | null>(null)
  const [otpPhone, setOtpPhone] = useState<string | null>(null)
  const [isSendingOtp, setIsSendingOtp] = useState(false)
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false)
  const [fulfillmentType, setFulfillmentType] = useState<'PICKUP' | 'DELIVERY'>('PICKUP')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  // loyalty redemption state
  const [selectedTierId, setSelectedTierId] = useState<string | null>(null)
  const [appliedRedemptionCents, setAppliedRedemptionCents] = useState(0)
  const [isRedeeming, setIsRedeeming] = useState(false)
  const [redemptionError, setRedemptionError] = useState<string | null>(null)

  const canContinue = items.length > 0
  const trimmedName = customerName.trim()
  const trimmedPhone = customerPhone.trim()
  const trimmedAddress = deliveryAddress.trim()
  const nameError = validateCustomerName(customerName)
  const phoneError = validateCustomerPhone(customerPhone)
  const addressError =
    fulfillmentType === 'DELIVERY' && !trimmedAddress ? 'Delivery address is required' : null
  const showNameError = (nameTouched || submitAttempted) && !!nameError
  const showPhoneError = (phoneTouched || submitAttempted) && !!phoneError
  const showAddressError = (addressTouched || submitAttempted) && !!addressError
  const hasDraftDetails =
    trimmedName.length > 0 &&
    trimmedPhone.length > 0 &&
    (fulfillmentType === 'PICKUP' || trimmedAddress.length > 0)
  const canSubmit =
    hasDraftDetails &&
    !submitting &&
    !isPreparingPayment &&
    !isSendingOtp &&
    !isVerifyingOtp &&
    !isRedeeming

  const taxEstimate = useMemo(() => Math.round(subtotal * 0.08), [subtotal])

  // loyalty banner: show for unauthenticated users (new) or authenticated new members
  const loyaltyActive = !loyaltyAccount || loyaltyAccount.active !== false
  const isNewMemberSession = !customerSession.isAuthenticated || (loyaltyAccount?.isNew ?? true)
  const showLoyaltyBanner =
    checkoutMode && !paymentSession && !otpPhone && loyaltyActive && isNewMemberSession

  // redemption section: returning customer with redeemable points
  const redeemableTiers = loyaltyAccount?.tiers ?? []
  const showRedemptionSection =
    checkoutMode &&
    !paymentSession &&
    !otpPhone &&
    customerSession.isAuthenticated &&
    loyaltyAccount &&
    !loyaltyAccount.isNew &&
    loyaltyAccount.balance >= loyaltyAccount.minRedeem &&
    redeemableTiers.length > 0 &&
    appliedRedemptionCents === 0

  // preview discount from selected tier (updates immediately on radio selection)
  const selectedTier = redeemableTiers.find((t) => t.id === selectedTierId) ?? null
  const previewDiscountCents = appliedRedemptionCents || (selectedTier?.discountCents ?? 0)
  const totalEstimate = subtotal + taxEstimate - previewDiscountCents

  useEffect(() => {
    if (!open || typeof document === 'undefined') return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  async function preparePayment(normalizedPhone: string) {
    setFormError(null)
    setOtpError(null)
    setIsPreparingPayment(true)

    try {
      if (!stripePublishableKey) {
        throw new Error('Stripe is not configured for this storefront')
      }

      const nextPaymentSession = await onCreatePaymentIntent({
        customerName: trimmedName,
        customerPhone: normalizedPhone,
        orderNotes: orderNotes.trim() ? orderNotes.trim() : null,
        fulfillmentType,
        deliveryAddress: fulfillmentType === 'DELIVERY' ? trimmedAddress : null,
      })
      setPaymentSession(nextPaymentSession)
      setOtpPhone(null)
      setOtpCode('')
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Failed to prepare payment')
    } finally {
      setIsPreparingPayment(false)
    }
  }

  async function applyRedemptionIfSelected() {
    if (!selectedTierId || !customerSession.accessToken || appliedRedemptionCents > 0) return
    setIsRedeeming(true)
    setRedemptionError(null)
    try {
      const result = await redeemLoyaltyPoints({
        tenantSlug,
        accessToken: customerSession.accessToken,
        tierId: selectedTierId,
      })
      setAppliedRedemptionCents(result.discountCents)
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Failed to apply reward')
      setIsRedeeming(false)
      return false
    } finally {
      setIsRedeeming(false)
    }
    return true
  }

  async function handleCheckoutSubmit() {
    setSubmitAttempted(true)

    if (!canSubmit) {
      setFormError('Enter your details before continuing to payment.')
      return
    }

    if (nameError || phoneError || addressError) {
      setFormError(null)
      return
    }

    const normalizedPhone = normalizePhoneNumber(customerPhone)
    if (!normalizedPhone) {
      setFormError(null)
      return
    }

    if (customerSession.isVerifiedPhone(normalizedPhone)) {
      // Apply redemption before payment intent if tier selected
      if (selectedTierId && appliedRedemptionCents === 0) {
        const ok = await applyRedemptionIfSelected()
        if (!ok) return
      }
      await preparePayment(normalizedPhone)
      return
    }

    setFormError(null)
    setOtpError(null)
    setIsSendingOtp(true)

    try {
      await customerSession.sendCode(normalizedPhone)
      setOtpPhone(normalizedPhone)
      setOtpCode('')
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Failed to send verification code')
    } finally {
      setIsSendingOtp(false)
    }
  }

  async function handleVerifyOtp() {
    if (!otpPhone) {
      return
    }

    const code = otpCode.trim()
    if (code.length < 4) {
      setOtpError('Enter the verification code we sent.')
      return
    }

    setOtpError(null)
    setFormError(null)
    setIsVerifyingOtp(true)

    try {
      await customerSession.verifyCode(otpPhone, code)
      // Apply redemption after phone verified, before payment intent
      if (selectedTierId && appliedRedemptionCents === 0) {
        const ok = await applyRedemptionIfSelected()
        if (!ok) return
      }
      await preparePayment(otpPhone)
    } catch (error) {
      setOtpError(error instanceof Error ? error.message : 'Failed to verify your phone number')
    } finally {
      setIsVerifyingOtp(false)
    }
  }

  async function handleResendOtp() {
    if (!otpPhone) {
      return
    }

    setOtpError(null)
    setIsSendingOtp(true)

    try {
      await customerSession.sendCode(otpPhone)
    } catch (error) {
      setOtpError(error instanceof Error ? error.message : 'Failed to resend verification code')
    } finally {
      setIsSendingOtp(false)
    }
  }

  function handleEditPhone() {
    setOtpPhone(null)
    setOtpCode('')
    setOtpError(null)
    setPhoneTouched(false)
  }

  function handleClose() {
    setCheckoutMode(false)
    setPaymentSession(null)
    setFormError(null)
    setOtpCode('')
    setOtpError(null)
    setOtpPhone(null)
    setIsSendingOtp(false)
    setIsVerifyingOtp(false)
    setNameTouched(false)
    setPhoneTouched(false)
    setAddressTouched(false)
    setSubmitAttempted(false)
    setFulfillmentType('PICKUP')
    setDeliveryAddress('')
    setSelectedTierId(null)
    setAppliedRedemptionCents(0)
    setIsRedeeming(false)
    setRedemptionError(null)
    onClose()
  }

  const ctaLabel = isPreparingPayment
    ? 'Preparing payment…'
    : isSendingOtp
      ? 'Sending code…'
      : isRedeeming
        ? 'Applying reward…'
        : showLoyaltyBanner
          ? 'Send code & place order'
          : selectedTierId && showRedemptionSection
            ? `Apply reward & pay ${formatPrice(totalEstimate)}`
            : 'Continue to payment'

  const drawer = (
    <>
      {itemCount > 0 && !open && !hideStickyCartBar ? (
        <div className="fixed inset-x-4 bottom-4 z-30 isolate md:inset-x-auto md:right-6 md:w-full md:max-w-md">
          <Card
            className="gap-0 py-0 shadow-[0_24px_48px_rgba(15,23,42,0.22)] [backdrop-filter:none] [transform:translateZ(0)]"
            style={{
              borderColor: brandColors?.primary ?? 'var(--primary)',
              background: brandColors
                ? `linear-gradient(135deg, ${brandColors.primary}, ${brandColors.accent})`
                : 'var(--primary)',
              color: brandColors?.primaryForeground ?? 'var(--primary-foreground)',
            }}
          >
            <CardContent className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6">
              <div className="flex items-center gap-4">
                <div className="rounded-[var(--radius)] border border-white/20 bg-white/10 p-2 text-primary-foreground">
                  <ShoppingBag className="h-5 w-5" />
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-semibold text-primary-foreground">
                    {itemCount} item{itemCount === 1 ? '' : 's'} in cart
                  </div>
                  <div className="text-sm text-primary-foreground/80">
                    Total so far {formatPrice(subtotal)}
                  </div>
                </div>
              </div>
              <Button
                className="min-h-11 border border-white/20 bg-white text-primary hover:bg-white/90"
                style={{
                  color: brandColors?.primary ?? 'var(--primary)',
                }}
                onClick={onOpen}
              >
                View cart
              </Button>
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
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ type: 'spring', stiffness: 280, damping: 28 }}
            >
              <div className="shrink-0 flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-4 sm:px-6 sm:py-6">
                <div>
                  {otpPhone && !paymentSession ? (
                    <button
                      type="button"
                      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                      onClick={handleEditPhone}
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Confirm your number
                    </button>
                  ) : checkoutMode ? (
                    <div className="flex items-center gap-3">
                      {theme.logoUrl ? (
                        <img
                          src={theme.logoUrl}
                          alt={theme.appTitle}
                          className="h-7 w-auto max-w-[80px] shrink-0 object-contain"
                        />
                      ) : null}
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                          Your order at
                        </div>
                        <h2
                          className="text-lg font-semibold"
                          style={{ fontFamily: 'var(--font-heading)' }}
                        >
                          {theme.appTitle}
                        </h2>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="text-xs font-medium uppercase tracking-[0.12em] text-neutral-500">
                        Cart
                      </div>
                      <h2
                        className="mt-2 text-2xl text-black"
                        style={{ fontFamily: 'var(--font-heading)' }}
                      >
                        Your order
                      </h2>
                    </>
                  )}
                </div>
                <Button type="button" variant="ghost" size="icon-sm" onClick={handleClose}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="flex-1 space-y-6 overflow-y-auto bg-white px-4 py-4 sm:px-6 sm:py-6">
                {items.length === 0 ? (
                  <Card
                    size="sm"
                    className="border border-dashed border-border bg-background shadow-none"
                  >
                    <CardContent className="flex min-h-48 flex-col items-center justify-center gap-4 px-6 py-12 text-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-card text-muted-foreground">
                        <UtensilsCrossed className="h-5 w-5" />
                      </div>
                      <div className="grid gap-2">
                        <div
                          className="text-xl font-semibold text-foreground"
                          style={{ fontFamily: 'var(--font-heading)' }}
                        >
                          Your cart is empty
                        </div>
                        <div className="text-sm leading-6 text-muted-foreground">
                          Add a few favorites to start your pickup order.
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : null}

                {/* OTP step replaces all checkout content */}
                {otpPhone && !paymentSession ? (
                  <CustomerOtpStep
                    phone={otpPhone}
                    sending={isSendingOtp}
                    verifying={isVerifyingOtp || isPreparingPayment}
                    errorMessage={otpError}
                    brandColors={brandColors}
                    onCodeChange={setOtpCode}
                    onEditPhone={handleEditPhone}
                    onResend={() => void handleResendOtp()}
                    onVerify={() => void handleVerifyOtp()}
                  />
                ) : !checkoutMode ? (
                  items.map((item) => (
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
                              {item.variantName ?? 'Standard'}
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
                              <div className="mt-2 text-xs text-muted-foreground">
                                Note: {item.notes}
                              </div>
                            ) : null}
                          </div>

                          <div className="text-right">
                            <div className="font-semibold text-foreground">
                              {formatPrice(cartLineTotal(item))}
                            </div>
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
                          <span className="min-w-8 text-center text-sm font-semibold text-foreground">
                            {item.quantity}
                          </span>
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
                ) : (
                  <div className="space-y-6">
                    {/* Loyalty new-member banner */}
                    {showLoyaltyBanner ? (
                      <div
                        className="rounded-[var(--radius)] px-4 py-4"
                        style={{
                          background: brandColors
                            ? `linear-gradient(135deg, ${brandColors.primary}18, ${brandColors.accent}12)`
                            : 'var(--primary-foreground)',
                          borderLeft: `3px solid ${brandColors?.primary ?? 'var(--primary)'}`,
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <Sparkles
                            className="mt-0.5 h-4 w-4 shrink-0"
                            style={{ color: brandColors?.primary ?? 'var(--primary)' }}
                          />
                          <div>
                            <div className="text-sm font-semibold text-foreground">
                              10% off your first order
                            </div>
                            <div className="mt-1 text-xs text-muted-foreground">
                              Enter your number to unlock your new-member discount and automatically
                              join rewards
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    <Card size="sm" className="gap-4 border border-border/80 bg-card shadow-sm">
                      <CardHeader className="gap-2">
                        <Badge
                          variant="outline"
                          className="border-border bg-background text-muted-foreground"
                        >
                          Fulfillment
                        </Badge>
                        <CardTitle style={{ fontFamily: 'var(--font-heading)' }}>
                          {fulfillmentType === 'DELIVERY' ? 'Delivery' : 'Pickup'}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="grid gap-4">
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => setFulfillmentType('PICKUP')}
                            style={{ cursor: 'pointer' }}
                            className={cn(
                              'rounded-[var(--radius)] border px-4 py-4 text-left transition-colors',
                              fulfillmentType === 'PICKUP'
                                ? 'border-primary/20 bg-primary/10'
                                : 'border-border bg-background hover:bg-muted/40'
                            )}
                          >
                            <div className="font-semibold text-foreground">Pickup</div>
                            <div className="mt-1 text-sm text-muted-foreground">
                              Ready at the counter
                            </div>
                          </button>
                          <button
                            type="button"
                            onClick={() => setFulfillmentType('DELIVERY')}
                            style={{ cursor: 'pointer' }}
                            className={cn(
                              'rounded-[var(--radius)] border px-4 py-4 text-left transition-colors',
                              fulfillmentType === 'DELIVERY'
                                ? 'border-primary/20 bg-primary/10'
                                : 'border-border bg-background hover:bg-muted/40'
                            )}
                          >
                            <div className="font-semibold text-foreground">Delivery</div>
                            <div className="mt-1 text-sm text-muted-foreground">
                              Delivered to your door
                            </div>
                          </button>
                        </div>

                        {fulfillmentType === 'DELIVERY' ? (
                          <div className="grid gap-2">
                            <Label htmlFor="checkout-address">Delivery address</Label>
                            <Input
                              id="checkout-address"
                              value={deliveryAddress}
                              onChange={(event) => setDeliveryAddress(event.target.value)}
                              onBlur={() => setAddressTouched(true)}
                              disabled={Boolean(paymentSession)}
                              placeholder="123 Main St, Apt 4B"
                            />
                            {showAddressError ? (
                              <div className="text-sm text-red-600">{addressError}</div>
                            ) : null}
                          </div>
                        ) : null}
                      </CardContent>
                    </Card>

                    <Card size="sm" className="gap-4 border border-border/80 bg-card shadow-sm">
                      <CardHeader className="gap-2">
                        <Badge
                          variant="outline"
                          className="border-border bg-background text-muted-foreground"
                        >
                          {fulfillmentType === 'DELIVERY' ? 'Delivery details' : 'Pickup details'}
                        </Badge>
                        <CardTitle style={{ fontFamily: 'var(--font-heading)' }}>
                          Customer details
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="grid gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="checkout-name">Name</Label>
                          <Input
                            id="checkout-name"
                            value={customerName}
                            onChange={(event) => onCustomerNameChange(event.target.value)}
                            onBlur={() => setNameTouched(true)}
                            disabled={Boolean(paymentSession)}
                            placeholder="Customer name"
                          />
                          {showNameError ? (
                            <div className="text-sm text-red-600">{nameError}</div>
                          ) : null}
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="checkout-phone">Phone</Label>
                          <Input
                            id="checkout-phone"
                            value={customerPhone}
                            onChange={(event) => onCustomerPhoneChange(event.target.value)}
                            onBlur={() => setPhoneTouched(true)}
                            disabled={Boolean(paymentSession) || Boolean(otpPhone)}
                            placeholder="(555) 555-5555"
                          />
                          <div className="text-xs text-muted-foreground">
                            By providing your phone number, you agree to receive SMS text messages
                            from this restaurant powered by EasyMenu, including order confirmations
                            and order status updates. Message and data rates may apply. Message
                            frequency varies by order activity. Reply STOP to opt out, HELP for
                            help.{" "}
                            <a href="/sms-policy/" className="underline">
                              View our SMS Policy.
                            </a>
                          </div>
                          {showPhoneError ? (
                            <div className="text-sm text-red-600">{phoneError}</div>
                          ) : null}

                          {/* Loyalty benefits bullets below phone input */}
                          {showLoyaltyBanner ? (
                            <ul className="mt-1 space-y-1.5">
                              {NEW_MEMBER_BULLETS.map((bullet) => (
                                <li
                                  key={bullet}
                                  className="flex items-center gap-2 text-xs text-muted-foreground"
                                >
                                  <CheckCircle2
                                    className="h-3.5 w-3.5 shrink-0"
                                    style={{ color: brandColors?.primary ?? 'var(--primary)' }}
                                  />
                                  {bullet}
                                </li>
                              ))}
                            </ul>
                          ) : null}
                        </div>
                        <div className="grid gap-2">
                          <div className="flex items-center justify-between gap-3">
                            <Label htmlFor="checkout-note">Order note</Label>
                            <div className="text-xs text-muted-foreground">
                              {orderNotes.length}/{ORDER_NOTE_MAX_LENGTH}
                            </div>
                          </div>
                          <textarea
                            id="checkout-note"
                            value={orderNotes}
                            onChange={(event) =>
                              onOrderNotesChange(event.target.value.slice(0, ORDER_NOTE_MAX_LENGTH))
                            }
                            rows={3}
                            maxLength={ORDER_NOTE_MAX_LENGTH}
                            disabled={Boolean(paymentSession)}
                            className="min-h-24 w-full rounded-[var(--radius)] border border-input bg-background px-4 py-4 text-sm text-foreground shadow-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
                            placeholder={
                              fulfillmentType === 'DELIVERY'
                                ? 'Optional note for delivery'
                                : 'Optional note for pickup'
                            }
                          />
                        </div>
                      </CardContent>
                    </Card>

                    {/* Redemption section for returning customers with points */}
                    {showRedemptionSection ? (
                      <Card size="sm" className="gap-4 border border-border/80 bg-card shadow-sm">
                        <CardHeader className="gap-2">
                          <Badge
                            variant="outline"
                            className="border-border bg-background text-muted-foreground"
                          >
                            Rewards
                          </Badge>
                          <CardTitle style={{ fontFamily: 'var(--font-heading)' }}>
                            Apply a reward
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">
                            You have {loyaltyAccount!.balance.toLocaleString()} pts available
                          </p>
                        </CardHeader>
                        <CardContent className="grid gap-3">
                          {redeemableTiers.map((tier) => (
                            <button
                              key={tier.id}
                              type="button"
                              onClick={() =>
                                setSelectedTierId(tier.id === selectedTierId ? null : tier.id)
                              }
                              className={cn(
                                'flex items-center gap-3 rounded-[var(--radius)] border px-4 py-3 text-left transition-colors',
                                tier.id === selectedTierId
                                  ? 'border-primary/30 bg-primary/8'
                                  : 'border-border bg-background hover:bg-muted/40'
                              )}
                              style={
                                tier.id === selectedTierId
                                  ? {
                                      borderColor: `${brandColors?.primary ?? 'var(--primary)'}40`,
                                      background: `${brandColors?.primary ?? 'var(--primary)'}0d`,
                                    }
                                  : undefined
                              }
                            >
                              <div
                                className="h-4 w-4 shrink-0 rounded-full border-2 transition-colors"
                                style={
                                  tier.id === selectedTierId
                                    ? {
                                        borderColor: brandColors?.primary ?? 'var(--primary)',
                                        background: brandColors?.primary ?? 'var(--primary)',
                                      }
                                    : { borderColor: 'var(--border)' }
                                }
                              />
                              <div className="flex-1">
                                <div className="font-medium text-foreground">{tier.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {tier.pointsCost.toLocaleString()} pts
                                </div>
                              </div>
                              <div className="font-semibold text-foreground">
                                -{formatPrice(tier.discountCents)}
                              </div>
                            </button>
                          ))}
                          {redemptionError ? (
                            <div className="rounded-[var(--radius)] border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-foreground">
                              {redemptionError}
                            </div>
                          ) : null}
                        </CardContent>
                      </Card>
                    ) : null}

                    {/* Applied redemption badge */}
                    {appliedRedemptionCents > 0 ? (
                      <div
                        className="flex items-center gap-2 rounded-[var(--radius)] px-4 py-3"
                        style={{
                          background: `${brandColors?.primary ?? 'var(--primary)'}12`,
                          borderLeft: `3px solid ${brandColors?.primary ?? 'var(--primary)'}`,
                        }}
                      >
                        <CheckCircle2
                          className="h-4 w-4 shrink-0"
                          style={{ color: brandColors?.primary ?? 'var(--primary)' }}
                        />
                        <span className="text-sm font-medium text-foreground">
                          Reward applied: -{formatPrice(appliedRedemptionCents)}
                        </span>
                      </div>
                    ) : null}

                    {paymentSession ? (
                      <Card size="sm" className="gap-4 border border-border/80 bg-card shadow-sm">
                        <CardHeader className="gap-2">
                          <Badge
                            variant="outline"
                            className="border-border bg-background text-muted-foreground"
                          >
                            Payment
                          </Badge>
                          <CardTitle style={{ fontFamily: 'var(--font-heading)' }}>
                            Card payment
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-4">
                          <StripeCheckoutForm
                            publishableKey={stripePublishableKey}
                            stripeAccountId={paymentSession.stripeAccountId}
                            clientSecret={paymentSession.clientSecret}
                            customerName={trimmedName}
                            submitting={submitting}
                            onPaymentConfirmed={async () => {
                              await onPaymentConfirmed(paymentSession)
                            }}
                          />
                        </CardContent>
                      </Card>
                    ) : null}

                    <Card size="sm" className="gap-4 border border-border/80 bg-card shadow-sm">
                      <CardHeader className="gap-2">
                        <Badge
                          variant="outline"
                          className="border-border bg-background text-muted-foreground"
                        >
                          Order summary
                        </Badge>
                        <CardTitle style={{ fontFamily: 'var(--font-heading)' }}>
                          What you're ordering
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {items.map((item) => (
                          <div
                            key={item.lineId}
                            className="flex items-start justify-between gap-4 text-sm"
                          >
                            <div>
                              <div className="font-medium text-foreground">
                                {item.quantity} × {item.name}
                              </div>
                              <div className="mt-2 text-xs text-muted-foreground">
                                {item.variantName ?? 'Standard'}
                              </div>
                            </div>
                            <div className="font-medium text-foreground">
                              {formatPrice(cartLineTotal(item))}
                            </div>
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
                      <span className="font-semibold text-foreground">
                        {formatPrice(taxEstimate)}
                      </span>
                    </div>
                  ) : null}
                  {previewDiscountCents > 0 ? (
                    <div className="flex items-center justify-between text-sm">
                      <span style={{ color: brandColors?.primary ?? 'var(--primary)' }}>
                        {appliedRedemptionCents > 0
                          ? 'Reward discount'
                          : `${selectedTier?.name ?? 'Reward'} preview`}
                      </span>
                      <span
                        className="font-semibold"
                        style={{ color: brandColors?.primary ?? 'var(--primary)' }}
                      >
                        -{formatPrice(previewDiscountCents)}
                      </span>
                    </div>
                  ) : null}
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>
                      {checkoutMode
                        ? 'Estimated total'
                        : `${itemCount} item${itemCount === 1 ? '' : 's'}`}
                    </span>
                    {checkoutMode ? (
                      <span className="text-base font-semibold text-foreground">
                        {formatPrice(totalEstimate)}
                      </span>
                    ) : items.length > 0 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={onClear}
                        className="h-auto px-0 text-muted-foreground hover:text-foreground"
                      >
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
                      Continue to checkout
                    </Button>
                  ) : otpPhone &&
                    !paymentSession ? /* OTP mode — buttons are inside CustomerOtpStep */
                  null : (
                    <div className="grid gap-3">
                      {!paymentSession ? (
                        <>
                          <Button
                            className="min-h-11 w-full justify-center"
                            disabled={
                              !hasDraftDetails ||
                              submitting ||
                              isPreparingPayment ||
                              isSendingOtp ||
                              isVerifyingOtp ||
                              isRedeeming ||
                              Boolean(otpPhone)
                            }
                            style={
                              brandColors && hasDraftDetails
                                ? {
                                    background: `linear-gradient(135deg, ${brandColors.primary}, ${brandColors.accent})`,
                                    color: brandColors.primaryForeground,
                                    border: 'none',
                                  }
                                : undefined
                            }
                            onClick={() => void handleCheckoutSubmit()}
                          >
                            {ctaLabel}
                          </Button>

                          {/* Skip redemption option */}
                          {showRedemptionSection && selectedTierId ? (
                            <button
                              type="button"
                              className="text-sm text-muted-foreground underline"
                              onClick={() => {
                                setSelectedTierId(null)
                                void handleCheckoutSubmit()
                              }}
                            >
                              Skip — pay {formatPrice(subtotal + taxEstimate)}
                            </button>
                          ) : null}
                        </>
                      ) : null}
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          const hadPaymentSession = Boolean(paymentSession)
                          setPaymentSession(null)
                          setCheckoutMode(hadPaymentSession)
                          if (!hadPaymentSession) {
                            setFulfillmentType('PICKUP')
                            setDeliveryAddress('')
                            setAddressTouched(false)
                            setSubmitAttempted(false)
                          }
                        }}
                      >
                        {paymentSession ? 'Back to details' : 'Back to cart'}
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

  if (typeof document === 'undefined') {
    return drawer
  }

  return createPortal(drawer, document.body)
}
