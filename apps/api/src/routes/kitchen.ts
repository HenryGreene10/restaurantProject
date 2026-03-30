import type { Router } from 'express'
import type { TenantRequest } from '../middleware/tenant.js'
import { createTenantDataAccess, createTenantScope } from '@repo/data-access'

export function registerKitchenRoutes(r: Router) {
  r.get('/v1/kitchen/orders', async (req: TenantRequest, res) => {
    if (!req.tenant) return res.status(500).json({ error: 'No tenant in request' })
    const tenantDataAccess = createTenantDataAccess(
      createTenantScope(req.tenant.id)
    )
    const orders = await tenantDataAccess.orders.listActiveKitchenOrders()
    res.json({ orders })
  })
}
