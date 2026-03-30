import type { Router } from 'express'
import { createTenantDataAccess, createTenantScope } from '@repo/data-access'
import type { TenantRequest } from '../middleware/tenant.js'

export function registerMenuRoutes(r: Router) {
  r.get('/v1/menu', async (req: TenantRequest, res) => {
    if (!req.tenant) return res.status(500).json({ error: 'No tenant in request' })
    const tenantDataAccess = createTenantDataAccess(
      createTenantScope(req.tenant.id)
    )
    const data = await tenantDataAccess.menu.getPublicMenu()
    res.json(data)
  })

  r.get('/v1/menu/featured', async (req: TenantRequest, res) => {
    if (!req.tenant) return res.status(500).json({ error: 'No tenant in request' })
    const tenantDataAccess = createTenantDataAccess(
      createTenantScope(req.tenant.id)
    )
    const items = await tenantDataAccess.menu.listFeaturedItems()
    res.json({ items })
  })
}
