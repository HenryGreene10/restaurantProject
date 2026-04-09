import { z } from "zod"
import type { AssistantTool } from "./types.js"

const hexColorPattern = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

const inputSchema = z
  .object({
    accentColor: z.string().optional(),
    primaryColor: z.string().optional(),
    backgroundColor: z.string().optional(),
    headingFont: z.string().optional(),
    bodyFont: z.string().optional(),
  })
  .refine(
    (value) =>
      typeof value.accentColor === "string" ||
      typeof value.primaryColor === "string" ||
      typeof value.backgroundColor === "string" ||
      typeof value.headingFont === "string" ||
      typeof value.bodyFont === "string",
    { message: "At least one theme field is required" },
  )

const fontMap: Record<string, string> = {
  inter: '"Inter", sans-serif',
  georgia: "Georgia, serif",
  "playfair display": '"Playfair Display", serif',
  lora: '"Lora", serif',
  merriweather: '"Merriweather", serif',
  raleway: '"Raleway", sans-serif',
  montserrat: '"Montserrat", sans-serif',
  nunito: '"Nunito", sans-serif',
  "dm sans": '"DM Sans", sans-serif',
  "dm serif display": '"DM Serif Display", serif',
  fraunces: '"Fraunces", serif',
  "cabinet grotesk": '"Cabinet Grotesk", sans-serif',
  "plus jakarta sans": '"Plus Jakarta Sans", sans-serif',
  "libre baskerville": '"Libre Baskerville", serif',
  "cormorant garamond": '"Cormorant Garamond", serif',
  roboto: '"Roboto", sans-serif',
}

function normalizeFont(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return null

  const mapped = fontMap[trimmed.toLowerCase()]
  if (mapped) {
    return mapped
  }

  return trimmed.includes(",") || trimmed.includes('"') || trimmed.includes("'")
    ? trimmed
    : `"${trimmed}", sans-serif`
}

function normalizeHexColor(value: string, fieldName: string) {
  const trimmed = value.trim()
  if (!hexColorPattern.test(trimmed)) {
    throw new Error(`${fieldName} must be a valid hex color`)
  }

  return trimmed.toLowerCase()
}

export const updateThemeTool: AssistantTool<z.infer<typeof inputSchema>> = {
  name: "update_theme",
  description: "Update storefront theme colors or fonts in brand config.",
  inputSchema,
  async execute(ctx, input) {
    const patch: Record<string, string> = {}

    if (typeof input.accentColor === "string") {
      patch.accentColor = normalizeHexColor(input.accentColor, "accentColor")
    }

    if (typeof input.primaryColor === "string") {
      patch.primaryColor = normalizeHexColor(input.primaryColor, "primaryColor")
    }

    if (typeof input.backgroundColor === "string") {
      patch.backgroundColor = normalizeHexColor(input.backgroundColor, "backgroundColor")
    }

    if (typeof input.headingFont === "string") {
      const font = normalizeFont(input.headingFont)
      if (!font) {
        throw new Error("headingFont cannot be empty")
      }

      patch.headingFont = font
    }

    if (typeof input.bodyFont === "string") {
      const font = normalizeFont(input.bodyFont)
      if (!font) {
        throw new Error("bodyFont cannot be empty")
      }

      patch.fontFamily = font
    }

    await ctx.dataAccess.brand.updateConfig(patch)

    return {
      reply: `Updated storefront theme: ${Object.keys(patch).join(", ")}.`,
      changes: [
        {
          resource: "brandConfig",
          id: ctx.restaurantId,
          fields: Object.keys(patch),
        },
      ],
      refresh: ["menu"],
    }
  },
}
