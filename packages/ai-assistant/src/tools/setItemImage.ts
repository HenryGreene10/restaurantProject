import { z } from "zod"
import type { AssistantTool } from "./types.js"

const inputSchema = z.object({
  itemId: z.string().min(1),
  itemName: z.string().min(1),
  photoUrl: z.string().url(),
})

export const setItemImageTool: AssistantTool<z.infer<typeof inputSchema>> = {
  name: "set_item_image",
  description: "Set the photo URL for an existing menu item.",
  inputSchema,
  async execute(ctx, input) {
    const item = await ctx.dataAccess.menu.updateItem(input.itemId, {
      photoUrl: input.photoUrl,
    })

    if (!item) {
      throw new Error("Item not found")
    }

    return {
      reply: `Set the photo for ${input.itemName}.`,
      changes: [
        {
          resource: "item",
          id: item.id,
          fields: ["photoUrl"],
        },
      ],
      refresh: ["menu"],
    }
  },
}
