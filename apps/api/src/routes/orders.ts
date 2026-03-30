import type { Router } from 'express'
import type { TenantRequest } from '../middleware/tenant.js'
import { createTenantDataAccess, createTenantScope } from '@repo/data-access'
import { transitionOrderStatus } from '../services/order-status.js'

type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY'
  | 'COMPLETED'
  | 'CANCELLED'

function parseOrderStatus(value: unknown): OrderStatus | undefined {
  if (
    value === 'PENDING' ||
    value === 'CONFIRMED' ||
    value === 'PREPARING' ||
    value === 'READY' ||
    value === 'COMPLETED' ||
    value === 'CANCELLED'
  ) {
    return value
  }

  return undefined
}

function routeParam(req: TenantRequest, key: string): string {
  const value = req.params[key]
  return Array.isArray(value) ? value[0] : value
}

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

  r.patch('/admin/orders/:orderId/status', async (req: TenantRequest, res) => {
    if (!req.tenant) return res.status(500).json({ error: 'No tenant in request' })

    const nextStatus = parseOrderStatus(req.body?.status)
    if (!nextStatus) {
      return res.status(400).json({ error: 'Invalid order status' })
    }

    const tenantDataAccess = createTenantDataAccess(
      createTenantScope(req.tenant.id)
    )

    const transition = await transitionOrderStatus(tenantDataAccess, {
      orderId: routeParam(req, 'orderId'),
      nextStatus,
      actorAdminId:
        typeof req.body?.actorAdminId === 'string' ? req.body.actorAdminId : null,
    })

    if (transition.kind === 'not_found') {
      return res.status(404).json({ error: 'Order not found' })
    }

    if (transition.kind === 'invalid_transition') {
      return res.status(400).json({
        error: 'Invalid order status transition',
        currentStatus: transition.currentStatus,
        nextStatus: transition.nextStatus,
      })
    }

    return res.json(transition.order)
  })
}
