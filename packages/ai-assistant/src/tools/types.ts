import type { z } from "zod"
import type { createTenantDataAccess } from "@repo/data-access"
import type { AssistantCommandResponse } from "../types.js"

export type ToolContext = {
  tenantSlug: string
  restaurantId: string
  dataAccess: ReturnType<typeof createTenantDataAccess>
}

export type AssistantTool<Input> = {
  name: string
  description: string
  inputSchema: z.ZodType<Input>
  execute: (ctx: ToolContext, input: Input) => Promise<AssistantCommandResponse>
}
