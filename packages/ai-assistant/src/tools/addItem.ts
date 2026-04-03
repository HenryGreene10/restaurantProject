import { z } from "zod"
import type { AssistantTool } from "./types.js"
import { toTitleCase } from "./titleCase.js"

function dollarsToCents(value: number) {
  return Math.round(value * 100)
}

const inputSchema = z.object({
  categoryId: z.string().min(1),
  itemName: z.string().min(1),
  price: z.number().positive(),
  description: z.string().optional(),
  isFeatured: z.boolean().optional(),
})

export const addItemTool: AssistantTool<z.infer<typeof inputSchema>> = {
  name: "add_item",
  description: "Create a new item in a category with name, price, optional description, and optional featured state.",
  inputSchema,
  async execute(ctx, input) {
    const itemName = toTitleCase(input.itemName)
    const category = (await ctx.dataAccess.menu.listCategories()).find(
      (entry) => entry.id === input.categoryId,
    )

    if (!category) {
      throw new Error("Category not found")
    }

    const createdItem = await ctx.dataAccess.menu.createItem({
      name: itemName,
      description: input.description?.trim() || null,
      basePriceCents: dollarsToCents(input.price),
      isFeatured: input.isFeatured ?? false,
      photoUrl: null,
      tags: [],
      prepTimeMinutes: 0,
      specialInstructionsEnabled: false,
      visibility: "AVAILABLE",
      categoryIds: [category.id],
    })

    if (!createdItem) {
      throw new Error("Failed to create item")
    }

    const existingItemIds = category.categoryItems.map((entry) => entry.item.id)
    await ctx.dataAccess.menu.reorderCategoryItems({
      categoryId: category.id,
      itemIds: [...existingItemIds, createdItem.id],
    })

    return {
      reply: `Added ${createdItem.name} to ${category.name} for $${input.price.toFixed(2)}.`,
      changes: [
        {
          resource: "item",
          id: createdItem.id,
          fields: ["name", "basePriceCents", "description", "isFeatured"],
        },
      ],
      refresh: ["menu"],
    }
  },
}
