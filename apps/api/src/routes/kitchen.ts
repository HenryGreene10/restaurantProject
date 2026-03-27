import type { Router } from 'express'
import type { TenantRequest } from '../middleware/tenant'
import { prisma, withTenant } from '@repo/db'

export function registerKitchenRoutes(r: Router) {
  r.get('/v1/kitchen/orders', async (req: TenantRequest, res) => {
    if (!req.tenant) return res.status(500).json({ error: 'No tenant in request' })
    const orders = await withTenant(req.tenant.id, async () => {
      return prisma.order.findMany({
        where: { restaurantId: req.tenant!.id, status: { in: ['RECEIVED', 'IN_PREPARATION', 'READY'] } },
        include: { items: true },
        orderBy: { createdAt: 'desc' }
      })
    })
    res.json({ orders })
  })
}
