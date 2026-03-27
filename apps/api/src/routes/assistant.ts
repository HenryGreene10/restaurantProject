import type { Router } from 'express'
import { assistantDraftHandler } from '@repo/ai-assistant'

export function registerAssistantRoutes(r: Router) {
  r.post('/v1/assistant/draft', assistantDraftHandler)
}
