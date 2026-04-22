const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api"

export type LoyaltyTier = {
  id: string
  name: string
  pointsCost: number
  discountCents: number
  sortOrder: number
}

export type CustomerLoyaltyAccount = {
  active: boolean
  balance: number
  lifetimePts: number
  isNew: boolean
  earnRate: number
  redeemRate: number
  minRedeem: number
  tiers: LoyaltyTier[]
  allTiers: LoyaltyTier[]
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

export async function redeemLoyaltyPoints(input: {
  tenantSlug: string
  accessToken: string
  tierId: string
}) {
  const response = await fetch(`${API_BASE_URL}/v1/loyalty/redeem`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "x-tenant-slug": input.tenantSlug,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ tierId: input.tierId }),
  })

  const body = (await response.json().catch(() => null)) as
    | ({ error?: string } & Partial<{
        tier: LoyaltyTier
        discountCents: number
        newBalance: number
      }>)
    | null

  if (!response.ok || !body?.tier || typeof body.discountCents !== "number") {
    throw new Error(parseError(response.status, body, "Failed to redeem loyalty points"))
  }

  return body as { tier: LoyaltyTier; discountCents: number; newBalance: number }
}
