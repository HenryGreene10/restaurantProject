import { z } from "zod"
import type { AssistantReorderPosition, AssistantCommandResponse } from "../types.js"
import type { AssistantTool } from "./types.js"

const positionSchema = z.union([z.literal("top"), z.literal("bottom"), z.number().int().positive()])

const inputSchema = z.object({
  itemId: z.string().min(1),
  itemName: z.string().min(1),
  categoryId: z.string().min(1),
  categoryName: z.string().min(1),
  position: positionSchema,
})

function resolveTargetIndex(position: AssistantReorderPosition, length: number) {
  if (position === "top") return 0
  if (position === "bottom") return Math.max(0, length - 1)
  return Math.min(Math.max(position - 1, 0), Math.max(0, length - 1))
}

function unchangedReply(input: z.infer<typeof inputSchema>) {
  const label =
    input.position === "top"
      ? "the top"
      : input.position === "bottom"
        ? "the bottom"
        : `position ${input.position}`

  return `${input.itemName} is already at ${label} of ${input.categoryName}.`
}

export const reorderItemTool: AssistantTool<z.infer<typeof inputSchema>> = {
  name: "reorder_item",
  description: "Move an item to a new position within its current category.",
  inputSchema,
  async execute(ctx, input) {
    const categories = await ctx.dataAccess.menu.listCategories()
    const category = categories.find((entry) => entry.id === input.categoryId)

    if (!category) {
      throw new Error("Category not found")
    }

    const orderedItemIds = category.categoryItems
      .slice()
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((entry) => entry.item.id)
    const currentIndex = orderedItemIds.indexOf(input.itemId)

    if (currentIndex === -1) {
      throw new Error("Item is not linked to the category")
    }

    const nextIndex = resolveTargetIndex(input.position, orderedItemIds.length)
    if (currentIndex === nextIndex) {
      return {
        reply: unchangedReply(input),
        changes: [],
        refresh: ["menu"],
      }
    }

    const reorderedIds = orderedItemIds.slice()
    const [movedId] = reorderedIds.splice(currentIndex, 1)
    reorderedIds.splice(nextIndex, 0, movedId)

    await ctx.dataAccess.menu.reorderCategoryItems({
      categoryId: input.categoryId,
      itemIds: reorderedIds,
    })

    return {
      reply: `Moved ${input.itemName} to ${input.position === "top" ? "the top" : input.position === "bottom" ? "the bottom" : `position ${input.position}`} of ${input.categoryName}.`,
      changes: [
        {
          resource: "item",
          id: input.itemId,
          fields: ["sortOrder"],
        },
      ],
      refresh: ["menu"],
    } satisfies AssistantCommandResponse
  },
}
