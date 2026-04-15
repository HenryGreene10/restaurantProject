const STOREFRONT_TIMEZONE = "America/New_York"
const weekdayFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  timeZone: STOREFRONT_TIMEZONE,
})
const timeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: STOREFRONT_TIMEZONE,
})
const weekdays = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const

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

export type MenuVisibility = "AVAILABLE" | "SOLD_OUT" | "HIDDEN" | "SCHEDULED" | string

export type MenuItem = {
  id: string
  name: string
  nameLocalized?: string | null
  description: string | null
  basePriceCents: number
  photoUrl?: string | null
  visibility: MenuVisibility
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
  visibility?: MenuVisibility
  availableFrom?: string | null
  availableUntil?: string | null
  daysOfWeek?: string[] | null
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

function localMinutesInTimezone(value: Date) {
  const parts = timeFormatter.formatToParts(value)
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0")
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0")
  return hour * 60 + minute
}

function localWeekdayInTimezone(value: Date) {
  return weekdayFormatter.format(value).toLowerCase()
}

function previousWeekday(day: string) {
  const index = weekdays.indexOf(day as (typeof weekdays)[number])
  if (index === -1) {
    return day
  }

  return weekdays[(index + weekdays.length - 1) % weekdays.length]
}

function parseStoredUtcTime(value?: string | null) {
  if (!value) {
    return null
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  return parsed.getUTCHours() * 60 + parsed.getUTCMinutes()
}

export function isCategoryAvailableNow(category: MenuCategory): boolean {
  if (category.visibility !== "SCHEDULED") {
    return true
  }

  if (!category.availableFrom && !category.availableUntil) {
    return true
  }

  const now = new Date()
  const currentMinutes = localMinutesInTimezone(now)
  const currentDay = localWeekdayInTimezone(now)
  const fromMinutes = parseStoredUtcTime(category.availableFrom) ?? 0
  const untilMinutes = parseStoredUtcTime(category.availableUntil) ?? 24 * 60
  const isOvernightWindow = fromMinutes > untilMinutes
  const scheduledDays = category.daysOfWeek
    ?.map((day) => day.trim().toLowerCase())
    .filter(Boolean)

  if (scheduledDays && scheduledDays.length > 0) {
    const effectiveDay =
      isOvernightWindow && currentMinutes < untilMinutes
        ? previousWeekday(currentDay)
        : currentDay

    if (!scheduledDays.includes(effectiveDay)) {
      return false
    }
  }

  if (isOvernightWindow) {
    return currentMinutes >= fromMinutes || currentMinutes < untilMinutes
  }

  return currentMinutes >= fromMinutes && currentMinutes < untilMinutes
}

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

  const payload = (await response.json()) as MenuResponse
  const breakfastSpecials = payload.categories.find((category) => category.name === "Breakfast Specials")

  console.log("[storefront] /menu raw response", payload)
  console.log("[storefront] Breakfast Specials from API", breakfastSpecials)

  return payload
}
