import type { Request, Response, Router } from 'express'
import {
  createPlatformDataAccess,
  createTenantDataAccess,
  createTenantScope,
} from '@repo/data-access'
import { env } from '../config/env.js'

function requireInternalSecret(req: Request, res: Response): boolean {
  const secret = env().INTERNAL_ADMIN_SECRET
  if (!secret) {
    res.status(403).json({ error: 'Internal admin endpoint is not configured' })
    return false
  }
  if (req.header('x-internal-secret') !== secret) {
    res.status(403).json({ error: 'Invalid internal secret' })
    return false
  }
  return true
}

export function registerInternalLoyaltyRoutes(r: Router) {
  // GET /internal/restaurants/:slug/loyalty
  r.get('/internal/restaurants/:slug/loyalty', async (req: Request, res: Response) => {
    if (!requireInternalSecret(req, res)) return
    try {
      const restaurant = await createPlatformDataAccess().findTenantBySlug(req.params.slug)
      if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' })
      const da = createTenantDataAccess(createTenantScope(restaurant.id))
      return res.json(await da.loyalty.getConfig())
    } catch (error) {
      return res
        .status(500)
        .json({ error: error instanceof Error ? error.message : 'Failed to load loyalty config' })
    }
  })

  // PATCH /internal/restaurants/:slug/loyalty
  // Body: { earnRate?, redeemRate?, minRedeem?, expiryMonths?, welcomeBonus?,
  //         newMemberDiscountEnabled?, newMemberDiscountType?, newMemberDiscountValue?, active? }
  r.patch('/internal/restaurants/:slug/loyalty', async (req: Request, res: Response) => {
    if (!requireInternalSecret(req, res)) return
    try {
      const restaurant = await createPlatformDataAccess().findTenantBySlug(req.params.slug)
      if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' })

      const da = createTenantDataAccess(createTenantScope(restaurant.id))
      const {
        active,
        earnRate,
        redeemRate,
        minRedeem,
        expiryMonths,
        welcomeBonus,
        newMemberDiscountEnabled,
        newMemberDiscountType,
        newMemberDiscountValue,
      } = req.body ?? {}

      const patch: Record<string, unknown> = {}
      if (typeof earnRate === 'number') patch.earnRate = Math.max(1, earnRate)
      if (typeof redeemRate === 'number') patch.redeemRate = Math.max(1, redeemRate)
      if (typeof minRedeem === 'number') patch.minRedeem = Math.max(0, minRedeem)
      if (typeof expiryMonths === 'number') patch.expiryMonths = Math.max(0, expiryMonths)
      if (typeof welcomeBonus === 'number') patch.welcomeBonus = Math.max(0, welcomeBonus)
      if (typeof newMemberDiscountEnabled === 'boolean')
        patch.newMemberDiscountEnabled = newMemberDiscountEnabled
      if (newMemberDiscountType === 'PERCENTAGE' || newMemberDiscountType === 'FIXED')
        patch.newMemberDiscountType = newMemberDiscountType
      if (typeof newMemberDiscountValue === 'number')
        patch.newMemberDiscountValue = Math.max(0, newMemberDiscountValue)

      if (Object.keys(patch).length > 0) {
        await da.loyalty.updateConfig(patch as Parameters<typeof da.loyalty.updateConfig>[0])
      }
      if (typeof active === 'boolean') {
        await da.loyalty.setActive(active)
      }

      return res.json(await da.loyalty.getConfig())
    } catch (error) {
      return res
        .status(500)
        .json({ error: error instanceof Error ? error.message : 'Failed to update loyalty config' })
    }
  })
}
