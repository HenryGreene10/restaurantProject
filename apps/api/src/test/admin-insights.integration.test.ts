import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import type { Express } from 'express'

const mockFindTenantBySlug = vi.fn()
const mockFindAdminAccessByClerkUserId = vi.fn()
const mockVerifyToken = vi.fn()
const mockQueryRaw = vi.fn()

vi.mock('@clerk/backend', () => ({ verifyToken: mockVerifyToken }))

// withTenantConnection wraps all insights queries — mock it to call the
// callback with a fake prisma client that returns empty result sets.
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
    loyalty: {},
  }),
  withTenantConnection: async (
    _restaurantId: string,
    callback: (prisma: { $queryRaw: typeof mockQueryRaw }) => Promise<unknown>
  ) => callback({ $queryRaw: mockQueryRaw }),
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

describe('admin insights integration', () => {
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
    // Default: all queries return empty rows
    mockQueryRaw.mockResolvedValue([])
  })

  it('GET /admin/insights/summary returns zero-state when no orders exist', async () => {
    mockQueryRaw.mockResolvedValue([
      {
        ordersThisMonth: 0n,
        revenueThisMonthCents: 0n,
        averageOrderValueCents: 0n,
        totalCustomers: 0n,
        repeatCustomers: 0n,
        ordersLastMonth: 0n,
        revenueLastMonthCents: 0n,
      },
    ])

    const response = await request(createApp())
      .get('/admin/insights/summary')
      .set('Authorization', 'Bearer clerk_token')
      .set('x-tenant-slug', 'demo')

    expect(response.status).toBe(200)
    expect(response.body.ordersThisMonth).toBe(0)
    expect(response.body.revenueThisMonth).toBe(0)
  })

  it('GET /admin/insights/summary returns 401 without auth', async () => {
    const response = await request(createApp())
      .get('/admin/insights/summary')
      .set('x-tenant-slug', 'demo')

    expect(response.status).toBe(401)
  })

  it('GET /admin/insights/orders-over-time returns an array of daily points', async () => {
    mockQueryRaw.mockResolvedValue([{ date: '2026-05-01', orders: 3n, revenueCents: 4500n }])

    const response = await request(createApp())
      .get('/admin/insights/orders-over-time')
      .set('Authorization', 'Bearer clerk_token')
      .set('x-tenant-slug', 'demo')

    expect(response.status).toBe(200)
    expect(Array.isArray(response.body)).toBe(true)
    expect(response.body[0].orders).toBe(3)
    expect(response.body[0].revenue).toBe(45)
  })

  it('GET /admin/insights/top-items returns ranked items', async () => {
    mockQueryRaw.mockResolvedValue([
      { itemName: 'Kung Pao Chicken', orderCount: 12n, revenueCents: 18000n },
    ])

    const response = await request(createApp())
      .get('/admin/insights/top-items')
      .set('Authorization', 'Bearer clerk_token')
      .set('x-tenant-slug', 'demo')

    expect(response.status).toBe(200)
    expect(response.body[0].itemName).toBe('Kung Pao Chicken')
    expect(response.body[0].orderCount).toBe(12)
  })

  it('GET /admin/insights/never-ordered returns items with no orders', async () => {
    mockQueryRaw.mockResolvedValue([
      { itemName: 'Mystery Item', categoryName: 'Specials', daysOnMenu: 30n },
    ])

    const response = await request(createApp())
      .get('/admin/insights/never-ordered')
      .set('Authorization', 'Bearer clerk_token')
      .set('x-tenant-slug', 'demo')

    expect(response.status).toBe(200)
    expect(response.body[0].itemName).toBe('Mystery Item')
    expect(response.body[0].daysOnMenu).toBe(30)
  })

  it('GET /admin/insights/peak-hours returns hourly order counts', async () => {
    mockQueryRaw.mockResolvedValue([{ hour: 12n, orders: 8n }])

    const response = await request(createApp())
      .get('/admin/insights/peak-hours')
      .set('Authorization', 'Bearer clerk_token')
      .set('x-tenant-slug', 'demo')

    expect(response.status).toBe(200)
    expect(response.body[0].hour).toBe(12)
    expect(response.body[0].orders).toBe(8)
  })

  it('GET /admin/insights/peak-days returns day-of-week order counts', async () => {
    mockQueryRaw.mockResolvedValue([{ dow: 5n, orders: 20n }])

    const response = await request(createApp())
      .get('/admin/insights/peak-days')
      .set('Authorization', 'Bearer clerk_token')
      .set('x-tenant-slug', 'demo')

    expect(response.status).toBe(200)
    expect(response.body.some((d: { day: string }) => d.day === 'Friday')).toBe(true)
  })

  it('GET /admin/insights/order-composition returns averages and counts', async () => {
    mockQueryRaw.mockResolvedValue([
      {
        averageItemsPerOrder: 2.3,
        singleItemOrders: 5n,
        multiItemOrders: 15n,
      },
    ])

    const response = await request(createApp())
      .get('/admin/insights/order-composition')
      .set('Authorization', 'Bearer clerk_token')
      .set('x-tenant-slug', 'demo')

    expect(response.status).toBe(200)
    expect(response.body.averageItemsPerOrder).toBe(2.3)
    expect(response.body.singleItemOrders).toBe(5)
  })
})
