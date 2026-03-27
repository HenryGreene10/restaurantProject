import type { Router } from 'express'
import { withTenant, prisma } from '@repo/db'
import type { TenantRequest } from '../middleware/tenant'

export function registerMenuRoutes(r: Router) {
  r.get('/v1/menu', async (req: TenantRequest, res) => {
    if (!req.tenant) return res.status(500).json({ error: 'No tenant in request' })
    const data = await withTenant(req.tenant.id, async () => {
      const categories = await prisma.menuCategory.findMany({
        where: { restaurantId: req.tenant!.id },
        include: { items: { include: { variants: true } } },
        orderBy: { position: 'asc' }
      })
      const brand = await prisma.brandTheme.findUnique({ where: { restaurantId: req.tenant!.id } })
      return { categories, brand }
    })
    res.json(data)
  })
}
