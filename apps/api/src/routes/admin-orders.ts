import type { Router } from 'express'
import { createTenantDataAccess, createTenantScope } from '@repo/data-access'
import type { TenantRequest } from '../middleware/tenant.js'

function routeParam(req: TenantRequest, key: string): string {
  const value = req.params[key]
  return Array.isArray(value) ? value[0] : value
}

const ORDER_STATUSES = new Set([
  'PENDING',
  'CONFIRMED',
  'PREPARING',
  'READY',
  'COMPLETED',
  'CANCELLED',
])

export function registerAdminOrderRoutes(r: Router) {
  r.get('/admin/orders', async (req: TenantRequest, res) => {
    if (!req.tenant) return res.status(500).json({ error: 'No tenant in request' })

    const rawLimit = parseInt(String(req.query.limit ?? '50'), 10)
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : 50
    const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined

    const rawStatus = req.query.status
    const statusFilter = Array.isArray(rawStatus)
      ? (rawStatus as string[]).filter((s) => ORDER_STATUSES.has(s))
      : typeof rawStatus === 'string' && ORDER_STATUSES.has(rawStatus)
        ? [rawStatus]
        : undefined

    const tenantDataAccess = createTenantDataAccess(createTenantScope(req.tenant.id))
    const result = await tenantDataAccess.orders.listOrders({
      limit,
      cursor,
      status: statusFilter as Parameters<typeof tenantDataAccess.orders.listOrders>[0]['status'],
    })

    return res.json(result)
  })

  r.post('/admin/orders/:orderId/delivery-eta', async (req: TenantRequest, res) => {
    if (!req.tenant) return res.status(500).json({ error: 'No tenant in request' })

    const { etaMinutes } = req.body ?? {}

    if (typeof etaMinutes !== 'number' || !Number.isInteger(etaMinutes) || etaMinutes <= 0) {
      return res.status(400).json({ error: 'etaMinutes must be a positive integer' })
    }

    const tenantDataAccess = createTenantDataAccess(createTenantScope(req.tenant.id))

    const updatedOrder = await tenantDataAccess.orders.setEstimatedFulfillmentMinutes(
      routeParam(req, 'orderId'),
      etaMinutes
    )

    if (!updatedOrder) {
      return res.status(404).json({ error: 'Order not found' })
    }

    const result = await tenantDataAccess.orders.enqueueDeliveryEtaNotification(
      routeParam(req, 'orderId'),
      etaMinutes
    )

    if (!result) {
      return res.status(404).json({ error: 'No customer phone on file' })
    }

    return res.status(200).json({ ok: true, estimatedFulfillmentMinutes: etaMinutes })
  })

  r.post('/admin/orders/:orderId/print', async (_req: TenantRequest, res) => {
    return res.status(409).json({
      error: 'Printing is paused for the digital kiosk launch.',
    })
  })
}
