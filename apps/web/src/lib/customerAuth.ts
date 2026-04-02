const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api"

export type CustomerAccessTokenPayload = {
  sub: string
  customerId: string
  restaurantId: string
  phone: string
  type: "customer-access"
}

function decodeBase64Url(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=")
  return atob(padded)
}

function parseError(status: number, body: { error?: string } | null, fallback: string) {
  return body?.error ?? `${fallback} (${status})`
}

export function readCustomerAccessTokenPayload(token: string): CustomerAccessTokenPayload {
  const [, payload] = token.split(".")
  if (!payload) {
    throw new Error("Invalid customer access token")
  }

  return JSON.parse(decodeBase64Url(payload)) as CustomerAccessTokenPayload
}

export async function requestCustomerOtp(tenantSlug: string, phone: string) {
  const response = await fetch(`${API_BASE_URL}/auth/customer/request-otp`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "x-tenant-slug": tenantSlug,
    },
    body: JSON.stringify({ phone }),
  })

  const body = (await response.json().catch(() => null)) as { error?: string; sent?: boolean } | null

  if (!response.ok) {
    throw new Error(parseError(response.status, body, "Failed to send verification code"))
  }

  return body
}

export async function verifyCustomerOtp(tenantSlug: string, phone: string, code: string) {
  const response = await fetch(`${API_BASE_URL}/auth/customer/verify-otp`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "x-tenant-slug": tenantSlug,
    },
    body: JSON.stringify({ phone, code }),
  })

  const body = (await response.json().catch(() => null)) as { error?: string; accessToken?: string } | null

  if (!response.ok || !body?.accessToken) {
    throw new Error(parseError(response.status, body, "Failed to verify code"))
  }

  return {
    accessToken: body.accessToken,
    payload: readCustomerAccessTokenPayload(body.accessToken),
  }
}

export async function refreshCustomerSession(tenantSlug: string) {
  const response = await fetch(`${API_BASE_URL}/auth/customer/refresh`, {
    method: "POST",
    credentials: "include",
    headers: {
      "x-tenant-slug": tenantSlug,
    },
  })

  const body = (await response.json().catch(() => null)) as { error?: string; accessToken?: string } | null

  if (!response.ok || !body?.accessToken) {
    throw new Error(parseError(response.status, body, "Failed to restore customer session"))
  }

  return {
    accessToken: body.accessToken,
    payload: readCustomerAccessTokenPayload(body.accessToken),
  }
}
