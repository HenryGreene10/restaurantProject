import { z } from "zod"
import type { AssistantTool } from "./types.js"

const inputSchema = z.object({
  categoryId: z.string().min(1),
  visibility: z.enum(["AVAILABLE", "HIDDEN"]),
})

export const setCategoryVisibilityTool: AssistantTool<z.infer<typeof inputSchema>> = {
  name: "set_category_visibility",
  description: "Set a category's customer-facing visibility.",
  inputSchema,
  async execute(ctx, input) {
    const category = await ctx.dataAccess.menu.setCategoryVisibility(input.categoryId, input.visibility)

    if (!category) {
      throw new Error("Category not found")
    }

    return {
      reply:
        input.visibility === "HIDDEN"
          ? `Hid the ${category.name} category.`
          : `Made the ${category.name} category visible.`,
      changes: [
        {
          resource: "category",
          id: category.id,
          fields: ["visibility"],
        },
      ],
      refresh: ["menu"],
    }
  },
}
