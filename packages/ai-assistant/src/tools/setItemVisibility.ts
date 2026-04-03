import { z } from "zod"
import type { AssistantTool } from "./types.js"

const inputSchema = z.object({
  itemId: z.string().min(1),
  visibility: z.enum(["AVAILABLE", "SOLD_OUT", "HIDDEN"]),
  requestStyle: z.enum(["standard", "delete_alias"]).optional(),
})

export const setItemVisibilityTool: AssistantTool<z.infer<typeof inputSchema>> = {
  name: "set_item_visibility",
  description: "Set a menu item's customer-facing visibility.",
  inputSchema,
  async execute(ctx, input) {
    const item = await ctx.dataAccess.menu.setItemVisibility(input.itemId, input.visibility)

    if (!item) {
      throw new Error("Item not found")
    }

    return {
      reply:
        input.visibility === "SOLD_OUT"
          ? `Marked ${item.name} as sold out.`
          : input.visibility === "HIDDEN"
            ? input.requestStyle === "delete_alias"
              ? `I've hidden ${item.name} from your menu. I can't permanently delete items through chat — hiding keeps it recoverable if you need it back.`
              : `Hid ${item.name} from the storefront.`
            : `Made ${item.name} available again.`,
      changes: [
        {
          resource: "item",
          id: item.id,
          fields: ["visibility"],
        },
      ],
      refresh: ["menu"],
    }
  },
}
