import { z } from "zod"
import type { AssistantHistoryMessage, AssistantPlannerResult } from "../types.js"

const modelToolSchema = {
  name: "classify_admin_command",
  description:
    "Plan a restaurant admin command into one or more supported actions, or ask for clarification when required information is missing.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      kind: {
        type: "string",
        enum: ["actions", "clarification", "unsupported"],
      },
      actions: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            action: {
              type: "string",
              enum: [
                "add_category",
                "set_item_visibility",
                "set_item_featured",
                "set_category_visibility",
                "add_item",
                "update_item",
                "set_item_price",
                "update_brand_config",
              ],
            },
            targetType: {
              type: "string",
              enum: ["item", "category"],
            },
            categoryName: {
              type: "string",
            },
            targetQuery: {
              type: "string",
            },
            visibility: {
              type: "string",
              enum: ["AVAILABLE", "SOLD_OUT", "HIDDEN"],
            },
            requestStyle: {
              type: "string",
              enum: ["standard", "delete_alias"],
            },
            isFeatured: {
              type: "boolean",
            },
            itemName: {
              type: "string",
            },
            price: {
              type: "number",
            },
            description: {
              type: "string",
            },
            name: {
              type: "string",
            },
            heroHeadline: {
              type: "string",
            },
            heroSubheadline: {
              type: "string",
            },
            heroBadgeText: {
              type: "string",
            },
            promoBannerText: {
              type: "string",
            },
          },
          required: ["action"],
        },
      },
      message: {
        type: "string",
      },
    },
    required: ["kind"],
  },
} as const

const actionSchema = z.union([
  z.object({
    action: z.literal("add_category"),
    categoryName: z.string().min(1),
    visibility: z.enum(["AVAILABLE", "HIDDEN"]).optional(),
  }),
  z.object({
    action: z.literal("set_item_visibility"),
    targetType: z.literal("item"),
    targetQuery: z.string().min(1),
    visibility: z.enum(["AVAILABLE", "SOLD_OUT", "HIDDEN"]),
    requestStyle: z.enum(["standard", "delete_alias"]).optional(),
  }),
  z.object({
    action: z.literal("set_item_featured"),
    targetType: z.literal("item"),
    targetQuery: z.string().min(1),
    isFeatured: z.boolean(),
  }),
  z.object({
    action: z.literal("set_category_visibility"),
    targetType: z.literal("category"),
    targetQuery: z.string().min(1),
    visibility: z.enum(["AVAILABLE", "HIDDEN"]),
    requestStyle: z.enum(["standard", "delete_alias"]).optional(),
  }),
  z.object({
    action: z.literal("add_item"),
    targetType: z.literal("category"),
    targetQuery: z.string().min(1),
    itemName: z.string().min(1),
    price: z.number().positive(),
    description: z.string().optional(),
    isFeatured: z.boolean().optional(),
  }),
  z
    .object({
      action: z.literal("update_item"),
      targetType: z.literal("item"),
      targetQuery: z.string().min(1),
      name: z.string().optional(),
      price: z.number().positive().optional(),
      description: z.string().optional(),
    })
    .refine(
      (value) =>
        typeof value.name === "string" ||
        typeof value.price === "number" ||
        typeof value.description === "string",
      { message: "update_item requires at least one field" },
    ),
  z.object({
    action: z.literal("set_item_price"),
    targetType: z.literal("item"),
    targetQuery: z.string().min(1),
    price: z.number().positive(),
  }),
  z
    .object({
      action: z.literal("update_brand_config"),
      heroHeadline: z.string().optional(),
      heroSubheadline: z.string().optional(),
      heroBadgeText: z.string().optional(),
      promoBannerText: z.string().optional(),
    })
    .refine(
      (value) =>
        typeof value.heroHeadline === "string" ||
        typeof value.heroSubheadline === "string" ||
        typeof value.heroBadgeText === "string" ||
        typeof value.promoBannerText === "string",
      { message: "update_brand_config requires at least one field" },
    ),
])

const toolInputSchema = z.union([
  z.object({
    kind: z.literal("actions"),
    actions: z.array(actionSchema).min(1),
  }),
  z.object({
    kind: z.literal("clarification"),
    message: z.string().min(1),
  }),
  z.object({
    kind: z.literal("unsupported"),
    message: z.string().min(1),
  }),
])

type AnthropContentBlock =
  | {
      type: "text"
      text: string
    }
  | {
      type: "tool_use"
      id: string
      name: string
      input: unknown
    }

