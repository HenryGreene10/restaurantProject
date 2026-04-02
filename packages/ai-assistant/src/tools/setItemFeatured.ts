import { z } from "zod"
import type { AssistantTool } from "./types.js"

const inputSchema = z.object({
  itemId: z.string().min(1),
  isFeatured: z.boolean(),
})

export const setItemFeaturedTool: AssistantTool<z.infer<typeof inputSchema>> = {
  name: "set_item_featured",
  description: "Set whether a menu item is featured.",
  inputSchema,
  async execute(ctx, input) {
    const item = await ctx.dataAccess.menu.updateItem(input.itemId, {
      isFeatured: input.isFeatured,
    })

    if (!item) {
      throw new Error("Item not found")
    }

    return {
      reply: input.isFeatured
        ? `Marked ${item.name} as featured.`
        : `Removed ${item.name} from featured items.`,
      changes: [
        {
          resource: "item",
          id: item.id,
          fields: ["isFeatured"],
        },
      ],
      refresh: ["menu"],
    }
  },
}
