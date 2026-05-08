import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import type { Express } from 'express'

const mockFindTenantBySlug = vi.fn()
const mockFindAdminAccessByClerkUserId = vi.fn()
const mockVerifyToken = vi.fn()
const mockListOrders = vi.fn()
const mockSetEstimatedFulfillmentMinutes = vi.fn()
const mockEnqueueDeliveryEtaNotification = vi.fn()

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
    orders: {
      listOrders: mockListOrders,
      setEstimatedFulfillmentMinutes: mockSetEstimatedFulfillmentMinutes,
      enqueueDeliveryEtaNotification: mockEnqueueDeliveryEtaNotification,
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

describe('admin orders integration', () => {
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
    mockListOrders.mockResolvedValue({ orders: [], nextCursor: null })
  })

  describe('GET /admin/orders', () => {
    it('returns paginated orders', async () => {
      const order = { id: 'ord_1', orderNumber: 1, status: 'PENDING' }
      mockListOrders.mockResolvedValue({ orders: [order], nextCursor: null })

      const response = await request(createApp())
        .get('/admin/orders')
        .set('Authorization', 'Bearer clerk_token')
        .set('x-tenant-slug', 'demo')

      expect(response.status).toBe(200)
      expect(response.body.orders).toHaveLength(1)
      expect(mockListOrders).toHaveBeenCalledWith(expect.objectContaining({ limit: 50 }))
    })

    it('applies status filter from query param', async () => {
      const response = await request(createApp())
        .get('/admin/orders?status=PENDING')
        .set('Authorization', 'Bearer clerk_token')
        .set('x-tenant-slug', 'demo')

      expect(response.status).toBe(200)
      expect(mockListOrders).toHaveBeenCalledWith(expect.objectContaining({ status: ['PENDING'] }))
    })

    it('ignores invalid status values', async () => {
      const response = await request(createApp())
        .get('/admin/orders?status=INVALID')
        .set('Authorization', 'Bearer clerk_token')
        .set('x-tenant-slug', 'demo')

      expect(response.status).toBe(200)
      expect(mockListOrders).toHaveBeenCalledWith(expect.objectContaining({ status: undefined }))
    })

    it('caps limit at 100', async () => {
      const response = await request(createApp())
        .get('/admin/orders?limit=999')
        .set('Authorization', 'Bearer clerk_token')
        .set('x-tenant-slug', 'demo')

      expect(response.status).toBe(200)
      expect(mockListOrders).toHaveBeenCalledWith(expect.objectContaining({ limit: 100 }))
    })

    it('returns 401 without auth', async () => {
      const response = await request(createApp()).get('/admin/orders').set('x-tenant-slug', 'demo')
      expect(response.status).toBe(401)
    })
  })

  describe('POST /admin/orders/:orderId/delivery-eta', () => {
    it('sets the ETA and enqueues notification', async () => {
      mockSetEstimatedFulfillmentMinutes.mockResolvedValue({ id: 'ord_1' })
      mockEnqueueDeliveryEtaNotification.mockResolvedValue({ queued: true })

      const response = await request(createApp())
        .post('/admin/orders/ord_1/delivery-eta')
        .set('Authorization', 'Bearer clerk_token')
        .set('x-tenant-slug', 'demo')
        .send({ etaMinutes: 30 })

      expect(response.status).toBe(200)
      expect(response.body.estimatedFulfillmentMinutes).toBe(30)
    })

    it('returns 400 when etaMinutes is not a positive integer', async () => {
      const response = await request(createApp())
        .post('/admin/orders/ord_1/delivery-eta')
        .set('Authorization', 'Bearer clerk_token')
        .set('x-tenant-slug', 'demo')
        .send({ etaMinutes: -5 })

      expect(response.status).toBe(400)
    })

    it('returns 400 when etaMinutes is a float', async () => {
      const response = await request(createApp())
        .post('/admin/orders/ord_1/delivery-eta')
        .set('Authorization', 'Bearer clerk_token')
        .set('x-tenant-slug', 'demo')
        .send({ etaMinutes: 1.5 })

      expect(response.status).toBe(400)
    })

    it('returns 404 when order does not exist', async () => {
      mockSetEstimatedFulfillmentMinutes.mockResolvedValue(null)

      const response = await request(createApp())
        .post('/admin/orders/nonexistent/delivery-eta')
        .set('Authorization', 'Bearer clerk_token')
        .set('x-tenant-slug', 'demo')
        .send({ etaMinutes: 20 })

      expect(response.status).toBe(404)
    })

    it('returns 404 when order has no customer phone', async () => {
      mockSetEstimatedFulfillmentMinutes.mockResolvedValue({ id: 'ord_1' })
      mockEnqueueDeliveryEtaNotification.mockResolvedValue(null)

      const response = await request(createApp())
        .post('/admin/orders/ord_1/delivery-eta')
        .set('Authorization', 'Bearer clerk_token')
        .set('x-tenant-slug', 'demo')
        .send({ etaMinutes: 20 })

      expect(response.status).toBe(404)
    })
  })
})