type AnthropicMessageResponse = {
  content: AnthropContentBlock[]
}

function normalizePlannedAction(action: unknown) {
  if (!action || typeof action !== "object" || Array.isArray(action)) {
    return action
  }

  const normalized = { ...(action as Record<string, unknown>) }
  const actionName = normalized.action

  if (actionName === "add_item") {
    if (typeof normalized.targetType !== "string") {
      normalized.targetType = "category"
    }

    if (
      typeof normalized.targetQuery !== "string" &&
      typeof normalized.categoryName === "string" &&
      normalized.categoryName.trim()
    ) {
      normalized.targetQuery = normalized.categoryName
    }

    delete normalized.categoryName
    return normalized
  }

  if (
    actionName === "set_item_visibility" ||
    actionName === "set_item_featured" ||
    actionName === "update_item" ||
    actionName === "set_item_price"
  ) {
    if (typeof normalized.targetType !== "string") {
      normalized.targetType = "item"
    }

    if (
      typeof normalized.targetQuery !== "string" &&
      typeof normalized.itemName === "string" &&
      normalized.itemName.trim()
    ) {
      normalized.targetQuery = normalized.itemName
    }

    delete normalized.itemName
    return normalized
  }

  if (actionName === "set_category_visibility") {
    if (typeof normalized.targetType !== "string") {
      normalized.targetType = "category"
    }

    if (
      typeof normalized.targetQuery !== "string" &&
      typeof normalized.categoryName === "string" &&
      normalized.categoryName.trim()
    ) {
      normalized.targetQuery = normalized.categoryName
    }

    delete normalized.categoryName
    return normalized
  }

  return normalized
}

function normalizeToolInput(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return input
  }

  const normalized = { ...(input as Record<string, unknown>) }
  if (Array.isArray(normalized.actions)) {
    normalized.actions = normalized.actions.map((action) => normalizePlannedAction(action))
  }

  return normalized
}

async function requestAnthropicMessage(input: {
  apiKey: string
  body: Record<string, unknown>
}): Promise<AnthropicMessageResponse> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": input.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(input.body),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => "")
    throw new Error(`Anthropic request failed (${response.status}): ${body || "unknown error"}`)
  }

  return (await response.json()) as AnthropicMessageResponse
}

export async function classifyAdminCommand(input: {
  apiKey: string
  message: string
  systemPrompt: string
  context: string
  history?: AssistantHistoryMessage[]
}): Promise<AssistantPlannerResult> {
  const historyMessages = (input.history ?? []).map((entry) => ({
    role: entry.role,
    content: entry.content,
  }))

  const payload = await requestAnthropicMessage({
    apiKey: input.apiKey,
    body: {
      model: "claude-haiku-4-5-20251001",
      max_tokens: 768,
      system: input.systemPrompt,
      tools: [modelToolSchema],
      tool_choice: {
        type: "tool",
        name: "classify_admin_command",
      },
      messages: [
        ...historyMessages,
        {
          role: "user",
          content: `Tenant context:\n${input.context}\n\nUser command:\n${input.message}`,
        },
      ],
    },
  })
  const toolUse = payload.content.find(
    (block): block is Extract<AnthropContentBlock, { type: "tool_use" }> =>
      block.type === "tool_use" && block.name === "classify_admin_command",
  )

  if (!toolUse) {
    throw new Error("Anthropic response did not include classify_admin_command output")
  }

  return toolInputSchema.parse(normalizeToolInput(toolUse.input))
}

export async function summarizeExecutedActions(input: {
  apiKey: string
  message: string
  actionReplies: string[]
}): Promise<string> {
  const payload = await requestAnthropicMessage({
    apiKey: input.apiKey,
    body: {
      model: "claude-haiku-4-5-20251001",
      max_tokens: 120,
      system:
        "You summarize already-completed restaurant admin actions into one concise natural sentence. Do not mention actions that did not happen. Be specific about item names, category names, and prices when provided.",
      messages: [
        {
          role: "user",
          content:
            `Original user command:\n${input.message}\n\n` +
            `Completed action results:\n${input.actionReplies.map((reply) => `- ${reply}`).join("\n")}\n\n` +
            "Write one short, natural confirmation sentence.",
        },
      ],
    },
  })

  const text = payload.content
    .filter((block): block is Extract<AnthropContentBlock, { type: "text" }> => block.type === "text")
    .map((block) => block.text.trim())
    .filter(Boolean)
    .join(" ")

  if (!text) {
    throw new Error("Anthropic response did not include a summary")
  }

  return text
}
