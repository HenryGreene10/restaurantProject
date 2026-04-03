import { z } from "zod"
import type { AssistantTool } from "./types.js"
import { toTitleCase } from "./titleCase.js"

const inputSchema = z.object({
  categoryName: z.string().min(1),
  visibility: z.enum(["AVAILABLE", "HIDDEN"]).optional(),
})

export const addCategoryTool: AssistantTool<z.infer<typeof inputSchema>> = {
  name: "add_category",
  description: "Create a new menu category with a required name and optional initial visibility.",
  inputSchema,
  async execute(ctx, input) {
    const categoryName = toTitleCase(input.categoryName)
    const categories = await ctx.dataAccess.menu.listCategories()
    const createdCategory = await ctx.dataAccess.menu.createCategory({
      name: categoryName,
      sortOrder: categories.length,
      visibility: input.visibility ?? "AVAILABLE",
    })

    return {
      reply:
        `Created the ${createdCategory.name} category. ` +
        `You can now add items to it by saying "add Caesar Salad to ${createdCategory.name} for $12.99".`,
      changes: [
        {
          resource: "category",
          id: createdCategory.id,
          fields: ["name", "sortOrder", "visibility"],
        },
      ],
      refresh: ["menu"],
    }
  },
}
