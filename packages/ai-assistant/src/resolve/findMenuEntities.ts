import Fuse from "fuse.js"
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
  normalizedLabel: string
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
    normalizedLabel: normalize(category.name),
  }))
}

function buildItemCandidates(categories: MenuCategory[]): Candidate[] {
  return dedupeCandidates(
    categories.flatMap((category) =>
      category.categoryItems.map(({ item }) => ({
        id: item.id,
        label: item.name,
        normalizedLabel: normalize(item.name),
      })),
    ),
  )
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
  const normalizedQuery = normalize(query)
  const exactMatches = candidates.filter((candidate) => candidate.normalizedLabel === normalizedQuery)

  if (exactMatches.length === 1) {
    return {
      kind: "exact_match",
      entityType: input.entityType,
      id: exactMatches[0].id,
      label: exactMatches[0].label,
    }
  }

  if (exactMatches.length > 1) {
    return {
      kind: "ambiguous_match",
      entityType: input.entityType,
      query,
      options: exactMatches.map((candidate) => ({
        id: candidate.id,
        label: candidate.label,
      })),
    }
  }

  const queryTokens = tokens(query)
  const containsMatches = candidates.filter((candidate) => {
    if (candidate.normalizedLabel.includes(normalizedQuery) || normalizedQuery.includes(candidate.normalizedLabel)) {
      return true
    }

    const labelTokens = tokens(candidate.label)
    return queryTokens.every((token) => labelTokens.includes(token))
  })

  if (containsMatches.length === 1) {
    return {
      kind: "exact_match",
      entityType: input.entityType,
      id: containsMatches[0].id,
      label: containsMatches[0].label,
    }
  }

  if (containsMatches.length > 1) {
    return {
      kind: "ambiguous_match",
      entityType: input.entityType,
      query,
      options: containsMatches.map((candidate) => ({
        id: candidate.id,
        label: candidate.label,
      })),
    }
  }

  const fuse = new Fuse(candidates, {
    includeScore: true,
    shouldSort: true,
    threshold: 0.34,
    ignoreLocation: true,
    minMatchCharLength: 2,
    keys: ["label", "normalizedLabel"],
  })
  const fuzzyMatches = fuse
    .search(normalizedQuery, { limit: 5 })
    .filter((match) => (match.score ?? 1) <= 0.34)

  if (fuzzyMatches.length === 0) {
    return {
      kind: "not_found",
      entityType: input.entityType,
      query,
    }
  }

  const bestMatch = fuzzyMatches[0]
  const nearBestMatches = fuzzyMatches.filter(
    (match) => (match.score ?? 1) - (bestMatch.score ?? 1) <= 0.06,
  )

  if (nearBestMatches.length > 1) {
    return {
      kind: "ambiguous_match",
      entityType: input.entityType,
      query,
      options: nearBestMatches.map((match) => ({
        id: match.item.id,
        label: match.item.label,
      })),
    }
  }

  return {
    kind: "exact_match",
    entityType: input.entityType,
    id: bestMatch.item.id,
    label: bestMatch.item.label,
  }
}
