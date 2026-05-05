import type { Router } from 'express'
import { checkDatabaseConnection } from '@repo/data-access'

export function registerHealthRoutes(r: Router) {
  r.get('/health', async (_req, res) => {
    const db = await checkDatabaseConnection()
    if (db) {
      return res.json({ ok: true, db: true, time: new Date().toISOString() })
    }
    return res.status(503).json({ ok: false, db: false, time: new Date().toISOString() })
  })
}
