import { z } from "zod"
import type { AssistantTool } from "./types.js"

const inputSchema = z
  .object({
    itemId: z.string().min(1),
    itemName: z.string().min(1),
    addTags: z.array(z.string()).optional(),
    removeTags: z.array(z.string()).optional(),
  })
  .refine(
    (value) =>
      (Array.isArray(value.addTags) && value.addTags.length > 0) ||
      (Array.isArray(value.removeTags) && value.removeTags.length > 0),
    { message: "At least one tag change is required" },
  )

function normalizeTag(tag: string) {
  return tag
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-")
    .replace(/-+/g, "-")
}

export const updateItemTagsTool: AssistantTool<z.infer<typeof inputSchema>> = {
  name: "update_item_tags",
  description: "Add or remove tags on an existing menu item.",
  inputSchema,
  async execute(ctx, input) {
    const items = await ctx.dataAccess.menu.listItems()
    const item = items.find((entry) => entry.id === input.itemId)

    if (!item) {
      throw new Error("Item not found")
    }

    const currentTags = new Set(item.tags.map(normalizeTag))
    const addTags = (input.addTags ?? []).map(normalizeTag).filter(Boolean)
    const removeTags = new Set((input.removeTags ?? []).map(normalizeTag).filter(Boolean))

    addTags.forEach((tag) => currentTags.add(tag))
    removeTags.forEach((tag) => currentTags.delete(tag))

    const nextTags = [...currentTags]
    await ctx.dataAccess.menu.updateItem(input.itemId, {
      tags: nextTags,
    })

    const replyParts = [
      addTags.length ? `added ${addTags.join(", ")}` : null,
      removeTags.size ? `removed ${[...removeTags].join(", ")}` : null,
    ].filter(Boolean)

    return {
      reply: `Updated tags for ${input.itemName}: ${replyParts.join("; ")}.`,
      changes: [
        {
          resource: "item",
          id: input.itemId,
          fields: ["tags"],
        },
      ],
      refresh: ["menu"],
    }
  },
}
