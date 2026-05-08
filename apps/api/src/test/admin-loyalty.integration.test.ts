import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import type { Express } from 'express'

const mockFindTenantBySlug = vi.fn()
const mockFindAdminAccessByClerkUserId = vi.fn()
const mockVerifyToken = vi.fn()
const mockGetConfig = vi.fn()
const mockUpdateConfig = vi.fn()
const mockSetActive = vi.fn()
const mockUpsertTier = vi.fn()
const mockDeleteTier = vi.fn()
const mockGetAnalytics = vi.fn()

vi.mock('@clerk/backend', () => ({ verifyToken: mockVerifyToken }))

vi.mock('@repo/data-access', () => ({
  createTenantScope: (restaurantId: string) => ({ restaurantId }),
  createPlatformDataAccess: () => ({
    findTenantBySlug: mockFindTenantBySlug,
    findAdminAccessByClerkUserId: mockFindAdminAccessByClerkUserId,
  }),
  createTenantDataAccess: () => ({
    brand: {},
    menu: {},
    customers: {},
    orders: {},
    payments: {},
    printing: {},
    loyalty: {
      getConfig: mockGetConfig,
      updateConfig: mockUpdateConfig,
      setActive: mockSetActive,
      upsertTier: mockUpsertTier,
      deleteTier: mockDeleteTier,
      getAnalytics: mockGetAnalytics,
    },
  }),
}))

const ADMIN_ACCESS = {
  adminUserId: 'admin_1',
  clerkUserId: 'user_1',
  email: 'owner@demo.test',
  role: 'owner',
  restaurantId: 'rest_1',
  tenantSlug: 'demo',
  restaurantName: 'Demo Restaurant',
  subscriptionStatus: 'ACTIVE',
}

const BASE_CONFIG = {
  active: false,
  earnRate: 10,
  redeemRate: 100,
  minRedeem: 500,
  expiryMonths: 12,
  welcomeBonus: 0,
  newMemberDiscountEnabled: false,
  newMemberDiscountType: 'PERCENTAGE',
  newMemberDiscountValue: 0,
  tiers: [],
}

