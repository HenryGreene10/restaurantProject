type MenuCategory = {
  id: string
  name: string
  visibility: string
  categoryItems: Array<{
    item: {
      id: string
      name: string
      visibility: string
      isFeatured: boolean
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

export function buildAssistantContext(input: BuildAssistantContextInput) {
  const brandLines = Object.entries(input.brandConfig ?? {})
    .map(([key, value]) => {
      const printable = printConfigValue(value)
      return printable ? `- ${key}: ${printable}` : null
    })
    .filter((line): line is string => Boolean(line))

  const categoryLines = input.categories.map((category) => {
    const itemLines = category.categoryItems.map(({ item }) =>
      `  - item ${item.id} | ${item.name} | visibility=${item.visibility} | featured=${item.isFeatured}`,
    )

    return [
      `- category ${category.id} | ${category.name} | visibility=${category.visibility}`,
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
