import type { Router } from 'express'
import type { TenantRequest } from '../middleware/tenant.js'
import { createTenantDataAccess, createTenantScope } from '@repo/data-access'

function routeParam(req: TenantRequest, key: string): string {
  const value = req.params[key]
  return Array.isArray(value) ? value[0] : value
}

export function registerAdminOrderRoutes(r: Router) {
  r.post('/admin/orders/:orderId/delivery-eta', async (req: TenantRequest, res) => {
    if (!req.tenant) return res.status(500).json({ error: 'No tenant in request' })

    const { etaMinutes } = req.body ?? {}

    if (
      typeof etaMinutes !== 'number' ||
      !Number.isInteger(etaMinutes) ||
      etaMinutes <= 0
    ) {
      return res.status(400).json({ error: 'etaMinutes must be a positive integer' })
    }

    const tenantDataAccess = createTenantDataAccess(createTenantScope(req.tenant.id))

    const result = await tenantDataAccess.orders.enqueueDeliveryEtaNotification(
      routeParam(req, 'orderId'),
      etaMinutes,
    )

    if (!result) {
      return res.status(404).json({ error: 'Order not found or no customer phone on file' })
    }

    return res.status(200).json({ ok: true })
  })
}
