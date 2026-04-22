import type { Router } from 'express'
import { createTenantDataAccess, createTenantScope } from '@repo/data-access'
import { readBearerToken, verifyCustomer } from '../lib/customer-order.js'
import type { TenantRequest } from '../middleware/tenant.js'

function tenantDataAccessFor(req: TenantRequest) {
  if (!req.tenant) throw new Error('No tenant in request')
  return createTenantDataAccess(createTenantScope(req.tenant.id))
}

export function registerLoyaltyRoutes(r: Router) {
  // GET /v1/loyalty/account — authenticated customer's balance + tiers
  r.get('/v1/loyalty/account', async (req: TenantRequest, res) => {
    try {
      if (!req.tenant) return res.status(500).json({ error: 'No tenant in request' })
      if (!readBearerToken(req)) return res.status(401).json({ error: 'Authentication required' })
      const customer = verifyCustomer(req)

      const da = tenantDataAccessFor(req)
      const [account, config] = await Promise.all([
        da.loyalty.getOrCreateAccount(customer.customerId),
        da.loyalty.getConfig(),
      ])

      const recentEvents = await da.loyalty.getAccountByPhone(customer.phone)

      return res.json({
        balance: account.points,
        lifetimePts: account.lifetimePts,
        isNew: account.isNew,
        earnRate: config.earnRate,
        redeemRate: config.redeemRate,
        minRedeem: config.minRedeem,
        tiers: config.tiers.filter(t => account.points >= t.pointsCost),
        allTiers: config.tiers,
        history: recentEvents?.events?.map(e => ({
          orderId: e.orderId,
          type: e.type,
          delta: e.delta,
          description: e.description,
          createdAt: e.createdAt,
        })) ?? [],
      })
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to load loyalty account' })
    }
  })

  // POST /v1/loyalty/redeem — deduct points for a tier, return tier info for checkout
  r.post('/v1/loyalty/redeem', async (req: TenantRequest, res) => {
    try {
      if (!req.tenant) return res.status(500).json({ error: 'No tenant in request' })
      if (!readBearerToken(req)) return res.status(401).json({ error: 'Authentication required' })
      const customer = verifyCustomer(req)

      const { tierId } = req.body ?? {}
      if (typeof tierId !== 'string') return res.status(400).json({ error: 'tierId is required' })

      const da = tenantDataAccessFor(req)
      const account = await da.loyalty.getOrCreateAccount(customer.customerId)
      const tier = await da.loyalty.redeemPoints(account.id, tierId)

      return res.json({
        tier,
        discountCents: tier.discountCents,
        newBalance: account.points - tier.pointsCost,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Redemption failed'
      return res.status(message === 'Insufficient points' ? 402 : 400).json({ error: message })
    }
  })
}
