import type { CartItem } from "../storefront/cartStore"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api"

function authHeaders(tenantSlug: string, accessToken?: string | null, includeJson = false) {
  return {
    ...(includeJson ? { "Content-Type": "application/json" } : {}),
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    "x-tenant-slug": tenantSlug,
  }
}

function parseError(status: number, body: { error?: string } | null, fallback: string) {
  return body?.error ?? `${fallback} (${status})`
}

export type CheckoutPaymentIntentSession = {
  checkoutSessionId: string
  clientSecret: string
  stripeAccountId: string
  tipCents: number
  discountCents: number
  isNewMember: boolean
}

export type CheckoutStatusResponse = {
  id: string
  status:
    | "PENDING"
    | "REQUIRES_ACTION"
    | "PAYMENT_FAILED"
    | "PAYMENT_SUCCEEDED"
    | "ORDER_CREATED"
    | "EXPIRED"
  orderId: string | null
  paymentIntentId: string | null
  error: string | null
}

export async function createCheckoutPaymentIntent(input: {
  tenantSlug: string
  accessToken?: string | null
  customerName: string
  customerPhone: string
  orderNotes: string | null
  fulfillmentType: "PICKUP" | "DELIVERY"
  deliveryAddress: string | null
  tipCents?: number
  items: CartItem[]
}) {
  const response = await fetch(`${API_BASE_URL}/v1/checkouts/create-payment-intent`, {
    method: "POST",
    headers: authHeaders(input.tenantSlug, input.accessToken, true),
    body: JSON.stringify({
      type: input.fulfillmentType,
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      notes: input.orderNotes,
      deliveryAddress: input.deliveryAddress ?? undefined,
      tipCents: input.tipCents ?? 0,
      items: input.items.map((item) => ({
        itemId: item.itemId,
        variantId: item.variantId,
        variantName: item.variantName,
        quantity: item.quantity,
        notes: item.notes,
        modifiers: item.modifiers.map((modifier) => ({
          groupId: modifier.groupId,
          groupName: modifier.groupName,
          optionId: modifier.optionId,
          optionName: modifier.optionName,
          priceDeltaCents: modifier.priceDeltaCents,
        })),
      })),
    }),
  })

  const body = (await response.json().catch(() => null)) as
    | ({ error?: string } & Partial<CheckoutPaymentIntentSession>)
    | null

  if (!response.ok || !body?.checkoutSessionId || !body.clientSecret || !body.stripeAccountId) {
    throw new Error(parseError(response.status, body, "Failed to prepare payment"))
  }

  return body as CheckoutPaymentIntentSession
}

export async function fetchCheckoutStatus(input: {
  tenantSlug: string
  checkoutSessionId: string
}) {
  const response = await fetch(`${API_BASE_URL}/v1/checkouts/${input.checkoutSessionId}`, {
    headers: {
      "x-tenant-slug": input.tenantSlug,
    },
  })

  const body = (await response.json().catch(() => null)) as
    | ({ error?: string } & Partial<CheckoutStatusResponse>)
    | null

  if (!response.ok || !body?.id || !body.status) {
    throw new Error(parseError(response.status, body, "Failed to load checkout status"))
  }

  return body as CheckoutStatusResponse
}
