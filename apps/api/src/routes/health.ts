import type { Router } from 'express'

export function registerHealthRoutes(r: Router) {
  r.get('/health', (_req, res) => {
    res.json({ ok: true, time: new Date().toISOString() })
  })
}
