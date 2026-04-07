const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api"

export type OnboardingMeResponse = {
  matched: boolean
  tenantSlug: string | null
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
    `${API_BASE_URL}/v1/onboarding/check-slug/${encodeURIComponent(slug)}`,
  )

  const body = (await response.json().catch(() => null)) as SlugAvailability | null
  if (!response.ok || !body) {
    throw new Error("Failed to validate slug")
  }

  return body
}

export async function registerRestaurantOnboarding(input: {
  clerkUserId: string
  email: string
  restaurantName: string
  slug: string
  token: string
}) {
  const response = await fetch(`${API_BASE_URL}/v1/onboarding/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${input.token}`,
    },
    body: JSON.stringify({
      clerkUserId: input.clerkUserId,
      email: input.email,
      restaurantName: input.restaurantName,
      slug: input.slug,
    }),
  })

  const body = (await response.json().catch(() => null)) as
    | {
        error?: string
        restaurant?: { id: string; name: string; slug: string }
        tenantSlug?: string
      }
    | null

  if (!response.ok || !body?.tenantSlug) {
    throw new Error(body?.error ?? `Failed to register restaurant (${response.status})`)
  }

  return body
}
