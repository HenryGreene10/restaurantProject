const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api"

export type CustomerLoyaltyAccount = {
  balance: number
  lifetimePts: number
  isNew: boolean
  earnRate: number
  redeemRate: number
  minRedeem: number
  tiers: Array<{
    id: string
    name: string
    pointsCost: number
    discountCents: number
    sortOrder: number
  }>
  allTiers: Array<{
    id: string
    name: string
    pointsCost: number
    discountCents: number
    sortOrder: number
  }>
  history: Array<{
    orderId: string | null
    type: string
    delta: number
    description: string | null
    createdAt: string
  }>
}

function parseError(status: number, body: { error?: string } | null, fallback: string) {
  return body?.error ?? `${fallback} (${status})`
}

export async function fetchCustomerLoyaltyAccount(input: {
  tenantSlug: string
  accessToken: string
}) {
  const response = await fetch(`${API_BASE_URL}/v1/loyalty/account`, {
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "x-tenant-slug": input.tenantSlug,
    },
  })

  const body = (await response.json().catch(() => null)) as
    | ({ error?: string } & Partial<CustomerLoyaltyAccount>)
    | null

  if (!response.ok || !body?.history || typeof body.balance !== "number") {
    throw new Error(parseError(response.status, body, "Failed to load loyalty account"))
  }

  return body as CustomerLoyaltyAccount
}
