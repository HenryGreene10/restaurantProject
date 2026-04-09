import { z } from "zod"
import type { AssistantReorderPosition, AssistantCommandResponse } from "../types.js"
import type { AssistantTool } from "./types.js"

const positionSchema = z.union([z.literal("top"), z.literal("bottom"), z.number().int().positive()])

const inputSchema = z.object({
  categoryId: z.string().min(1),
  categoryName: z.string().min(1),
  position: positionSchema,
})

function resolveTargetIndex(position: AssistantReorderPosition, length: number) {
  if (position === "top") return 0
  if (position === "bottom") return Math.max(0, length - 1)
  return Math.min(Math.max(position - 1, 0), Math.max(0, length - 1))
}

export const reorderCategoryTool: AssistantTool<z.infer<typeof inputSchema>> = {
  name: "reorder_category",
  description: "Move a category to a new position in the menu.",
  inputSchema,
  async execute(ctx, input) {
    const categories = await ctx.dataAccess.menu.listCategories()
    const orderedCategories = categories
      .slice()
      .sort((left, right) => left.sortOrder - right.sortOrder)
    const currentIndex = orderedCategories.findIndex((entry) => entry.id === input.categoryId)

    if (currentIndex === -1) {
      throw new Error("Category not found")
    }

    const nextIndex = resolveTargetIndex(input.position, orderedCategories.length)
    if (currentIndex === nextIndex) {
      return {
        reply: `${input.categoryName} is already at ${input.position === "top" ? "the top" : input.position === "bottom" ? "the bottom" : `position ${input.position}`}.`,
        changes: [],
        refresh: ["menu"],
      }
    }

    const reorderedCategories = orderedCategories.slice()
    const [movedCategory] = reorderedCategories.splice(currentIndex, 1)
    reorderedCategories.splice(nextIndex, 0, movedCategory)

    const updatedCategories = await Promise.all(
      reorderedCategories.map((category, index) =>
        ctx.dataAccess.menu.updateCategory(category.id, { sortOrder: index }),
      ),
    )

    return {
      reply: `Moved ${input.categoryName} to ${input.position === "top" ? "the top" : input.position === "bottom" ? "the bottom" : `position ${input.position}`}.`,
      changes: updatedCategories.flatMap((category) =>
        category
          ? [
              {
                resource: "category" as const,
                id: category.id,
                fields: ["sortOrder"],
              },
            ]
          : [],
      ),
      refresh: ["menu"],
    } satisfies AssistantCommandResponse
  },
}
