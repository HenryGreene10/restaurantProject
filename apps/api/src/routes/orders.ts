import type { Router } from 'express'
import type { TenantRequest } from '../middleware/tenant'
import { withTenant, prisma } from '@repo/db'

export function registerOrderRoutes(r: Router) {
  r.post('/v1/orders', async (req: TenantRequest, res) => {
    if (!req.tenant) return res.status(500).json({ error: 'No tenant in request' })
    const { items, type, pickupTime, deliveryAddress, notes } = req.body ?? {}
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'No items' })

    const result = await withTenant(req.tenant.id, async () => {
      // naive pricing for scaffold
      let subtotal = 0
      for (const it of items) subtotal += (it.price ?? 0) * (it.quantity ?? 1)
      const tax = Math.round(subtotal * 0.08875) // NYC-ish placeholder
      const total = subtotal + tax
      const order = await prisma.order.create({
        data: {
          restaurantId: req.tenant!.id,
          status: 'RECEIVED',
          type: type === 'DELIVERY' ? 'DELIVERY' : 'PICKUP',
          subtotal, tax, total,
          notes,
          pickupTime: pickupTime ? new Date(pickupTime) : null,
          deliveryAddr: deliveryAddress ?? null,
          items: {
            create: items.map((it: any) => ({
              restaurantId: req.tenant!.id,
              itemId: it.itemId ?? 'custom',
              name: it.name,
              variant: it.variant,
              modifiers: it.modifiers ?? null,
              quantity: it.quantity ?? 1,
              price: (it.price ?? 0) * (it.quantity ?? 1)
            }))
          }
        },
        include: { items: true }
      })
      return order
    })

    res.status(201).json(result)
  })
}
