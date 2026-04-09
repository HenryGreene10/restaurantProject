import { z } from "zod"
import type { AssistantTool } from "./types.js"

const inputSchema = z.object({
  itemId: z.string().min(1),
  itemName: z.string().min(1),
  enabled: z.boolean(),
})

export const toggleSpecialInstructionsTool: AssistantTool<z.infer<typeof inputSchema>> = {
  name: "toggle_special_instructions",
  description: "Enable or disable special instructions for an item.",
  inputSchema,
  async execute(ctx, input) {
    const item = await ctx.dataAccess.menu.updateItem(input.itemId, {
      specialInstructionsEnabled: input.enabled,
    })

    if (!item) {
      throw new Error("Item not found")
    }

    return {
      reply: `${input.enabled ? "Enabled" : "Disabled"} special instructions for ${input.itemName}.`,
      changes: [
        {
          resource: "item",
          id: input.itemId,
          fields: ["specialInstructionsEnabled"],
        },
      ],
      refresh: ["menu"],
    }
  },
}
