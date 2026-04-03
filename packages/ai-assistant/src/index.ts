import type { Request, Response } from "express"
import { runAssistantCommand } from "./service/runAssistantCommand.js"
import type { AssistantHistoryMessage } from "./types.js"

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

function historyFromBody(body: unknown): AssistantHistoryMessage[] {
  if (!body || typeof body !== "object") {
    return []
  }

  const history = (body as Record<string, unknown>).history
  if (!Array.isArray(history)) {
    return []
  }

  return history.flatMap((entry) => {
    if (!entry || typeof entry !== "object") {
      return []
    }

    const role = (entry as Record<string, unknown>).role
    const content = (entry as Record<string, unknown>).content

    if ((role === "user" || role === "assistant") && typeof content === "string" && content.trim()) {
      return [{ role, content: content.trim() } satisfies AssistantHistoryMessage]
    }

    return []
  })
}

export async function assistantCommandHandler(req: AssistantRequest, res: Response) {
  const message = messageFromBody(req.body)
  const history = historyFromBody(req.body)
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
      history,
    })

    return res.json(response)
  } catch (error) {
    return res.status(400).json({
      error: error instanceof Error ? error.message : "Assistant command failed",
    })
  }
}
