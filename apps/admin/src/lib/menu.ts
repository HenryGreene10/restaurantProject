import { adminFetchJson, type ClerkTokenGetter } from "./api"

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

export type MenuItem = {
  id: string
  name: string
  nameLocalized?: string | null
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
  restaurant?: {
    id: string
    name: string
    slug: string
  } | null
  brandConfig?: {
    config?: Record<string, unknown>
  } | null
  brand?: {
    config?: Record<string, unknown>
  } | Record<string, unknown> | null
  categories: MenuCategory[]
}

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

export async function fetchTenantMenu(tenantSlug: string, getToken: ClerkTokenGetter) {
  return adminFetchJson<MenuResponse>("/menu", {
    tenantSlug,
    getToken,
  })
}
