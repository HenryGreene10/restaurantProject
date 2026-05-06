const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ??
  (window.location.hostname.endsWith('easymenu.website') ? 'https://api.easymenu.website' : '/api')
export const SETUP_SESSION_STORAGE_KEY = 'easymenu.setupSessionId'

export type OnboardingMeResponse = {
  matched: boolean
  tenantSlug: string | null
  subscriptionStatus?: 'PENDING' | 'ACTIVE' | 'CANCELLED'
  restaurant?: { id: string; name: string; slug: string }
}

export type SlugAvailability = {
  slug: string
  available: boolean
  error: string | null
}

export async function fetchOnboardingMe(token: string) {
  const response = await fetch(`${API_BASE_URL}/v1/onboarding/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  const body = (await response.json().catch(() => null)) as
    | (OnboardingMeResponse & { error?: string })
    | null

  if (!response.ok || !body) {
    throw new Error(body?.error ?? `Failed to load onboarding state (${response.status})`)
  }

  return body
}

export async function checkSlugAvailability(slug: string) {
  const response = await fetch(
    `${API_BASE_URL}/v1/onboarding/check-slug/${encodeURIComponent(slug)}`
  )

  const body = (await response.json().catch(() => null)) as SlugAvailability | null
  if (!response.ok || !body) {
    throw new Error('Failed to validate slug')
  }

  return body
}

export async function createSetupSession(token: string) {
  const response = await fetch(`${API_BASE_URL}/v1/onboarding/create-setup-session`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })

  const body = (await response.json().catch(() => null)) as { url?: string; error?: string } | null

  if (!response.ok || !body?.url) {
    throw new Error(body?.error ?? `Failed to create setup session (${response.status})`)
  }

  return body.url
}

export async function createSignupPaymentSession() {
  const response = await fetch(`${API_BASE_URL}/v1/onboarding/create-signup-payment-session`, {
    method: 'POST',
  })

  const body = (await response.json().catch(() => null)) as { url?: string; error?: string } | null

  if (!response.ok || !body?.url) {
    throw new Error(body?.error ?? `Failed to create setup payment session (${response.status})`)
  }

  return body.url
}

export async function registerRestaurantOnboarding(input: {
  clerkUserId: string
  email: string
  restaurantName: string
  slug: string
  setupSessionId: string
  token: string
}) {
  const response = await fetch(`${API_BASE_URL}/v1/onboarding/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${input.token}`,
    },
    body: JSON.stringify({
      clerkUserId: input.clerkUserId,
      email: input.email,
      restaurantName: input.restaurantName,
      slug: input.slug,
      setupSessionId: input.setupSessionId,
    }),
  })

  const body = (await response.json().catch(() => null)) as {
    error?: string
    restaurant?: { id: string; name: string; slug: string }
    tenantSlug?: string
  } | null

  if (!response.ok || !body?.tenantSlug) {
    throw new Error(body?.error ?? `Failed to register restaurant (${response.status})`)
  }

  return body
}

export function readSetupSessionId() {
  const fromUrl = new URLSearchParams(window.location.search).get('setup_session_id')
  if (fromUrl) {
    window.localStorage.setItem(SETUP_SESSION_STORAGE_KEY, fromUrl)
    return fromUrl
  }

  return window.localStorage.getItem(SETUP_SESSION_STORAGE_KEY)
}

export function clearSetupSessionId() {
  window.localStorage.removeItem(SETUP_SESSION_STORAGE_KEY)
}
