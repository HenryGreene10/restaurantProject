import { z } from "zod"
import type { AssistantMutationIntent } from "../types.js"

const modelToolSchema = {
  name: "classify_admin_command",
  description:
    "Classify a restaurant admin command into one supported action and extract the target query.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      action: {
        type: "string",
        enum: [
          "set_item_visibility",
          "set_item_featured",
          "set_category_visibility",
          "unsupported",
        ],
      },
      targetType: {
        type: "string",
        enum: ["item", "category"],
      },
      targetQuery: {
        type: "string",
      },
      visibility: {
        type: "string",
        enum: ["AVAILABLE", "SOLD_OUT", "HIDDEN"],
      },
      isFeatured: {
        type: "boolean",
      },
      message: {
        type: "string",
      },
    },
    required: ["action"],
  },
} as const

const toolInputSchema = z.union([
  z.object({
    action: z.literal("set_item_visibility"),
    targetType: z.literal("item"),
    targetQuery: z.string().min(1),
    visibility: z.enum(["AVAILABLE", "SOLD_OUT", "HIDDEN"]),
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
  }),
  z.object({
    action: z.literal("unsupported"),
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

export async function classifyAdminCommand(input: {
  apiKey: string
  message: string
  systemPrompt: string
  context: string
}): Promise<AssistantMutationIntent> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": input.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      system: input.systemPrompt,
      tools: [modelToolSchema],
      tool_choice: {
        type: "tool",
        name: "classify_admin_command",
      },
      messages: [
        {
          role: "user",
          content: `Tenant context:\n${input.context}\n\nUser command:\n${input.message}`,
        },
      ],
    }),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => "")
    throw new Error(`Anthropic request failed (${response.status}): ${body || "unknown error"}`)
  }

  const payload = (await response.json()) as AnthropicMessageResponse
  const toolUse = payload.content.find(
    (block): block is Extract<AnthropContentBlock, { type: "tool_use" }> =>
      block.type === "tool_use" && block.name === "classify_admin_command",
  )

  if (!toolUse) {
    throw new Error("Anthropic response did not include classify_admin_command output")
  }

  return toolInputSchema.parse(toolUse.input)
}
