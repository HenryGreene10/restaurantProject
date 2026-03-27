import type { Request, Response, NextFunction } from 'express'
import { tenantFromHost } from '../lib/tenant'

export interface TenantRequest extends Request {
  tenant?: { id: string; slug: string }
}

export async function tenantMiddleware(req: TenantRequest, res: Response, next: NextFunction) {
  const host = req.headers.host
  if (!host) return res.status(400).json({ error: 'Missing Host header' })
  const tenant = await tenantFromHost(host)
  if (!tenant) return res.status(404).json({ error: 'Unknown tenant' })
  req.tenant = tenant
  return next()
}
