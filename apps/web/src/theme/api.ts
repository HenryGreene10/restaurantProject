import type { BrandConfigApiResponse } from "./types"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api"

export async function fetchBrandConfig(tenantSlug: string) {
  const response = await fetch(`${API_BASE_URL}/menu`, {
    headers: {
      "x-tenant-slug": tenantSlug,
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to load tenant brand config (${response.status})`)
  }

  return (await response.json()) as BrandConfigApiResponse
}
