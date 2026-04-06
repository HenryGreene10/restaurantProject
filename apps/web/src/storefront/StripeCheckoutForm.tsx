import { useMemo, useState } from "react"
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js"
import { loadStripe } from "@stripe/stripe-js"

import { Button } from "@/components/ui/button"

type StripeCheckoutFormProps = {
  publishableKey: string
  stripeAccountId: string
  clientSecret: string
  customerName: string
  submitting?: boolean
  onPaymentConfirmed: () => Promise<void>
}

function StripeCheckoutInner({
  customerName,
  submitting = false,
  onPaymentConfirmed,
}: Omit<StripeCheckoutFormProps, "publishableKey" | "stripeAccountId" | "clientSecret">) {
  const stripe = useStripe()
  const elements = useElements()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function handleSubmit() {
    if (!stripe || !elements) {
      setErrorMessage("Payment form is still loading")
      return
    }

    setErrorMessage(null)

    const result = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
      confirmParams: {
        payment_method_data: {
          billing_details: {
            name: customerName,
          },
        },
      },
    })

    if (result.error) {
      setErrorMessage(result.error.message ?? "Payment failed")
      return
    }

    const status = result.paymentIntent?.status
    if (status !== "succeeded" && status !== "processing") {
      setErrorMessage("Payment did not complete")
      return
    }

    await onPaymentConfirmed()
  }

  return (
    <div className="grid gap-4">
      <PaymentElement />
      {errorMessage ? (
        <div className="rounded-[var(--radius)] border border-destructive/20 bg-destructive/10 px-4 py-4 text-sm text-foreground">
          {errorMessage}
        </div>
      ) : null}
      <Button
        type="button"
        className="min-h-11 w-full justify-center"
        disabled={!stripe || !elements || submitting}
        onClick={() => void handleSubmit()}
      >
        {submitting ? "Finalizing order…" : "Pay and place order"}
      </Button>
    </div>
  )
}

export function StripeCheckoutForm({
  publishableKey,
  stripeAccountId,
  clientSecret,
  customerName,
  submitting = false,
  onPaymentConfirmed,
}: StripeCheckoutFormProps) {
  const stripePromise = useMemo(
    () => loadStripe(publishableKey, { stripeAccount: stripeAccountId }),
    [publishableKey, stripeAccountId],
  )

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <StripeCheckoutInner
        customerName={customerName}
        submitting={submitting}
        onPaymentConfirmed={onPaymentConfirmed}
      />
    </Elements>
  )
}
