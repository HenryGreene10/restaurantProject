import type { Request, Response } from 'express'

// Minimal stub. In production, call Anthropic Messages API with restaurant context.
export async function assistantDraftHandler(req: Request, res: Response) {
  const message: string = (req.body?.message || '').toString()
  if (!message) return res.status(400).json({ error: 'missing message' })
  // Here you would route to tools (menu mutations, hours, promos) and confirm before irreversible actions
  return res.json({ reply: `I understood: ${message}. I'll hook into actions next.` })
}
