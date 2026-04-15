import { createTenantDataAccess, createTenantScope } from "@repo/data-access"
import { classifyAdminCommand, summarizeExecutedActions } from "../anthropic/client.js"
import { ASSISTANT_SYSTEM_PROMPT } from "../prompts/systemPrompt.js"
import { buildAssistantContext } from "../prompts/contextBuilder.js"
import { findMenuEntities } from "../resolve/findMenuEntities.js"
import { assistantMutationTools } from "../tools/index.js"
import type { ToolContext } from "../tools/types.js"
import type {
  AssistantChange,
  AssistantCommandResponse,
  AssistantExecutableIntent,
  AssistantHistoryMessage,
  AssistantRefreshTarget,
  AssistantOption,
} from "../types.js"

function serializeError(error: unknown) {
  if (error instanceof Error) {
    const details = error as Error & {
      cause?: unknown
      status?: unknown
      response?: unknown
    }

    return {
      name: details.name,
      message: details.message,
      stack: details.stack,
      cause: details.cause,
      status: details.status,
      response: details.response,
    }
  }

  return {
    message: typeof error === "string" ? error : "Unknown assistant error",
    raw: error,
  }
}

function brandConfigRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null
  }

  const record = value as Record<string, unknown>
  const nested = record.config
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    return nested as Record<string, unknown>
  }

  return record
}

function clarificationReply(entityType: "item" | "category", query: string) {
  return `I found multiple ${entityType === "item" ? "items" : "categories"} matching "${query}". Which one did you mean?`
}

function notFoundReply(entityType: "item" | "category", query: string) {
  return `I couldn't find a ${entityType} matching "${query}".`
}

function modifierGroupClarificationReply(query: string, itemName: string) {
  return `I found multiple modifier groups on ${itemName} matching "${query}". Which one did you mean?`
}

