import type { Request, Response } from "express"
import { runAssistantCommand } from "./service/runAssistantCommand.js"

type AssistantRequest = Request & {
  tenant?: {
    id: string
    slug: string
  }
}

function messageFromBody(body: unknown) {
  if (!body || typeof body !== "object") {
    return ""
  }

  const message = (body as Record<string, unknown>).message
  return typeof message === "string" ? message.trim() : ""
}

export async function assistantCommandHandler(req: AssistantRequest, res: Response) {
  const message = messageFromBody(req.body)
  if (!message) {
    return res.status(400).json({ error: "missing message" })
  }

  if (!req.tenant) {
    return res.status(500).json({ error: "No tenant in request" })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: "Missing ANTHROPIC_API_KEY" })
  }

  try {
    const response = await runAssistantCommand({
      apiKey,
      tenantSlug: req.tenant.slug,
      restaurantId: req.tenant.id,
      message,
    })

    return res.json(response)
  } catch (error) {
    return res.status(400).json({
      error: error instanceof Error ? error.message : "Assistant command failed",
    })
  }
}
