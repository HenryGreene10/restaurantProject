import type { Router } from 'express'
import type { CustomerAccessTokenPayload } from '@repo/auth'
import type { TenantRequest } from '../middleware/tenant.js'
import { createTenantDataAccess, createTenantScope } from '@repo/data-access'
import { transitionOrderStatus } from '../services/order-status.js'
import {
  normalizeCustomerPhone,
  readBearerToken,
  verifyCustomer,
} from '../lib/customer-order.js'

type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY'
  | 'COMPLETED'
  | 'CANCELLED'

const SMS_NOTIFICATION_STATUSES = new Set<OrderStatus>([
  'CONFIRMED',
  'READY',
  'CANCELLED',
])

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

function serializeCustomerOrder(order: NonNullable<Awaited<ReturnType<ReturnType<typeof createTenantDataAccess>['orders']['findById']>>>) {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    fulfillmentType: order.fulfillmentType,
    subtotalCents: order.subtotalCents,
    taxCents: order.taxCents,
    discountCents: order.discountCents,
    totalCents: order.totalCents,
    notes: order.notes,
    pickupTime: order.pickupTime,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    customerNameSnapshot: order.customerNameSnapshot,
    customerPhoneSnapshot: order.customerPhoneSnapshot,
    items: order.items.map((item) => ({
      id: item.id,
      name: item.name,
      variantName: item.variantName,
      quantity: item.quantity,
      unitPriceCents: item.unitPriceCents,
      linePriceCents: item.linePriceCents,
      notes: item.notes,
      modifierSelections: item.modifierSelections.map((modifier) => ({
        id: modifier.id,
        groupName: modifier.groupName,
        optionName: modifier.optionName,
        priceDeltaCents: modifier.priceDeltaCents,
        portion: modifier.portion
      })),
    })),
    statusEvents: order.statusEvents.map((event) => ({
      id: event.id,
      fromStatus: event.fromStatus,
      toStatus: event.toStatus,
      source: event.source,
      createdAt: event.createdAt,
    })),
  }
}

function serializePublicOrderStatus(
  order: NonNullable<Awaited<ReturnType<ReturnType<typeof createTenantDataAccess>['orders']['findById']>>>,
) {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    fulfillmentType: order.fulfillmentType,
    subtotalCents: order.subtotalCents,
    taxCents: order.taxCents,
    discountCents: order.discountCents,
    totalCents: order.totalCents,
    notes: order.notes,
    pickupTime: order.pickupTime,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    customerNameSnapshot: order.customerNameSnapshot,
    items: order.items.map((item) => ({
      id: item.id,
      name: item.name,
      variantName: item.variantName,
      quantity: item.quantity,
      unitPriceCents: item.unitPriceCents,
      linePriceCents: item.linePriceCents,
      notes: item.notes,
      modifierSelections: item.modifierSelections.map((modifier) => ({
        id: modifier.id,
        groupName: modifier.groupName,
        optionName: modifier.optionName,
        priceDeltaCents: modifier.priceDeltaCents,
        portion: modifier.portion
      })),
    })),
    statusEvents: order.statusEvents.map((event) => ({
      id: event.id,
      fromStatus: event.fromStatus,
      toStatus: event.toStatus,
      source: event.source,
      createdAt: event.createdAt,
    })),
  }
}

export function registerOrderRoutes(r: Router) {
  r.post('/v1/orders', async (req: TenantRequest, res) => {
    try {
      if (!req.tenant) return res.status(500).json({ error: 'No tenant in request' })
      const { items, type, pickupTime, deliveryAddress, notes, customerId, customerName, customerPhone } = req.body ?? {}
      if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'No items' })
      const customerAuth = readBearerToken(req) ? verifyCustomer(req) : null
      const normalizedCustomerPhone =
        customerAuth?.phone ??
        (typeof customerPhone === 'string'
          ? normalizeCustomerPhone(customerPhone)
          : null)

      if (!normalizedCustomerPhone) {
        return res.status(400).json({ error: 'Invalid customer phone number' })
      }

      const tenantDataAccess = createTenantDataAccess(
        createTenantScope(req.tenant.id)
      )
      const result = await tenantDataAccess.orders.createOrder({
        customerId:
          customerAuth?.customerId ??
          (typeof customerId === 'string' ? customerId : undefined),
        customerNameSnapshot: typeof customerName === 'string' ? customerName : null,
        customerPhoneSnapshot: normalizedCustomerPhone,
        fulfillmentType: type === 'DELIVERY' ? 'DELIVERY' : 'PICKUP',
        notes,
        pickupTime: pickupTime ? new Date(pickupTime) : null,
        deliveryAddressSnapshot: deliveryAddress ?? null,
        items
      })

      res.status(201).json(result)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to create order'
      res.status(400).json({ error: message })
    }
  })

  r.get('/v1/orders/:orderId', async (req: TenantRequest, res) => {
    try {
      if (!req.tenant) return res.status(500).json({ error: 'No tenant in request' })

      const customer = verifyCustomer(req)
      const tenantDataAccess = createTenantDataAccess(
        createTenantScope(req.tenant.id)
      )
      const order = await tenantDataAccess.orders.findById(routeParam(req, 'orderId'))

      if (!order) {
        return res.status(404).json({ error: 'Order not found' })
      }

      if (order.customerId !== customer.customerId) {
        return res.status(403).json({ error: 'Order does not belong to this customer' })
      }

      return res.json(serializeCustomerOrder(order))
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to load order'
      const status =
        message === 'Missing customer access token' ||
        message === 'Customer access token tenant mismatch' ||
        message === 'Invalid customer access token'
          ? 401
          : 400

      return res.status(status).json({ error: message })
    }
  })

  r.get('/v1/orders/:orderId/status', async (req: TenantRequest, res) => {
    try {
      if (!req.tenant) return res.status(500).json({ error: 'No tenant in request' })

      const tenantDataAccess = createTenantDataAccess(
        createTenantScope(req.tenant.id)
      )
      const order = await tenantDataAccess.orders.findById(routeParam(req, 'orderId'))

      if (!order) {
        return res.status(404).json({ error: 'Order not found' })
      }

      return res.json(serializePublicOrderStatus(order))
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to load order status'
      return res.status(400).json({ error: message })
    }
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
      actorAdminId: req.adminUser?.id ?? null,
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

    if (SMS_NOTIFICATION_STATUSES.has(nextStatus)) {
      try {
        await tenantDataAccess.orders.enqueueStatusNotification(
          routeParam(req, 'orderId'),
          nextStatus
        )
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Failed to enqueue order status SMS notification'
        console.error(message)
      }
    }

    return res.json(transition.order)
  })
}
