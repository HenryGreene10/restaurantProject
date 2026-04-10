export type MenuVariant = {
  id: string
  name: string
  priceCents: number
  isDefault: boolean
}

export type ModifierOption = {
  id: string
  name: string
  priceDeltaCents: number
}

export type ItemModifierGroup = {
  id: string
  isRequired: boolean
  minSelections: number
  maxSelections: number | null
  group: {
    id: string
    name: string
    selection: "SINGLE" | "MULTIPLE"
    options: ModifierOption[]
  }
}

export type MenuItem = {
  id: string
  name: string
  description: string | null
  basePriceCents: number
  photoUrl?: string | null
  visibility: "AVAILABLE" | "SOLD_OUT" | "HIDDEN" | "SCHEDULED"
  tags: string[]
  prepTimeMinutes: number | null
  isFeatured: boolean
  variants: MenuVariant[]
  itemModifierGroups: ItemModifierGroup[]
}

export type MenuCategory = {
  id: string
  name: string
  sortOrder: number
  visibility: "AVAILABLE" | "SOLD_OUT" | "HIDDEN" | "SCHEDULED"
  categoryItems: Array<{
    id: string
    sortOrder: number
    item: MenuItem
  }>
}

export type MenuResponse = {
  brandConfig?: {
    config?: Record<string, unknown>
  } | null
  brand?: {
    config?: Record<string, unknown>
  } | Record<string, unknown> | null
  categories: MenuCategory[]
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api"

export async function fetchTenantMenu(tenantSlug: string) {
  const response = await fetch(`${API_BASE_URL}/menu`, {
    cache: "no-store",
    headers: {
      "x-tenant-slug": tenantSlug,
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to load tenant menu (${response.status})`)
  }

  return (await response.json()) as MenuResponse
}
