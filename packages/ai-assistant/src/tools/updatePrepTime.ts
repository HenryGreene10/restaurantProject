import { z } from "zod"
import type { AssistantTool } from "./types.js"

const inputSchema = z.object({
  itemId: z.string().min(1),
  itemName: z.string().min(1),
  prepTimeMinutes: z.number().int().nonnegative(),
})

export const updatePrepTimeTool: AssistantTool<z.infer<typeof inputSchema>> = {
  name: "update_prep_time",
  description: "Set the prep time in minutes for an existing item.",
  inputSchema,
  async execute(ctx, input) {
    const item = await ctx.dataAccess.menu.updateItem(input.itemId, {
      prepTimeMinutes: input.prepTimeMinutes,
    })

    if (!item) {
      throw new Error("Item not found")
    }

    return {
      reply: `Set prep time on ${input.itemName} to ${input.prepTimeMinutes} minute${input.prepTimeMinutes === 1 ? "" : "s"}.`,
      changes: [
        {
          resource: "item",
          id: input.itemId,
          fields: ["prepTimeMinutes"],
        },
      ],
      refresh: ["menu"],
    }
  },
}
