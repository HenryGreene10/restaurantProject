import type { Router } from 'express'
import type { TenantRequest } from '../middleware/tenant'
import { createTenantDataAccess, createTenantScope } from '@repo/data-access'

export function registerOrderRoutes(r: Router) {
  r.post('/v1/orders', async (req: TenantRequest, res) => {
    if (!req.tenant) return res.status(500).json({ error: 'No tenant in request' })
    const { items, type, pickupTime, deliveryAddress, notes, customerId, customerName, customerPhone } = req.body ?? {}
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'No items' })

    const tenantDataAccess = createTenantDataAccess(
      createTenantScope(req.tenant.id)
    )
    const result = await tenantDataAccess.orders.createOrder({
      customerId: typeof customerId === 'string' ? customerId : null,
      customerNameSnapshot: typeof customerName === 'string' ? customerName : null,
      customerPhoneSnapshot: typeof customerPhone === 'string' ? customerPhone : null,
      fulfillmentType: type === 'DELIVERY' ? 'DELIVERY' : 'PICKUP',
      notes,
      pickupTime: pickupTime ? new Date(pickupTime) : null,
      deliveryAddressSnapshot: deliveryAddress ?? null,
      items
    })

    res.status(201).json(result)
  })
}
