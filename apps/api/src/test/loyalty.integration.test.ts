import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import type { Express } from 'express'

const mockFindTenantByHost = vi.fn()
const mockFindTenantBySlug = vi.fn()
const mockGetOrCreateAccount = vi.fn()
const mockGetConfig = vi.fn()
const mockGetAccountByPhone = vi.fn()
const mockRedeemPoints = vi.fn()
const mockVerifyCustomerAccessToken = vi.fn()

vi.mock('@clerk/backend', () => ({
  verifyToken: vi.fn().mockRejectedValue(new Error('Clerk not used in loyalty tests')),
}))

vi.mock('@repo/auth', async () => {
  const actual = await vi.importActual<typeof import('@repo/auth')>('@repo/auth')
  return { ...actual, verifyCustomerAccessToken: mockVerifyCustomerAccessToken }
})

vi.mock('@repo/data-access', () => ({
  createTenantScope: (restaurantId: string) => ({ restaurantId }),
  createPlatformDataAccess: () => ({
    findTenantByHost: mockFindTenantByHost,
    findTenantBySlug: mockFindTenantBySlug,
  }),
  createTenantDataAccess: () => ({
    brand: {},
    menu: {},
    customers: {},
    orders: {},
    payments: {},
    printing: {},
    loyalty: {
      getOrCreateAccount: mockGetOrCreateAccount,
      getConfig: mockGetConfig,
      getAccountByPhone: mockGetAccountByPhone,
      redeemPoints: mockRedeemPoints,
    },
  }),
}))

const CUSTOMER_TOKEN_PAYLOAD = {
  sub: 'cust_1',
  customerId: 'cust_1',
  restaurantId: 'rest_1',
  phone: '+15555550123',
  type: 'customer-access' as const,
}

const LOYALTY_CONFIG = {
  active: true,
  earnRate: 10,
  redeemRate: 100,
  minRedeem: 500,
  expiryMonths: 12,
  welcomeBonus: 0,
  newMemberDiscountEnabled: false,
  newMemberDiscountType: 'PERCENTAGE',
  newMemberDiscountValue: 0,
  tiers: [{ id: 'tier_1', name: 'Free Coffee', pointsCost: 500, discountCents: 500, sortOrder: 0 }],
}

describe('customer loyalty integration', () => {
  let createApp!: () => Express

  beforeAll(async () => {
    await import('./setup')
    ;({ createApp } = await import('../app'))
  })

  beforeEach(() => {
    vi.resetAllMocks()
    mockFindTenantBySlug.mockResolvedValue({ id: 'rest_1', slug: 'demo' })
    mockFindTenantByHost.mockResolvedValue({ id: 'rest_1', slug: 'demo' })
    mockVerifyCustomerAccessToken.mockReturnValue(CUSTOMER_TOKEN_PAYLOAD)
    mockGetConfig.mockResolvedValue(LOYALTY_CONFIG)
    mockGetOrCreateAccount.mockResolvedValue({
      id: 'acct_1',
      points: 600,
      lifetimePts: 600,
      isNew: false,
    })
    mockGetAccountByPhone.mockResolvedValue({ events: [] })
  })

  describe('GET /v1/loyalty/account', () => {
    it('returns account data for an authenticated customer', async () => {
      const response = await request(createApp())
        .get('/v1/loyalty/account')
        .set('Authorization', 'Bearer customer_token')
        .set('x-tenant-slug', 'demo')

      expect(response.status).toBe(200)
      expect(response.body.balance).toBe(600)
      expect(response.body.active).toBe(true)
      expect(response.body.earnRate).toBe(10)
    })

    it('returns 401 when no Authorization header is provided', async () => {
      const response = await request(createApp())
        .get('/v1/loyalty/account')
        .set('x-tenant-slug', 'demo')

      expect(response.status).toBe(401)
    })

    it('filters tiers to those the customer can afford', async () => {
      mockGetOrCreateAccount.mockResolvedValue({
        id: 'acct_1',
        points: 300,
        lifetimePts: 300,
        isNew: false,
      })

      const response = await request(createApp())
        .get('/v1/loyalty/account')
        .set('Authorization', 'Bearer customer_token')
        .set('x-tenant-slug', 'demo')

      expect(response.status).toBe(200)
      expect(response.body.tiers).toHaveLength(0)
      expect(response.body.allTiers).toHaveLength(1)
    })
  })

  describe('POST /v1/loyalty/redeem', () => {
    it('redeems points and returns tier info', async () => {
      const tier = { id: 'tier_1', name: 'Free Coffee', pointsCost: 500, discountCents: 500 }
      mockRedeemPoints.mockResolvedValue(tier)

      const response = await request(createApp())
        .post('/v1/loyalty/redeem')
        .set('Authorization', 'Bearer customer_token')
        .set('x-tenant-slug', 'demo')
        .send({ tierId: 'tier_1' })

      expect(response.status).toBe(200)
      expect(response.body.discountCents).toBe(500)
      expect(response.body.newBalance).toBe(100)
    })

    it('returns 401 when unauthenticated', async () => {
      const response = await request(createApp())
        .post('/v1/loyalty/redeem')
        .set('x-tenant-slug', 'demo')
        .send({ tierId: 'tier_1' })

      expect(response.status).toBe(401)
    })

    it('returns 400 when tierId is missing', async () => {
      const response = await request(createApp())
        .post('/v1/loyalty/redeem')
        .set('Authorization', 'Bearer customer_token')
        .set('x-tenant-slug', 'demo')
        .send({})

      expect(response.status).toBe(400)
    })

    it('returns 402 when points are insufficient', async () => {
      mockRedeemPoints.mockRejectedValue(new Error('Insufficient points'))

      const response = await request(createApp())
        .post('/v1/loyalty/redeem')
        .set('Authorization', 'Bearer customer_token')
        .set('x-tenant-slug', 'demo')
        .send({ tierId: 'tier_1' })

      expect(response.status).toBe(402)
    })
  })
})
