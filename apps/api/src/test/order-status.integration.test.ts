import { beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'

const mockVerifyToken = vi.fn()
const mockFindTenantByHost = vi.fn()
const mockFindTenantBySlug = vi.fn()
const mockFindAdminAccessByClerkUserId = vi.fn()
const mockClaimLegacyAdminAccessByEmail = vi.fn()
const mockFindOrderById = vi.fn()
const mockUpdateOrderStatus = vi.fn()
const mockVerifyCustomerAccessToken = vi.fn()

vi.mock('@clerk/backend', () => ({
  verifyToken: mockVerifyToken,
}))

vi.mock('@repo/auth', async () => {
  const actual = await vi.importActual<typeof import('@repo/auth')>('@repo/auth')
  return {
    ...actual,
    verifyCustomerAccessToken: mockVerifyCustomerAccessToken,
  }
})

vi.mock('@repo/data-access', () => ({
  createTenantScope: (restaurantId: string) => ({ restaurantId }),
  createPlatformDataAccess: () => ({
    findTenantByHost: mockFindTenantByHost,
    findTenantBySlug: mockFindTenantBySlug,
    findAdminAccessByClerkUserId: mockFindAdminAccessByClerkUserId,
    claimLegacyAdminAccessByEmail: mockClaimLegacyAdminAccessByEmail,
  }),
  createTenantDataAccess: () => ({
    menu: {
      getPublicMenu: vi.fn(),
      listFeaturedItems: vi.fn()
    },
    customers: {},
    orders: {
      findById: mockFindOrderById,
      updateStatus: mockUpdateOrderStatus,
      createOrder: vi.fn(),
      listActiveKitchenOrders: vi.fn()
    }
  })
}))

describe('order status integration', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockVerifyToken.mockResolvedValue({ sub: 'user_1' })
    mockFindTenantByHost.mockResolvedValue({
      id: 'rest_1',
      slug: 'demo'
    })
    mockFindTenantBySlug.mockResolvedValue({
      id: 'rest_1',
      slug: 'demo'
    })
    mockFindAdminAccessByClerkUserId.mockResolvedValue({
      adminUserId: 'admin_1',
      clerkUserId: 'user_1',
      email: 'owner@demo.test',
      role: 'owner',
      restaurantId: 'rest_1',
      tenantSlug: 'demo',
      restaurantName: 'Demo Restaurant',
    })
    mockClaimLegacyAdminAccessByEmail.mockResolvedValue(null)
    mockVerifyCustomerAccessToken.mockReturnValue({
      sub: 'cust_1',
      customerId: 'cust_1',
      restaurantId: 'rest_1',
      phone: '+15555550123',
      type: 'customer-access'
    })
  })

  it('returns 400 for an invalid transition', async () => {
    await import('./setup')
    const { createApp } = await import('../app')

    mockFindOrderById.mockResolvedValue({
      id: 'order_1',
      status: 'READY'
    })

    const response = await request(createApp())
      .patch('/admin/orders/order_1/status')
      .set('Authorization', 'Bearer clerk_token')
      .set('Host', 'demo.example.com')
      .send({ status: 'PREPARING' })

    expect(response.status).toBe(400)
    expect(response.body).toEqual({
      error: 'Invalid order status transition',
      currentStatus: 'READY',
      nextStatus: 'PREPARING'
    })
    expect(mockUpdateOrderStatus).not.toHaveBeenCalled()
  })

  it('updates status for a valid transition', async () => {
    await import('./setup')
    const { createApp } = await import('../app')

    mockFindOrderById.mockResolvedValue({
      id: 'order_1',
      status: 'CONFIRMED'
    })
    mockUpdateOrderStatus.mockResolvedValue({
      id: 'order_1',
      status: 'PREPARING'
    })

    const response = await request(createApp())
      .patch('/admin/orders/order_1/status')
      .set('Authorization', 'Bearer clerk_token')
      .set('x-tenant-slug', 'demo')
      .send({ status: 'PREPARING', actorAdminId: 'admin_1' })

    expect(response.status).toBe(200)
    expect(mockUpdateOrderStatus).toHaveBeenCalledWith(
      'order_1',
      'PREPARING',
      'admin_1'
    )
  })

  it('returns the customer order when the access token matches the order owner', async () => {
    await import('./setup')
    const { createApp } = await import('../app')

    mockFindOrderById.mockResolvedValue({
      id: 'order_1',
      customerId: 'cust_1',
      orderNumber: 42,
      status: 'PREPARING',
      paymentStatus: 'PENDING',
      fulfillmentType: 'PICKUP',
      subtotalCents: 1200,
      taxCents: 100,
      discountCents: 0,
      totalCents: 1300,
      notes: 'Extra napkins',
      pickupTime: null,
      createdAt: new Date('2026-04-01T12:00:00.000Z'),
      updatedAt: new Date('2026-04-01T12:05:00.000Z'),
      customerNameSnapshot: 'Casey',
      customerPhoneSnapshot: '+15555550123',
      items: [
        {
          id: 'item_1',
          name: 'Pepperoni Slice',
          variantName: null,
          quantity: 2,
          unitPriceCents: 600,
          linePriceCents: 1200,
          notes: null,
          modifierSelections: []
        }
      ],
      statusEvents: [
        {
          id: 'event_1',
          fromStatus: null,
          toStatus: 'PENDING',
          source: 'customer',
          createdAt: new Date('2026-04-01T12:00:00.000Z')
        }
      ]
    })

    const response = await request(createApp())
      .get('/v1/orders/order_1')
      .set('x-tenant-slug', 'demo')
      .set('Authorization', 'Bearer access_123')

    expect(response.status).toBe(200)
    expect(mockVerifyCustomerAccessToken).toHaveBeenCalledTimes(1)
    expect(response.body).toMatchObject({
      id: 'order_1',
      orderNumber: 42,
      status: 'PREPARING',
      customerNameSnapshot: 'Casey'
    })
  })

  it('rejects customer order lookup when the order belongs to another customer', async () => {
    await import('./setup')
    const { createApp } = await import('../app')

    mockFindOrderById.mockResolvedValue({
      id: 'order_1',
      customerId: 'cust_other',
      orderNumber: 42,
      status: 'PREPARING',
      paymentStatus: 'PENDING',
      fulfillmentType: 'PICKUP',
      subtotalCents: 1200,
      taxCents: 100,
      discountCents: 0,
      totalCents: 1300,
      notes: null,
      pickupTime: null,
      createdAt: new Date('2026-04-01T12:00:00.000Z'),
      updatedAt: new Date('2026-04-01T12:05:00.000Z'),
      customerNameSnapshot: 'Casey',
      customerPhoneSnapshot: '+15555550123',
      items: [],
      statusEvents: []
    })

    const response = await request(createApp())
      .get('/v1/orders/order_1')
      .set('x-tenant-slug', 'demo')
      .set('Authorization', 'Bearer access_123')

    expect(response.status).toBe(403)
    expect(response.body).toEqual({
      error: 'Order does not belong to this customer'
    })
  })

  it('returns public order status without customer auth', async () => {
    await import('./setup')
    const { createApp } = await import('../app')

    mockFindOrderById.mockResolvedValue({
      id: 'order_1',
      customerId: 'cust_1',
      orderNumber: 42,
      status: 'PREPARING',
      paymentStatus: 'PENDING',
      fulfillmentType: 'PICKUP',
      subtotalCents: 1200,
      taxCents: 100,
      discountCents: 0,
      totalCents: 1300,
      notes: 'Extra napkins',
      pickupTime: null,
      createdAt: new Date('2026-04-01T12:00:00.000Z'),
      updatedAt: new Date('2026-04-01T12:05:00.000Z'),
      customerNameSnapshot: 'Casey',
      customerPhoneSnapshot: '+15555550123',
      items: [
        {
          id: 'item_1',
          name: 'Pepperoni Slice',
          variantName: null,
          quantity: 2,
          unitPriceCents: 600,
          linePriceCents: 1200,
          notes: null,
          modifierSelections: []
        }
      ],
      statusEvents: [
        {
          id: 'event_1',
          fromStatus: null,
          toStatus: 'PENDING',
          source: 'customer',
          createdAt: new Date('2026-04-01T12:00:00.000Z')
        }
      ]
    })

    const response = await request(createApp())
      .get('/v1/orders/order_1/status')
      .set('x-tenant-slug', 'demo')

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({
      id: 'order_1',
      orderNumber: 42,
      status: 'PREPARING',
      customerNameSnapshot: 'Casey'
    })
    expect(mockVerifyCustomerAccessToken).not.toHaveBeenCalled()
  })

  it('returns 404 for public order status when the order is not found for the tenant', async () => {
    await import('./setup')
    const { createApp } = await import('../app')

    mockFindOrderById.mockResolvedValue(null)

    const response = await request(createApp())
      .get('/v1/orders/order_missing/status')
      .set('x-tenant-slug', 'demo')

    expect(response.status).toBe(404)
    expect(response.body).toEqual({
      error: 'Order not found'
    })
  })
})
