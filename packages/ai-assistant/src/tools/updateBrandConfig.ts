import { z } from "zod"
import type { AssistantTool } from "./types.js"

const inputSchema = z
  .object({
    heroHeadline: z.string().optional(),
    heroSubheadline: z.string().optional(),
    heroBadgeText: z.string().optional(),
    promoBannerText: z.string().optional(),
  })
  .refine(
    (value) =>
      typeof value.heroHeadline === "string" ||
      typeof value.heroSubheadline === "string" ||
      typeof value.heroBadgeText === "string" ||
      typeof value.promoBannerText === "string",
    { message: "At least one brand config field is required" },
  )

export const updateBrandConfigTool: AssistantTool<z.infer<typeof inputSchema>> = {
  name: "update_brand_config",
  description: "Update one or more hero/promo brand config fields in a single action.",
  inputSchema,
  async execute(ctx, input) {
    const patch = Object.fromEntries(
      Object.entries(input).filter(([, value]) => typeof value === "string"),
    )

    await ctx.dataAccess.brand.updateConfig(patch)

    return {
      reply: `Updated storefront copy: ${Object.keys(patch).join(", ")}.`,
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
