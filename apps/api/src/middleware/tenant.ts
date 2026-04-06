import type { Request, Response, NextFunction } from 'express'
import { tenantFromHost, tenantFromSlug } from '../lib/tenant.js'

type Tenant = {
  id: string
  slug: string
}

declare module 'express-serve-static-core' {
  interface Request {
    tenant?: Tenant
  }
}

export type TenantRequest = Request

export async function tenantMiddleware(req: TenantRequest, res: Response, next: NextFunction) {
  const requestedSlug = req.header('x-tenant-slug')
  const host = req.headers.host

  const tenant = requestedSlug
    ? await tenantFromSlug(requestedSlug)
    : host
      ? await tenantFromHost(host)
      : null

  if (!requestedSlug && !host) {
    return res.status(400).json({ error: 'Missing Host header or x-tenant-slug header' })
  }

  if (!tenant) return res.status(404).json({ error: 'Unknown tenant' })
  req.tenant = tenant
  return next()
}