function modifierGroupNotFoundReply(query: string, itemName: string) {
  return `I couldn't find a modifier group matching "${query}" on ${itemName}.`
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/\b(the|a|an)\b/g, " ")
    .replace(/\b(modifier|group|option|choices?)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

type ItemModifierGroupMatch =
  | {
      kind: "exact_match"
      id: string
      label: string
    }
  | {
      kind: "ambiguous_match"
      query: string
      options: AssistantOption[]
    }
  | {
      kind: "not_found"
      query: string
    }

async function findModifierGroupOnItem(input: {
  dataAccess: ToolContext["dataAccess"]
  itemId: string
  query: string
}): Promise<ItemModifierGroupMatch> {
  const itemModifierGroups = await input.dataAccess.menu.listItemModifierGroups(input.itemId)
  const normalizedQuery = normalize(input.query)

  if (!normalizedQuery) {
    return {
      kind: "not_found",
      query: input.query,
    }
  }

  const candidates = itemModifierGroups.map((entry) => ({
    id: entry.group.id,
    label: entry.group.name,
    normalizedLabel: normalize(entry.group.name),
  }))

  const exactMatches = candidates.filter((candidate) => candidate.normalizedLabel === normalizedQuery)
  if (exactMatches.length === 1) {
    return {
      kind: "exact_match",
      id: exactMatches[0].id,
      label: exactMatches[0].label,
    }
  }

  if (exactMatches.length > 1) {
    return {
      kind: "ambiguous_match",
      query: input.query,
      options: exactMatches.map((candidate) => ({
        id: candidate.id,
        label: candidate.label,
      })),
    }
  }

  const containsMatches = candidates.filter(
    (candidate) =>
      candidate.normalizedLabel.includes(normalizedQuery) ||
      normalizedQuery.includes(candidate.normalizedLabel),
  )

  if (containsMatches.length === 1) {
    return {
      kind: "exact_match",
      id: containsMatches[0].id,
      label: containsMatches[0].label,
    }
  }

  if (containsMatches.length > 1) {
    return {
      kind: "ambiguous_match",
      query: input.query,
      options: containsMatches.map((candidate) => ({
        id: candidate.id,
        label: candidate.label,
      })),
    }
  }

  return {
    kind: "not_found",
    query: input.query,
  }
}

async function loadTenantContext(dataAccess: ToolContext["dataAccess"]) {
  const [menuState, brandConfig] = await Promise.all([
    dataAccess.menu.getPublicMenu(),
    dataAccess.brand.getConfig(),
  ])

  return {
    menuState,
    assistantContext: buildAssistantContext({
      brandConfig: brandConfigRecord(
        brandConfig?.config ?? menuState.brandConfig?.config ?? menuState.brand,
      ),
      categories: menuState.categories,
    }),
  }
}

function findItemCategoryMatches(input: {
  categories: Awaited<ReturnType<ToolContext["dataAccess"]["menu"]["getPublicMenu"]>>["categories"]
  itemId: string
}) {
  const matches: Array<{ id: string; label: string }> = []

  for (const category of input.categories) {
    if (category.categoryItems.some((entry) => entry.item.id === input.itemId)) {
      matches.push({
        id: category.id,
        label: category.name,
      })
    }
  }

  return matches
}

function mergeChanges(results: AssistantCommandResponse[]) {
  const merged = new Map<string, AssistantChange>()

  for (const result of results) {
    for (const change of result.changes) {
      const key = `${change.resource}:${change.id}`
      const existing = merged.get(key)
      if (!existing) {
        merged.set(key, {
          ...change,
          fields: [...change.fields],
        })
        continue
      }

      existing.fields = Array.from(new Set([...existing.fields, ...change.fields]))
    }
  }

  return [...merged.values()]
}

function mergeRefreshTargets(results: AssistantCommandResponse[]) {
  return Array.from(
    new Set(results.flatMap((result) => result.refresh)),
  ) as AssistantRefreshTarget[]
}

async function summarizeResults(input: {
  groqApiKey?: string
  anthropicApiKey?: string
  message: string
  results: AssistantCommandResponse[]
}) {
  if (input.results.length === 1) {
    return input.results[0]?.reply ?? "Done."
  }

  try {
    return await summarizeExecutedActions({
      groqApiKey: input.groqApiKey,
      anthropicApiKey: input.anthropicApiKey,
      message: input.message,
      actionReplies: input.results.map((result) => result.reply),
    })
  } catch {
    return input.results.map((result) => result.reply).join(" ")
  }
}

async function executeIntent(input: {
  intent: AssistantExecutableIntent
  toolContext: ToolContext
}): Promise<AssistantCommandResponse> {
  const { intent, toolContext } = input

  if (intent.action === "add_category") {
    return assistantMutationTools.add_category.execute(toolContext, {
      categoryName: intent.categoryName,
      visibility: intent.visibility,
    })
  }

  if (intent.action === "update_brand_config") {
    return assistantMutationTools.update_brand_config.execute(toolContext, {
      heroHeadline: intent.heroHeadline,
      heroSubheadline: intent.heroSubheadline,
      heroBadgeText: intent.heroBadgeText,
      promoBannerText: intent.promoBannerText,
    })
  }

  if (intent.action === "update_theme") {
    return assistantMutationTools.update_theme.execute(toolContext, {
      accentColor: intent.accentColor,
      primaryColor: intent.primaryColor,
      backgroundColor: intent.backgroundColor,
      headingFont: intent.headingFont,
      bodyFont: intent.bodyFont,
    })
  }

  const { menuState } = await loadTenantContext(toolContext.dataAccess)
  const match = findMenuEntities({
    categories: menuState.categories,
    entityType: intent.targetType,
    query: intent.targetQuery,
  })

  if (match.kind === "ambiguous_match") {
    return {
      reply: clarificationReply(intent.targetType, intent.targetQuery),
      changes: [],
      refresh: [],
      needsClarification: true,
      options: match.options,
    }
  }

  if (match.kind === "not_found") {
    return {
      reply: notFoundReply(intent.targetType, intent.targetQuery),
      changes: [],
      refresh: [],
    }
  }

  if (intent.action === "set_item_visibility") {
    return assistantMutationTools.set_item_visibility.execute(toolContext, {
      itemId: match.id,
      visibility: intent.visibility,
      requestStyle: intent.requestStyle,
    })
  }

  if (intent.action === "set_item_featured") {
    return assistantMutationTools.set_item_featured.execute(toolContext, {
      itemId: match.id,
      isFeatured: intent.isFeatured,
    })
  }

  if (intent.action === "add_item") {
    return assistantMutationTools.add_item.execute(toolContext, {
      categoryId: match.id,
      itemName: intent.itemName,
      price: intent.price,
      description: intent.description,
      isFeatured: intent.isFeatured,
    })
  }

  if (intent.action === "update_item") {
    return assistantMutationTools.update_item.execute(toolContext, {
      itemId: match.id,
      name: intent.name,
      price: intent.price,
      description: intent.description,
      prepTimeMinutes: intent.prepTimeMinutes,
      tags: intent.tags,
      specialInstructionsEnabled: intent.specialInstructionsEnabled,
      visibility: intent.visibility,
    })
  }

  if (intent.action === "reorder_item") {
    const categoryMatches = findItemCategoryMatches({
      categories: menuState.categories,
      itemId: match.id,
    })

    if (categoryMatches.length === 0) {
      return {
        reply: `I couldn't determine which category currently contains ${match.label}.`,
        changes: [],
        refresh: [],
      }
    }

    if (categoryMatches.length > 1) {
      return {
        reply: `I found ${match.label} in multiple categories. Which section should I reorder it within?`,
        changes: [],
        refresh: [],
        needsClarification: true,
        options: categoryMatches,
      }
    }

    return assistantMutationTools.reorder_item.execute(toolContext, {
      itemId: match.id,
      itemName: match.label,
      categoryId: categoryMatches[0].id,
      categoryName: categoryMatches[0].label,
      position: intent.position,
    })
  }

  if (intent.action === "create_modifier_group") {
    return assistantMutationTools.create_modifier_group.execute(toolContext, {
      itemId: match.id,
      itemName: match.label,
      groupName: intent.groupName,
      required: intent.required,
      minSelections: intent.minSelections,
      maxSelections: intent.maxSelections,
    })
  }

  if (intent.action === "create_modifier_option") {
    const modifierGroupMatch = await findModifierGroupOnItem({
      dataAccess: toolContext.dataAccess,
      itemId: match.id,
      query: intent.groupName,
    })

    if (modifierGroupMatch.kind === "ambiguous_match") {
      return {
        reply: modifierGroupClarificationReply(intent.groupName, match.label),
        changes: [],
        refresh: [],
        needsClarification: true,
        options: modifierGroupMatch.options,
      }
    }

    if (modifierGroupMatch.kind === "not_found") {
      return {
        reply: modifierGroupNotFoundReply(intent.groupName, match.label),
        changes: [],
        refresh: [],
      }
    }

    return assistantMutationTools.create_modifier_option.execute(toolContext, {
      itemId: match.id,
      groupId: modifierGroupMatch.id,
      groupName: modifierGroupMatch.label,
      optionName: intent.optionName,
      priceAdjustment: intent.priceAdjustment,
    })
  }

  if (intent.action === "set_item_image") {
    return assistantMutationTools.set_item_image.execute(toolContext, {
      itemId: match.id,
      itemName: match.label,
      photoUrl: intent.photoUrl,
    })
  }

  if (intent.action === "set_item_localized_name") {
    return assistantMutationTools.set_item_localized_name.execute(toolContext, {
      itemQuery: match.label,
      nameLocalized: intent.nameLocalized,
    })
  }

  if (intent.action === "update_item_tags") {
    return assistantMutationTools.update_item_tags.execute(toolContext, {
      itemId: match.id,
      itemName: match.label,
      addTags: intent.addTags,
      removeTags: intent.removeTags,
    })
  }

  if (intent.action === "update_prep_time") {
    return assistantMutationTools.update_prep_time.execute(toolContext, {
      itemId: match.id,
      itemName: match.label,
      prepTimeMinutes: intent.prepTimeMinutes,
    })
  }

  if (intent.action === "toggle_special_instructions") {
    return assistantMutationTools.toggle_special_instructions.execute(toolContext, {
      itemId: match.id,
      itemName: match.label,
      enabled: intent.enabled,
    })
  }

  if (intent.action === "set_item_price") {
    return assistantMutationTools.set_item_price.execute(toolContext, {
      itemId: match.id,
      price: intent.price,
    })
  }

  if (intent.action === "schedule_category") {
    return assistantMutationTools.schedule_category.execute(toolContext, {
      categoryId: match.id,
      categoryName: match.label,
      availableFrom: intent.availableFrom,
      availableUntil: intent.availableUntil,
      daysOfWeek: intent.daysOfWeek,
    })
  }

  if (intent.action === "reorder_category") {
    return assistantMutationTools.reorder_category.execute(toolContext, {
      categoryId: match.id,
      categoryName: match.label,
      position: intent.position,
    })
  }

  return assistantMutationTools.set_category_visibility.execute(toolContext, {
    categoryId: match.id,
    visibility: intent.visibility,
    requestStyle: intent.requestStyle,
  })
}

export async function runAssistantCommand(input: {
  groqApiKey?: string
  anthropicApiKey?: string
  tenantSlug: string
  restaurantId: string
  message: string
  history?: AssistantHistoryMessage[]
}): Promise<AssistantCommandResponse> {
  const dataAccess = createTenantDataAccess(createTenantScope(input.restaurantId))
  let plan: AssistantExecutableIntent[] | AssistantCommandResponse | null = null

  try {
    const { assistantContext } = await loadTenantContext(dataAccess)

    const plannerResult = await classifyAdminCommand({
      groqApiKey: input.groqApiKey,
      anthropicApiKey: input.anthropicApiKey,
      message: input.message,
      systemPrompt: ASSISTANT_SYSTEM_PROMPT,
      context: assistantContext,
      history: input.history,
    })

    if (plannerResult.kind === "unsupported") {
      plan = {
        reply: plannerResult.message,
        changes: [],
        refresh: [],
      }
      return plan
    }

    if (plannerResult.kind === "clarification") {
      plan = {
        reply: plannerResult.message,
        changes: [],
        refresh: [],
        needsClarification: true,
      }
      return plan
    }

    plan = plannerResult.actions

    const toolContext: ToolContext = {
      tenantSlug: input.tenantSlug,
      restaurantId: input.restaurantId,
      dataAccess,
    }

    const completedResults: AssistantCommandResponse[] = []

    for (const intent of plannerResult.actions) {
      const result = await executeIntent({
        intent,
        toolContext,
      })

      if (result.changes.length === 0 && result.refresh.length === 0) {
        if (completedResults.length === 0) {
          return result
        }

        const completedReply = await summarizeResults({
          groqApiKey: input.groqApiKey,
          anthropicApiKey: input.anthropicApiKey,
          message: input.message,
          results: completedResults,
        })

        return {
          reply: `${completedReply} ${result.reply}`.trim(),
          changes: mergeChanges(completedResults),
          refresh: mergeRefreshTargets(completedResults),
          needsClarification: result.needsClarification,
          options: result.options,
        }
      }

      completedResults.push(result)
    }

    if (completedResults.length === 1) {
      return completedResults[0]
    }

    return {
      reply: await summarizeResults({
        groqApiKey: input.groqApiKey,
        anthropicApiKey: input.anthropicApiKey,
        message: input.message,
        results: completedResults,
      }),
      changes: mergeChanges(completedResults),
      refresh: mergeRefreshTargets(completedResults),
    }
  } catch (error) {
    console.error("Assistant command failed", {
      tenantSlug: input.tenantSlug,
      restaurantId: input.restaurantId,
      message: input.message,
      history: input.history ?? [],
      classifiedAction: plan,
      error: serializeError(error),
    })
    throw error
  }
}
