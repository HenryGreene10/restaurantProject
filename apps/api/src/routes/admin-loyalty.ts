import type { Router } from 'express'
import { createTenantDataAccess, createTenantScope } from '@repo/data-access'
import type { TenantRequest } from '../middleware/tenant.js'

function tenantDataAccessFor(req: TenantRequest) {
  if (!req.tenant) throw new Error('No tenant in request')
  return createTenantDataAccess(createTenantScope(req.tenant.id))
}

export function registerAdminLoyaltyRoutes(r: Router) {
  // GET /admin/loyalty — program config + tiers
  r.get('/admin/loyalty', async (req: TenantRequest, res) => {
    try {
      const da = tenantDataAccessFor(req)
      const config = await da.loyalty.getConfig()
      return res.json(config)
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to load loyalty config' })
    }
  })

  // PATCH /admin/loyalty — update program rules (not tiers)
  r.patch('/admin/loyalty', async (req: TenantRequest, res) => {
    try {
      const da = tenantDataAccessFor(req)
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
      if (typeof newMemberDiscountEnabled === 'boolean') patch.newMemberDiscountEnabled = newMemberDiscountEnabled
      if (newMemberDiscountType === 'PERCENTAGE' || newMemberDiscountType === 'FIXED') patch.newMemberDiscountType = newMemberDiscountType
      if (typeof newMemberDiscountValue === 'number') patch.newMemberDiscountValue = Math.max(0, newMemberDiscountValue)

      if (Object.keys(patch).length > 0) {
        await da.loyalty.updateConfig(patch as Parameters<typeof da.loyalty.updateConfig>[0])
      }
      if (typeof active === 'boolean') {
        await da.loyalty.setActive(active)
      }
      const config = await da.loyalty.getConfig()
      return res.json(config)
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to update loyalty config' })
    }
  })

  // POST /admin/loyalty/tiers — add tier
  r.post('/admin/loyalty/tiers', async (req: TenantRequest, res) => {
    try {
      const da = tenantDataAccessFor(req)
      const { name, pointsCost, discountCents, sortOrder } = req.body ?? {}
      if (typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ error: 'Tier name is required' })
      }
      if (typeof pointsCost !== 'number' || pointsCost < 1) {
        return res.status(400).json({ error: 'pointsCost must be a positive number' })
      }
      if (typeof discountCents !== 'number' || discountCents < 1) {
        return res.status(400).json({ error: 'discountCents must be a positive number' })
      }
      const tier = await da.loyalty.upsertTier({ name: name.trim(), pointsCost, discountCents, sortOrder })
      return res.status(201).json(tier)
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to create tier' })
    }
  })

  // PATCH /admin/loyalty/tiers/:tierId — edit tier
  r.patch('/admin/loyalty/tiers/:tierId', async (req: TenantRequest, res) => {
    try {
      const da = tenantDataAccessFor(req)
      const tierId = Array.isArray(req.params.tierId) ? req.params.tierId[0] : req.params.tierId
      const cfg = await da.loyalty.getConfig()
      const existing = cfg.tiers.find(t => t.id === tierId)
      if (!existing) return res.status(404).json({ error: 'Tier not found' })
      const { name, pointsCost, discountCents, sortOrder } = req.body ?? {}
      const tier = await da.loyalty.upsertTier({
        id: tierId,
        name: typeof name === 'string' ? name.trim() : existing.name,
        pointsCost: typeof pointsCost === 'number' ? pointsCost : existing.pointsCost,
        discountCents: typeof discountCents === 'number' ? discountCents : existing.discountCents,
        sortOrder: typeof sortOrder === 'number' ? sortOrder : existing.sortOrder,
      })
      return res.json(tier)
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to update tier' })
    }
  })

  // DELETE /admin/loyalty/tiers/:tierId — remove tier
  r.delete('/admin/loyalty/tiers/:tierId', async (req: TenantRequest, res) => {
    try {
      const da = tenantDataAccessFor(req)
      const tid = Array.isArray(req.params.tierId) ? req.params.tierId[0] : req.params.tierId
      await da.loyalty.deleteTier(tid)
      return res.status(204).send()
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to delete tier' })
    }
  })

  // GET /admin/loyalty/analytics — KPIs + top earners + redemption log
  r.get('/admin/loyalty/analytics', async (req: TenantRequest, res) => {
    try {
      const da = tenantDataAccessFor(req)
      const analytics = await da.loyalty.getAnalytics()
      if (!analytics) return res.json({ enrolledCount: 0, issued: 0, redeemed: 0, topAccounts: [], recentRedemptions: [] })
      return res.json(analytics)
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to load analytics' })
    }
  })
}
