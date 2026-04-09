import { z } from "zod"
import type { AssistantTool } from "./types.js"
import { toTitleCase } from "./titleCase.js"

function dollarsToCents(value: number) {
  return Math.round(value * 100)
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

const inputSchema = z.object({
  itemId: z.string().min(1),
  groupId: z.string().min(1),
  groupName: z.string().min(1),
  optionName: z.string().min(1),
  priceAdjustment: z.number().min(0).optional(),
})

export const createModifierOptionTool: AssistantTool<z.infer<typeof inputSchema>> = {
  name: "create_modifier_option",
  description: "Add a selectable option to an existing modifier group attached to an item.",
  inputSchema,
  async execute(ctx, input) {
    const itemModifierGroups = await ctx.dataAccess.menu.listItemModifierGroups(input.itemId)
    const targetGroup = itemModifierGroups.find((entry) => entry.group.id === input.groupId)

    if (!targetGroup) {
      throw new Error("Modifier group not found on item")
    }

    const optionName = toTitleCase(input.optionName)
    const existingOption = targetGroup.group.options.find(
      (entry) => normalize(entry.name) === normalize(optionName),
    )

    if (existingOption) {
      return {
        reply: `${existingOption.name} is already an option in ${targetGroup.group.name}.`,
        changes: [],
        refresh: ["menu"],
      }
    }

    const priceAdjustment = input.priceAdjustment ?? 0
    const createdOption = await ctx.dataAccess.menu.createModifierOption({
      groupId: input.groupId,
      name: optionName,
      priceDeltaCents: dollarsToCents(priceAdjustment),
      position: targetGroup.group.options.length,
    })

    return {
      reply:
        priceAdjustment > 0
          ? `Added ${createdOption.name} to ${targetGroup.group.name} with a $${priceAdjustment.toFixed(2)} upcharge.`
          : `Added ${createdOption.name} to ${targetGroup.group.name}.`,
      changes: [
        {
          resource: "item",
          id: input.itemId,
          fields: ["modifierGroups"],
        },
      ],
      refresh: ["menu"],
    }
  },
}
