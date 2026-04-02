import type { AssistantOption } from "../types.js"

type EntityType = "item" | "category"

type MenuCategory = {
  id: string
  name: string
  categoryItems: Array<{
    item: {
      id: string
      name: string
    }
  }>
}

export type EntityMatch =
  | {
      kind: "exact_match"
      entityType: EntityType
      id: string
      label: string
    }
  | {
      kind: "ambiguous_match"
      entityType: EntityType
      query: string
      options: AssistantOption[]
    }
  | {
      kind: "not_found"
      entityType: EntityType
      query: string
    }

type Candidate = {
  id: string
  label: string
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/\b(the|a|an)\b/g, " ")
    .replace(/\b(category|section|item|menu item|dish)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function tokens(value: string) {
  return normalize(value).split(" ").filter(Boolean)
}

function dedupeCandidates(candidates: Candidate[]) {
  const seen = new Set<string>()
  return candidates.filter((candidate) => {
    if (seen.has(candidate.id)) return false
    seen.add(candidate.id)
    return true
  })
}

function buildCategoryCandidates(categories: MenuCategory[]): Candidate[] {
  return categories.map((category) => ({
    id: category.id,
    label: category.name,
  }))
}

function buildItemCandidates(categories: MenuCategory[]): Candidate[] {
  return dedupeCandidates(
    categories.flatMap((category) =>
      category.categoryItems.map(({ item }) => ({
        id: item.id,
        label: item.name,
      })),
    ),
  )
}

function matchingCandidates(candidates: Candidate[], query: string) {
  const normalizedQuery = normalize(query)
  const queryTokens = tokens(query)

  const exact = candidates.filter((candidate) => normalize(candidate.label) === normalizedQuery)
  if (exact.length > 0) {
    return exact
  }

  const partial = candidates.filter((candidate) => {
    const normalizedLabel = normalize(candidate.label)
    if (normalizedLabel.includes(normalizedQuery) || normalizedQuery.includes(normalizedLabel)) {
      return true
    }

    const labelTokens = tokens(candidate.label)
    return queryTokens.every((token) => labelTokens.includes(token))
  })

  return partial
}

export function findMenuEntities(input: {
  categories: MenuCategory[]
  entityType: EntityType
  query: string
}): EntityMatch {
  const query = input.query.trim()
  if (!query) {
    return {
      kind: "not_found",
      entityType: input.entityType,
      query,
    }
  }

  const candidates =
    input.entityType === "category"
      ? buildCategoryCandidates(input.categories)
      : buildItemCandidates(input.categories)
  const matches = matchingCandidates(candidates, query)

  if (matches.length === 0) {
    return {
      kind: "not_found",
      entityType: input.entityType,
      query,
    }
  }

  if (matches.length > 1) {
    return {
      kind: "ambiguous_match",
      entityType: input.entityType,
      query,
      options: matches.map((candidate) => ({
        id: candidate.id,
        label: candidate.label,
      })),
    }
  }

  return {
    kind: "exact_match",
    entityType: input.entityType,
    id: matches[0].id,
    label: matches[0].label,
  }
}
