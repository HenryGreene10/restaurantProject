import { z } from "zod"
import type { AssistantTool } from "./types.js"

function dollarsToCents(value: number) {
  return Math.round(value * 100)
}

const inputSchema = z.object({
  itemId: z.string().min(1),
  price: z.number().positive(),
})

export const setItemPriceTool: AssistantTool<z.infer<typeof inputSchema>> = {
  name: "set_item_price",
  description: "Update the price of an existing item.",
  inputSchema,
  async execute(ctx, input) {
    const item = await ctx.dataAccess.menu.updateItem(input.itemId, {
      basePriceCents: dollarsToCents(input.price),
    })

    if (!item) {
      throw new Error("Item not found")
    }

    return {
      reply: `Updated ${item.name} to $${input.price.toFixed(2)}.`,
      changes: [
        {
          resource: "item",
          id: item.id,
          fields: ["basePriceCents"],
        },
      ],
      refresh: ["menu"],
    }
  },
}
