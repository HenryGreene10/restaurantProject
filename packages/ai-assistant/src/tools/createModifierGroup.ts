import { z } from "zod"
import type { AssistantTool } from "./types.js"
import { toTitleCase } from "./titleCase.js"

const inputSchema = z.object({
  itemId: z.string().min(1),
  itemName: z.string().min(1),
  groupName: z.string().min(1),
  required: z.boolean().optional(),
  minSelections: z.number().int().nonnegative().optional(),
  maxSelections: z.number().int().positive().nullable().optional(),
})

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export const createModifierGroupTool: AssistantTool<z.infer<typeof inputSchema>> = {
  name: "create_modifier_group",
  description: "Create a modifier group on an existing item and attach it with the requested selection rules.",
  inputSchema,
  async execute(ctx, input) {
    const itemModifierGroups = await ctx.dataAccess.menu.listItemModifierGroups(input.itemId)
    const groupName = toTitleCase(input.groupName)
    const existingGroup = itemModifierGroups.find(
      (entry) => normalize(entry.group.name) === normalize(groupName),
    )

    if (existingGroup) {
      return {
        reply: `${existingGroup.group.name} already exists on ${input.itemName}.`,
        changes: [],
        refresh: ["menu"],
      }
    }

    const required = input.required ?? false
    const minSelections =
      typeof input.minSelections === "number" ? input.minSelections : required ? 1 : 0
    const maxSelections =
      input.maxSelections === undefined ? Math.max(minSelections, 1) : input.maxSelections

    if (maxSelections !== null && maxSelections < minSelections) {
      throw new Error("maxSelections must be greater than or equal to minSelections")
    }

    const selection =
      maxSelections === null || maxSelections > 1 || minSelections > 1 ? "MULTIPLE" : "SINGLE"

    const tenantModifierGroups = await ctx.dataAccess.menu.listModifierGroups()
    const reusableGroup = tenantModifierGroups.find(
      (entry) => normalize(entry.name) === normalize(groupName),
    )

    const targetGroup =
      reusableGroup ??
      (await ctx.dataAccess.menu.createModifierGroup({
        name: groupName,
        selection,
      }))

    if (reusableGroup && reusableGroup.selection !== selection) {
      throw new Error(
        `Modifier group "${reusableGroup.name}" already exists with ${reusableGroup.selection.toLowerCase()} selection rules.`,
      )
    }

    await ctx.dataAccess.menu.attachModifierGroup({
      itemId: input.itemId,
      groupId: targetGroup.id,
      isRequired: required,
      minSelections,
      maxSelections: maxSelections ?? null,
      allowOptionQuantity: false,
    })

    const selectionSummary =
      maxSelections === null
        ? "multiple selections allowed"
        : minSelections === maxSelections
          ? `${minSelections} selection${minSelections === 1 ? "" : "s"}`
          : `${minSelections}-${maxSelections} selections`

    return {
      reply: `Added ${targetGroup.name} to ${input.itemName} (${required ? "required" : "optional"}, ${selectionSummary}).`,
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
