import { beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'

const mockFindTenantByHost = vi.fn()
const mockFindTenantBySlug = vi.fn()
const mockFindOrderById = vi.fn()
const mockUpdateOrderStatus = vi.fn()

vi.mock('@repo/data-access', () => ({
  createTenantScope: (restaurantId: string) => ({ restaurantId }),
  createPlatformDataAccess: () => ({
    findTenantByHost: mockFindTenantByHost,
    findTenantBySlug: mockFindTenantBySlug
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
    mockFindTenantByHost.mockResolvedValue({
      id: 'rest_1',
      slug: 'demo'
    })
    mockFindTenantBySlug.mockResolvedValue({
      id: 'rest_1',
      slug: 'demo'
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
      .set('Host', 'demo.example.com')
      .send({ status: 'PREPARING' })

    expect(response.status).toBe(400)
    expect(response.body).toEqual({
      error: 'Invalid order status transition',
      currentStatus: 'READY',
      nextStatus: 'PREPARING'
    })
    expect(mockUpdateOrderStatus).not.toHaveBeenCalled()
  }, 10000)

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
      .set('x-tenant-slug', 'demo')
      .send({ status: 'PREPARING', actorAdminId: 'admin_1' })

    expect(response.status).toBe(200)
    expect(mockUpdateOrderStatus).toHaveBeenCalledWith(
      'order_1',
      'PREPARING',
      'admin_1'
    )
  })
})
