type MenuCategory = {
  id: string
  name: string
  sortOrder?: number
  visibility: string
  availableFrom?: Date | null
  availableUntil?: Date | null
  daysOfWeek?: unknown
  categoryItems: Array<{
    sortOrder?: number
    item: {
      id: string
      name: string
      basePriceCents?: number
      visibility: string
      prepTimeMinutes?: number
      tags?: string[]
    }
  }>
}

type BuildAssistantContextInput = {
  brandConfig: Record<string, unknown> | null
  categories: MenuCategory[]
}

function formatTime(value: Date | null | undefined) {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    return "none"
  }

  return value.toISOString().slice(11, 16)
}

function formatDays(value: unknown) {
  if (!Array.isArray(value) || value.length === 0) {
    return "every day"
  }

  const days = value.filter(
    (entry): entry is string => typeof entry === "string" && Boolean(entry.trim()),
  )
  return days.length ? days.join(",") : "every day"
}

function formatPrice(cents: number | undefined) {
  const value = typeof cents === "number" ? cents / 100 : 0
  return `$${value.toFixed(2)}`
}

function categoryScheduleSummary(category: MenuCategory) {
  const from = formatTime(category.availableFrom)
  const until = formatTime(category.availableUntil)

  if (from === "none" && until === "none") {
    return null
  }

  return `${from}-${until} ${formatDays(category.daysOfWeek)}`
}

export function buildAssistantContext(input: BuildAssistantContextInput) {
  const orderedCategories = input.categories
    .slice()
    .sort((left, right) => (left.sortOrder ?? Number.MAX_SAFE_INTEGER) - (right.sortOrder ?? Number.MAX_SAFE_INTEGER))

  const categoryLines = orderedCategories.map((category, categoryIndex) => {
    const schedule = categoryScheduleSummary(category)
    return `${categoryIndex + 1}. ${category.name} (id: ${category.id}) - ${category.categoryItems.length} item${category.categoryItems.length === 1 ? "" : "s"} - ${category.visibility}${schedule ? ` - schedule: ${schedule}` : ""}`
  })

  const itemSections = orderedCategories.map((category) => {
    const itemLines = category.categoryItems
      .slice()
      .sort((left, right) => (left.sortOrder ?? Number.MAX_SAFE_INTEGER) - (right.sortOrder ?? Number.MAX_SAFE_INTEGER))
      .map(({ item }, index) => {
        const details = [
          `${index + 1}. ${item.name} (id: ${item.id}) ${formatPrice(item.basePriceCents)} - ${item.visibility}`,
          item.tags?.length ? `tags: [${item.tags.join(", ")}]` : null,
          typeof item.prepTimeMinutes === "number" ? `prep: ${item.prepTimeMinutes}min` : null,
        ].filter((value): value is string => Boolean(value))

        return `  ${details.join(" - ")}`
      })

    return [ `${category.name}:`, ...(itemLines.length ? itemLines : ["  (no items)"]) ].join("\n")
  })

  const config = input.brandConfig ?? {}
  const themeKeys = [
    "accentColor",
    "primaryColor",
    "backgroundColor",
    "headingFont",
    "fontFamily",
  ] as const
  const themeLines = themeKeys.flatMap((key) => {
    const value = config[key]
    if (typeof value !== "string" || !value.trim()) {
      return []
    }

    return [`${key}: ${value}`]
  })

  return [
    "CATEGORIES (in order):",
    ...(categoryLines.length ? categoryLines : ["(none)"]),
    "",
    "ITEMS (in order within category):",
    ...(itemSections.length ? itemSections : ["(none)"]),
    "",
    "THEME:",
    ...(themeLines.length ? themeLines : ["(none)"]),
  ].join("\n")
}
