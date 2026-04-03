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
} from "../types.js"

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
  apiKey: string
  message: string
  results: AssistantCommandResponse[]
}) {
  if (input.results.length === 1) {
    return input.results[0]?.reply ?? "Done."
  }

  try {
    return await summarizeExecutedActions({
      apiKey: input.apiKey,
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
    })
  }

  if (intent.action === "set_item_price") {
    return assistantMutationTools.set_item_price.execute(toolContext, {
      itemId: match.id,
      price: intent.price,
    })
  }

  return assistantMutationTools.set_category_visibility.execute(toolContext, {
    categoryId: match.id,
    visibility: intent.visibility,
    requestStyle: intent.requestStyle,
  })
}

export async function runAssistantCommand(input: {
  apiKey: string
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
      apiKey: input.apiKey,
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
          apiKey: input.apiKey,
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
        apiKey: input.apiKey,
        message: input.message,
        results: completedResults,
      }),
      changes: mergeChanges(completedResults),
      refresh: mergeRefreshTargets(completedResults),
    }
  } catch (error) {
    console.error("Assistant command failed", {
      tenantSlug: input.tenantSlug,
      message: input.message,
      history: input.history ?? [],
      classifiedAction: plan,
      error,
    })
    throw error
  }
}
