import { createTenantDataAccess, createTenantScope } from "@repo/data-access"
import { classifyAdminCommand } from "../anthropic/client.js"
import { ASSISTANT_SYSTEM_PROMPT } from "../prompts/systemPrompt.js"
import { buildAssistantContext } from "../prompts/contextBuilder.js"
import { findMenuEntities } from "../resolve/findMenuEntities.js"
import { assistantMutationTools } from "../tools/index.js"
import type { ToolContext } from "../tools/types.js"
import type { AssistantCommandResponse } from "../types.js"

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

export async function runAssistantCommand(input: {
  apiKey: string
  tenantSlug: string
  restaurantId: string
  message: string
}): Promise<AssistantCommandResponse> {
  const dataAccess = createTenantDataAccess(createTenantScope(input.restaurantId))
  const [menuState, brandConfig] = await Promise.all([
    dataAccess.menu.getPublicMenu(),
    dataAccess.brand.getConfig(),
  ])

  const assistantContext = buildAssistantContext({
    brandConfig: brandConfigRecord(brandConfig?.config ?? menuState.brandConfig?.config ?? menuState.brand),
    categories: menuState.categories,
  })

  const intent = await classifyAdminCommand({
    apiKey: input.apiKey,
    message: input.message,
    systemPrompt: ASSISTANT_SYSTEM_PROMPT,
    context: assistantContext,
  })

  if (intent.action === "unsupported") {
    return {
      reply: intent.message,
      changes: [],
      refresh: [],
    }
  }

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

  const toolContext: ToolContext = {
    tenantSlug: input.tenantSlug,
    restaurantId: input.restaurantId,
    dataAccess,
  }

  if (intent.action === "set_item_visibility") {
    return assistantMutationTools.set_item_visibility.execute(toolContext, {
      itemId: match.id,
      visibility: intent.visibility,
    })
  }

  if (intent.action === "set_item_featured") {
    return assistantMutationTools.set_item_featured.execute(toolContext, {
      itemId: match.id,
      isFeatured: intent.isFeatured,
    })
  }

  return assistantMutationTools.set_category_visibility.execute(toolContext, {
    categoryId: match.id,
    visibility: intent.visibility,
  })
}
