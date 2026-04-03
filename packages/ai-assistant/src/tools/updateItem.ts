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
  })
  .refine(
    (value) =>
      typeof value.name === "string" ||
      typeof value.price === "number" ||
      typeof value.description === "string",
    { message: "At least one field is required" },
  )

export const updateItemTool: AssistantTool<z.infer<typeof inputSchema>> = {
  name: "update_item",
  description: "Update only the named fields on an existing item: name, price, and/or description.",
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

    const item = await ctx.dataAccess.menu.updateItem(input.itemId, patch)

    if (!item) {
      throw new Error("Item not found")
    }

    const details = [
      typeof input.name === "string" ? `name to ${input.name}` : null,
      typeof input.price === "number" ? `price to $${input.price.toFixed(2)}` : null,
      typeof input.description === "string" ? "description" : null,
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
