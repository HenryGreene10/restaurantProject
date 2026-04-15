import { z } from "zod"
import type { AssistantTool } from "./types.js"
import { findMenuEntities } from "../resolve/findMenuEntities.js"

const inputSchema = z.object({
  itemQuery: z.string().min(1),
  nameLocalized: z.string().min(1),
})

export const setItemLocalizedNameTool: AssistantTool<z.infer<typeof inputSchema>> = {
  name: "set_item_localized_name",
  description: "Set the localized name for an existing menu item.",
  inputSchema,
  async execute(ctx, input) {
    const menuState = await ctx.dataAccess.menu.getPublicMenu()
    const match = findMenuEntities({
      categories: menuState.categories,
      entityType: "item",
      query: input.itemQuery,
    })

    if (match.kind === "ambiguous_match") {
      return {
        reply: `I found multiple items matching "${input.itemQuery}". Which one did you mean?`,
        changes: [],
        refresh: [],
        needsClarification: true,
        options: match.options,
      }
    }

    if (match.kind === "not_found") {
      return {
        reply: `I couldn't find an item matching "${input.itemQuery}".`,
        changes: [],
        refresh: [],
      }
    }

    const item = await ctx.dataAccess.menu.updateItem(match.id, {
      nameLocalized: input.nameLocalized.trim(),
    })

    if (!item) {
      throw new Error("Item not found")
    }

    return {
      reply: `Set the local language name for ${item.name} to ${input.nameLocalized.trim()}.`,
      changes: [
        {
          resource: "item",
          id: item.id,
          fields: ["nameLocalized"],
        },
      ],
      refresh: ["menu"],
    }
  },
}
