import type { Router } from 'express'
import type { TenantRequest } from '../middleware/tenant'
import { createTenantDataAccess, createTenantScope } from '@repo/data-access'

export function registerOrderRoutes(r: Router) {
  r.post('/v1/orders', async (req: TenantRequest, res) => {
    if (!req.tenant) return res.status(500).json({ error: 'No tenant in request' })
    const { items, type, pickupTime, deliveryAddress, notes } = req.body ?? {}
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'No items' })

    const tenantDataAccess = createTenantDataAccess(
      createTenantScope(req.tenant.id)
    )
    const result = await tenantDataAccess.orders.createOrder({
      type,
      notes,
      pickupTime: pickupTime ? new Date(pickupTime) : null,
      deliveryAddr: deliveryAddress ?? null,
      items
    })

    res.status(201).json(result)
  })
}
