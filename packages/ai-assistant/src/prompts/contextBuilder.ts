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
      description?: string | null
      basePriceCents?: number
      visibility: string
      isFeatured: boolean
      prepTimeMinutes?: number
      tags?: string[]
      specialInstructionsEnabled?: boolean
      photoUrl?: string | null
      itemModifierGroups?: Array<{
        isRequired?: boolean
        minSelections?: number
        maxSelections?: number | null
        group: {
          name: string
          options: Array<{
            name: string
            priceDeltaCents?: number
          }>
        }
      }>
    }
  }>
}

type BuildAssistantContextInput = {
  brandConfig: Record<string, unknown> | null
  categories: MenuCategory[]
}

function printConfigValue(value: unknown) {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value)
  }

  return null
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

export function buildAssistantContext(input: BuildAssistantContextInput) {
  const brandLines = Object.entries(input.brandConfig ?? {})
    .map(([key, value]) => {
      const printable = printConfigValue(value)
      return printable ? `- ${key}: ${printable}` : null
    })
    .filter((line): line is string => Boolean(line))

  const categoryLines = input.categories.map((category) => {
    const itemLines = category.categoryItems.map(({ item, sortOrder }) => {
      const modifierSummary =
        item.itemModifierGroups?.length
          ? item.itemModifierGroups
              .map((entry) => {
                const optionSummary = entry.group.options
                  .map((option) =>
                    option.priceDeltaCents
                      ? `${option.name}(+${option.priceDeltaCents})`
                      : option.name,
                  )
                  .join(", ")

                return `${entry.group.name}[required=${entry.isRequired ? "yes" : "no"},min=${entry.minSelections ?? 0},max=${entry.maxSelections ?? "none"},options=${optionSummary || "none"}]`
              })
              .join("; ")
          : "none"

      return `  - item ${item.id} | sortOrder=${sortOrder ?? "unknown"} | ${item.name} | price=${item.basePriceCents ?? 0} | description=${item.description ?? ""} | visibility=${item.visibility} | featured=${item.isFeatured} | prep=${item.prepTimeMinutes ?? 0} | tags=${(item.tags ?? []).join(",") || "none"} | specialInstructions=${item.specialInstructionsEnabled ? "on" : "off"} | photo=${item.photoUrl ?? "none"} | modifiers=${modifierSummary}`
    })

    return [
      `- category ${category.id} | sortOrder=${category.sortOrder ?? "unknown"} | ${category.name} | visibility=${category.visibility} | availableFrom=${formatTime(category.availableFrom)} | availableUntil=${formatTime(category.availableUntil)} | daysOfWeek=${formatDays(category.daysOfWeek)}`,
      ...itemLines,
    ].join("\n")
  })

  return [
    "Brand config:",
    ...(brandLines.length ? brandLines : ["- (none)"]),
    "",
    "Menu categories and items:",
    ...(categoryLines.length ? categoryLines : ["- (none)"]),
  ].join("\n")
}
