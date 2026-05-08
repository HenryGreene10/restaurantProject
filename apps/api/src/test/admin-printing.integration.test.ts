import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import type { Express } from 'express'

const mockFindTenantBySlug = vi.fn()
const mockFindAdminAccessByClerkUserId = vi.fn()
const mockVerifyToken = vi.fn()
const mockGetSettings = vi.fn()
const mockSetSettings = vi.fn()

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
    printing: {
      getSettings: mockGetSettings,
      setSettings: mockSetSettings,
    },
    loyalty: {},
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

describe('admin printing integration', () => {
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
    mockGetSettings.mockResolvedValue({ cloudPrntEnabled: false, cloudPrntMacAddress: null })
    mockSetSettings.mockResolvedValue(undefined)
  })

  describe('GET /admin/restaurant/printing', () => {
    it('returns printing settings', async () => {
      const response = await request(createApp())
        .get('/admin/restaurant/printing')
        .set('Authorization', 'Bearer clerk_token')
        .set('x-tenant-slug', 'demo')

      expect(response.status).toBe(200)
      expect(response.body.enabled).toBe(false)
      expect(response.body.macAddress).toBeNull()
    })

    it('returns 401 without auth', async () => {
      const response = await request(createApp())
        .get('/admin/restaurant/printing')
        .set('x-tenant-slug', 'demo')
      expect(response.status).toBe(401)
    })
  })

  describe('PATCH /admin/restaurant/printing', () => {
    // Printing writes are intentionally paused (409) for the digital kiosk launch.
    // Validation still runs before the 409, so bad input still returns 400.

    it('returns 409 for valid settings (feature paused)', async () => {
      const response = await request(createApp())
        .patch('/admin/restaurant/printing')
        .set('Authorization', 'Bearer clerk_token')
        .set('x-tenant-slug', 'demo')
        .send({ enabled: true, macAddress: 'AA:BB:CC:DD:EE:FF' })

      expect(response.status).toBe(409)
    })

    it('returns 409 when disabling (feature paused)', async () => {
      const response = await request(createApp())
        .patch('/admin/restaurant/printing')
        .set('Authorization', 'Bearer clerk_token')
        .set('x-tenant-slug', 'demo')
        .send({ enabled: false })

      expect(response.status).toBe(409)
    })

    it('returns 400 when enabled flag is missing', async () => {
      const response = await request(createApp())
        .patch('/admin/restaurant/printing')
        .set('Authorization', 'Bearer clerk_token')
        .set('x-tenant-slug', 'demo')
        .send({ macAddress: 'AA:BB:CC:DD:EE:FF' })

      expect(response.status).toBe(400)
    })

    it('returns 400 when MAC address format is invalid', async () => {
      const response = await request(createApp())
        .patch('/admin/restaurant/printing')
        .set('Authorization', 'Bearer clerk_token')
        .set('x-tenant-slug', 'demo')
        .send({ enabled: true, macAddress: 'not-a-mac' })

      expect(response.status).toBe(400)
    })

    it('returns 400 when enabled is true but MAC is omitted', async () => {
      const response = await request(createApp())
        .patch('/admin/restaurant/printing')
        .set('Authorization', 'Bearer clerk_token')
        .set('x-tenant-slug', 'demo')
        .send({ enabled: true })

      expect(response.status).toBe(400)
    })
  })
})