describe('admin loyalty integration', () => {
  let createApp!: () => Express

  beforeAll(async () => {
    await import('./setup')
    ;({ createApp } = await import('../app'))
  })

  beforeEach(() => {
    vi.resetAllMocks()
    mockVerifyToken.mockResolvedValue({ sub: 'user_1' })
    mockFindTenantBySlug.mockResolvedValue({ id: 'rest_1', slug: 'demo' })
    mockFindAdminAccessByClerkUserId.mockResolvedValue(ADMIN_ACCESS)
    mockGetConfig.mockResolvedValue(BASE_CONFIG)
    mockUpdateConfig.mockResolvedValue(undefined)
    mockSetActive.mockResolvedValue(undefined)
  })

  describe('GET /admin/loyalty', () => {
    it('returns the loyalty config', async () => {
      const response = await request(createApp())
        .get('/admin/loyalty')
        .set('Authorization', 'Bearer clerk_token')
        .set('x-tenant-slug', 'demo')

      expect(response.status).toBe(200)
      expect(response.body.earnRate).toBe(10)
    })

    it('returns 401 without auth', async () => {
      const response = await request(createApp()).get('/admin/loyalty').set('x-tenant-slug', 'demo')
      expect(response.status).toBe(401)
    })
  })

  describe('PATCH /admin/loyalty', () => {
    it('updates config fields and returns updated config', async () => {
      const updated = { ...BASE_CONFIG, earnRate: 5, active: true }
      mockGetConfig.mockResolvedValueOnce(BASE_CONFIG).mockResolvedValueOnce(updated)

      const response = await request(createApp())
        .patch('/admin/loyalty')
        .set('Authorization', 'Bearer clerk_token')
        .set('x-tenant-slug', 'demo')
        .send({ earnRate: 5, active: true })

      expect(response.status).toBe(200)
      expect(mockUpdateConfig).toHaveBeenCalledWith(expect.objectContaining({ earnRate: 5 }))
      expect(mockSetActive).toHaveBeenCalledWith(true)
    })

    it('ignores unknown fields and non-number values', async () => {
      const response = await request(createApp())
        .patch('/admin/loyalty')
        .set('Authorization', 'Bearer clerk_token')
        .set('x-tenant-slug', 'demo')
        .send({ earnRate: 'bad', foo: 'bar' })

      expect(response.status).toBe(200)
      expect(mockUpdateConfig).not.toHaveBeenCalled()
    })
  })

  describe('POST /admin/loyalty/tiers', () => {
    it('creates a tier with valid fields', async () => {
      const tier = {
        id: 'tier_1',
        name: 'Free Coffee',
        pointsCost: 500,
        discountCents: 500,
        sortOrder: 0,
      }
      mockUpsertTier.mockResolvedValue(tier)

      const response = await request(createApp())
        .post('/admin/loyalty/tiers')
        .set('Authorization', 'Bearer clerk_token')
        .set('x-tenant-slug', 'demo')
        .send({ name: 'Free Coffee', pointsCost: 500, discountCents: 500 })

      expect(response.status).toBe(201)
      expect(response.body.name).toBe('Free Coffee')
    })

    it('returns 400 when name is missing', async () => {
      const response = await request(createApp())
        .post('/admin/loyalty/tiers')
        .set('Authorization', 'Bearer clerk_token')
        .set('x-tenant-slug', 'demo')
        .send({ pointsCost: 500, discountCents: 500 })

      expect(response.status).toBe(400)
    })

    it('returns 400 when pointsCost is below 1', async () => {
      const response = await request(createApp())
        .post('/admin/loyalty/tiers')
        .set('Authorization', 'Bearer clerk_token')
        .set('x-tenant-slug', 'demo')
        .send({ name: 'Discount', pointsCost: 0, discountCents: 100 })

      expect(response.status).toBe(400)
    })
  })

  describe('PATCH /admin/loyalty/tiers/:tierId', () => {
    it('updates an existing tier', async () => {
      const existing = {
        id: 'tier_1',
        name: 'Old Name',
        pointsCost: 500,
        discountCents: 500,
        sortOrder: 0,
      }
      mockGetConfig.mockResolvedValue({ ...BASE_CONFIG, tiers: [existing] })
      mockUpsertTier.mockResolvedValue({ ...existing, name: 'New Name' })

      const response = await request(createApp())
        .patch('/admin/loyalty/tiers/tier_1')
        .set('Authorization', 'Bearer clerk_token')
        .set('x-tenant-slug', 'demo')
        .send({ name: 'New Name' })

      expect(response.status).toBe(200)
      expect(mockUpsertTier).toHaveBeenCalledWith(expect.objectContaining({ name: 'New Name' }))
    })

    it('returns 404 when tier does not exist', async () => {
      mockGetConfig.mockResolvedValue({ ...BASE_CONFIG, tiers: [] })

      const response = await request(createApp())
        .patch('/admin/loyalty/tiers/nonexistent')
        .set('Authorization', 'Bearer clerk_token')
        .set('x-tenant-slug', 'demo')
        .send({ name: 'Updated' })

      expect(response.status).toBe(404)
    })
  })

  describe('DELETE /admin/loyalty/tiers/:tierId', () => {
    it('deletes a tier and returns 204', async () => {
      mockDeleteTier.mockResolvedValue(undefined)

      const response = await request(createApp())
        .delete('/admin/loyalty/tiers/tier_1')
        .set('Authorization', 'Bearer clerk_token')
        .set('x-tenant-slug', 'demo')

      expect(response.status).toBe(204)
      expect(mockDeleteTier).toHaveBeenCalledWith('tier_1')
    })
  })

  describe('GET /admin/loyalty/analytics', () => {
    it('returns analytics data', async () => {
      mockGetAnalytics.mockResolvedValue({
        enrolledCount: 5,
        issued: 1000,
        redeemed: 200,
        topAccounts: [],
        recentRedemptions: [],
      })

      const response = await request(createApp())
        .get('/admin/loyalty/analytics')
        .set('Authorization', 'Bearer clerk_token')
        .set('x-tenant-slug', 'demo')

      expect(response.status).toBe(200)
      expect(response.body.enrolledCount).toBe(5)
    })

    it('returns zero-state when analytics is null', async () => {
      mockGetAnalytics.mockResolvedValue(null)

      const response = await request(createApp())
        .get('/admin/loyalty/analytics')
        .set('Authorization', 'Bearer clerk_token')
        .set('x-tenant-slug', 'demo')

      expect(response.status).toBe(200)
      expect(response.body.enrolledCount).toBe(0)
    })
  })
})
