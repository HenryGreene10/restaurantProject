import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import type { Express } from 'express'

const mockFindTenantByHost = vi.fn()
const mockFindTenantBySlug = vi.fn()
const mockFindAdminAccessByClerkUserId = vi.fn()
const mockListActiveKitchenOrders = vi.fn()
const mockVerifyToken = vi.fn()

vi.mock('@clerk/backend', () => ({
  verifyToken: mockVerifyToken,
}))

vi.mock('@repo/data-access', () => ({
  createTenantScope: (restaurantId: string) => ({ restaurantId }),
  createPlatformDataAccess: () => ({
    findTenantByHost: mockFindTenantByHost,
    findTenantBySlug: mockFindTenantBySlug,
    findAdminAccessByClerkUserId: mockFindAdminAccessByClerkUserId,
  }),
  createTenantDataAccess: () => ({
    brand: {},
    menu: {},
    customers: {},
    orders: {
      listActiveKitchenOrders: mockListActiveKitchenOrders,
    },
    payments: {},
    printing: {},
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

describe('kitchen integration', () => {
  let createApp!: () => Express

  beforeAll(async () => {
    await import('./setup')
    ;({ createApp } = await import('../app'))
  })

  beforeEach(() => {
    vi.resetAllMocks()
    mockVerifyToken.mockResolvedValue({ sub: 'user_1' })
    mockFindTenantBySlug.mockResolvedValue({ id: 'rest_1', slug: 'demo' })
    mockFindTenantByHost.mockResolvedValue({ id: 'rest_1', slug: 'demo' })
    mockFindAdminAccessByClerkUserId.mockResolvedValue(ADMIN_ACCESS)
    mockListActiveKitchenOrders.mockResolvedValue([])
  })

  it('returns active kitchen orders for an authenticated admin', async () => {
    const order = { id: 'order_1', orderNumber: 1, status: 'PENDING' }
    mockListActiveKitchenOrders.mockResolvedValue([order])

    const response = await request(createApp())
      .get('/v1/kitchen/orders')
      .set('Authorization', 'Bearer clerk_token')
      .set('x-tenant-slug', 'demo')

    expect(response.status).toBe(200)
    expect(response.body.orders).toEqual([order])
  })

  it('returns 401 when no Authorization header is provided', async () => {
    const response = await request(createApp())
      .get('/v1/kitchen/orders')
      .set('x-tenant-slug', 'demo')

    expect(response.status).toBe(401)
  })

  it('returns 401 when the Clerk token is invalid', async () => {
    mockVerifyToken.mockRejectedValue(new Error('invalid token'))

    const response = await request(createApp())
      .get('/v1/kitchen/orders')
      .set('Authorization', 'Bearer bad_token')
      .set('x-tenant-slug', 'demo')

    expect(response.status).toBe(401)
  })

  it('returns 403 when the Clerk user has no admin record', async () => {
    mockFindAdminAccessByClerkUserId.mockResolvedValue(null)

    const response = await request(createApp())
      .get('/v1/kitchen/orders')
      .set('Authorization', 'Bearer clerk_token')
      .set('x-tenant-slug', 'demo')

    expect(response.status).toBe(403)
  })

  it('returns 402 when the subscription is not active', async () => {
    mockFindAdminAccessByClerkUserId.mockResolvedValue({
      ...ADMIN_ACCESS,
      subscriptionStatus: 'PENDING',
    })

    const response = await request(createApp())
      .get('/v1/kitchen/orders')
      .set('Authorization', 'Bearer clerk_token')
      .set('x-tenant-slug', 'demo')

    expect(response.status).toBe(402)
  })
})
