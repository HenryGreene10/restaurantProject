import type { Response, Router } from 'express'
import { createTenantDataAccess, createTenantScope } from '@repo/data-access'
import type { TenantRequest } from '../middleware/tenant.js'

export function registerMenuRoutes(r: Router) {
  const handleGetMenu = async (req: TenantRequest, res: Response) => {
    if (!req.tenant) return res.status(500).json({ error: 'No tenant in request' })
    const tenantDataAccess = createTenantDataAccess(
      createTenantScope(req.tenant.id)
    )
    const data = await tenantDataAccess.menu.getPublicMenu()
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    res.setHeader('Pragma', 'no-cache')
    res.setHeader('Expires', '0')
    res.json(data)
  }

  const handleGetFeaturedMenu = async (req: TenantRequest, res: Response) => {
    if (!req.tenant) return res.status(500).json({ error: 'No tenant in request' })
    const tenantDataAccess = createTenantDataAccess(
      createTenantScope(req.tenant.id)
    )
    const items = await tenantDataAccess.menu.listFeaturedItems()
    res.json({ items })
  }

  r.get('/menu', handleGetMenu)
  r.get('/v1/menu', handleGetMenu)
  r.get('/menu/featured', handleGetFeaturedMenu)
  r.get('/v1/menu/featured', handleGetFeaturedMenu)
}
