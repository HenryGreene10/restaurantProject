import type { Router } from 'express'
import { assistantCommandHandler } from '@repo/ai-assistant'

export function registerAssistantRoutes(r: Router) {
  r.post('/v1/assistant/command', assistantCommandHandler)
}
