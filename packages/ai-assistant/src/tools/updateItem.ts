import { z } from "zod"
import type { AssistantTool } from "./types.js"

function dollarsToCents(value: number) {
  return Math.round(value * 100)
}

const inputSchema = z
  .object({
    itemId: z.string().min(1),
    name: z.string().optional(),
    price: z.number().positive().optional(),
    description: z.string().optional(),
    prepTimeMinutes: z.number().int().nonnegative().optional(),
    tags: z.array(z.string()).optional(),
    specialInstructionsEnabled: z.boolean().optional(),
    visibility: z.enum(["AVAILABLE", "SOLD_OUT", "HIDDEN"]).optional(),
  })
  .refine(
    (value) =>
      typeof value.name === "string" ||
      typeof value.price === "number" ||
      typeof value.description === "string" ||
      typeof value.prepTimeMinutes === "number" ||
      Array.isArray(value.tags) ||
      typeof value.specialInstructionsEnabled === "boolean" ||
      typeof value.visibility === "string",
    { message: "At least one field is required" },
  )

export const updateItemTool: AssistantTool<z.infer<typeof inputSchema>> = {
  name: "update_item",
  description:
    "Update only the named fields on an existing item: name, price, description, prep time, tags, special instructions, and/or visibility.",
  inputSchema,
  async execute(ctx, input) {
    const patch: Record<string, unknown> = {}
    const changedFields: string[] = []

    if (typeof input.name === "string") {
      patch.name = input.name
      changedFields.push("name")
    }

    if (typeof input.price === "number") {
      patch.basePriceCents = dollarsToCents(input.price)
      changedFields.push("basePriceCents")
    }

    if (typeof input.description === "string") {
      patch.description = input.description
      changedFields.push("description")
    }

    if (typeof input.prepTimeMinutes === "number") {
      patch.prepTimeMinutes = input.prepTimeMinutes
      changedFields.push("prepTimeMinutes")
    }

    if (Array.isArray(input.tags)) {
      patch.tags = Array.from(
        new Set(input.tags.map((tag) => tag.trim()).filter(Boolean)),
      )
      changedFields.push("tags")
    }

    if (typeof input.specialInstructionsEnabled === "boolean") {
      patch.specialInstructionsEnabled = input.specialInstructionsEnabled
      changedFields.push("specialInstructionsEnabled")
    }

    if (typeof input.visibility === "string") {
      patch.visibility = input.visibility
      changedFields.push("visibility")
    }

    const item = await ctx.dataAccess.menu.updateItem(input.itemId, patch)

    if (!item) {
      throw new Error("Item not found")
    }

    const details = [
      typeof input.name === "string" ? `name to ${input.name}` : null,
      typeof input.price === "number" ? `price to $${input.price.toFixed(2)}` : null,
      typeof input.description === "string" ? "description" : null,
      typeof input.prepTimeMinutes === "number"
        ? `prep time to ${input.prepTimeMinutes} minute${input.prepTimeMinutes === 1 ? "" : "s"}`
        : null,
      Array.isArray(input.tags) ? `tags to ${patch.tags instanceof Array ? patch.tags.join(", ") || "none" : "none"}` : null,
      typeof input.specialInstructionsEnabled === "boolean"
        ? input.specialInstructionsEnabled
          ? "special instructions enabled"
          : "special instructions disabled"
        : null,
      typeof input.visibility === "string" ? `visibility to ${input.visibility}` : null,
    ]
      .filter(Boolean)
      .join(", ")

    return {
      reply: `Updated ${item.name}${details ? `: ${details}.` : "."}`,
      changes: [
        {
          resource: "item",
          id: item.id,
          fields: changedFields,
        },
      ],
      refresh: ["menu"],
    }
  },
}
