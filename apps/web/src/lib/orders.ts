import type { CartItem } from '../storefront/cartStore'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'

export type CustomerOrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY'
  | 'COMPLETED'
  | 'CANCELLED'

export type CustomerOrder = {
  id: string
  orderNumber: number
  status: CustomerOrderStatus
  paymentStatus: string
  fulfillmentType: string
  subtotalCents: number
  taxCents: number
  tipCents: number
  discountCents: number
  totalCents: number
  notes: string | null
  pickupTime: string | null
  estimatedFulfillmentMinutes: number | null
  deliveryAddressSnapshot: unknown | null
  createdAt: string
  updatedAt: string
  customerNameSnapshot: string | null
  customerPhoneSnapshot: string | null
  items: Array<{
    id: string
    name: string
    variantName: string | null
    quantity: number
    unitPriceCents: number
    linePriceCents: number
    notes: string | null
    modifierSelections: Array<{
      id: string
      groupName: string
      optionName: string
      priceDeltaCents: number
      portion: string
    }>
  }>
  statusEvents: Array<{
    id: string
    fromStatus: CustomerOrderStatus | null
    toStatus: CustomerOrderStatus
    source: string
    createdAt: string
  }>
}

type CreateOrderResponse = {
  id: string
  orderNumber: number
  status: CustomerOrderStatus
}

function authHeaders(tenantSlug: string, accessToken?: string | null, includeJson = false) {
  return {
    ...(includeJson ? { 'Content-Type': 'application/json' } : {}),
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    'x-tenant-slug': tenantSlug,
  }
}

function parseError(status: number, body: { error?: string } | null, fallback: string) {
  return body?.error ?? `${fallback} (${status})`
}

export async function createPickupOrder(input: {
  tenantSlug: string
  accessToken?: string | null
  customerName: string
  customerPhone: string
  orderNotes: string | null
  items: CartItem[]
}) {
  const response = await fetch(`${API_BASE_URL}/v1/orders`, {
    method: 'POST',
    headers: authHeaders(input.tenantSlug, input.accessToken, true),
    body: JSON.stringify({
      type: 'PICKUP',
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      notes: input.orderNotes,
      items: input.items.map((item) => ({
        itemId: item.itemId,
        variantName: item.variantName,
        quantity: item.quantity,
        unitPriceCents: item.unitPriceCents,
        notes: item.notes,
        modifiers: item.modifiers.map((modifier) => ({
          groupName: modifier.groupName,
          optionName: modifier.optionName,
          priceDeltaCents: modifier.priceDeltaCents,
        })),
      })),
    }),
  })

  const body = (await response.json().catch(() => null)) as
    | ({ error?: string } & Partial<CreateOrderResponse>)
    | null

  if (!response.ok || !body?.id) {
    throw new Error(parseError(response.status, body, 'Failed to place order'))
  }

  return body as CreateOrderResponse
}

export async function fetchCustomerOrder(input: {
  tenantSlug: string
  accessToken: string
  orderId: string
}) {
  const response = await fetch(`${API_BASE_URL}/v1/orders/${input.orderId}`, {
    headers: authHeaders(input.tenantSlug, input.accessToken),
  })

  const body = (await response.json().catch(() => null)) as
    | ({ error?: string } & Partial<CustomerOrder>)
    | null

  if (!response.ok || !body?.id) {
    throw new Error(parseError(response.status, body, 'Failed to load order'))
  }

  return body as CustomerOrder
}

export async function fetchPublicOrderStatus(input: { tenantSlug: string; orderId: string }) {
  const response = await fetch(`${API_BASE_URL}/v1/orders/${input.orderId}/status`, {
    headers: {
      'x-tenant-slug': input.tenantSlug,
    },
  })

  const body = (await response.json().catch(() => null)) as
    | ({ error?: string } & Partial<CustomerOrder>)
    | null

  if (!response.ok || !body?.id) {
    throw new Error(parseError(response.status, body, 'Failed to load order status'))
  }

  return body as CustomerOrder
}
