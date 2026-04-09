import { z } from "zod"
import type { AssistantScheduleDay } from "../types.js"
import type { AssistantTool } from "./types.js"

const daySchema = z.enum([
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
])

const inputSchema = z.object({
  categoryId: z.string().min(1),
  categoryName: z.string().min(1),
  availableFrom: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  availableUntil: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  daysOfWeek: z.array(daySchema).optional(),
})

function timeStringToDate(value: string) {
  const [hoursString, minutesString] = value.split(":")
  const hours = Number(hoursString)
  const minutes = Number(minutesString)
  return new Date(Date.UTC(1970, 0, 1, hours, minutes, 0, 0))
}

function formatDays(days: AssistantScheduleDay[] | undefined) {
  if (!days || days.length === 0) {
    return "every day"
  }

  return days
    .map((day) => `${day.charAt(0).toUpperCase()}${day.slice(1)}`)
    .join(", ")
}

export const scheduleCategoryTool: AssistantTool<z.infer<typeof inputSchema>> = {
  name: "schedule_category",
  description: "Set a category to scheduled availability using time-of-day values and optional weekdays.",
  inputSchema,
  async execute(ctx, input) {
    if (input.availableFrom === input.availableUntil) {
      throw new Error("availableFrom and availableUntil must be different times")
    }

    const category = await ctx.dataAccess.menu.updateCategory(input.categoryId, {
      visibility: "SCHEDULED",
      availableFrom: timeStringToDate(input.availableFrom),
      availableUntil: timeStringToDate(input.availableUntil),
      daysOfWeek: input.daysOfWeek ?? null,
    })

    if (!category) {
      throw new Error("Category not found")
    }

    return {
      reply: `Scheduled ${input.categoryName} for ${input.availableFrom}-${input.availableUntil} ${formatDays(input.daysOfWeek)}.`,
      changes: [
        {
          resource: "category",
          id: input.categoryId,
          fields: ["visibility", "availableFrom", "availableUntil", "daysOfWeek"],
        },
      ],
      refresh: ["menu"],
    }
  },
}
