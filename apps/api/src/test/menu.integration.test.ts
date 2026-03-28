import { beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'

const mockFindTenantByHost = vi.fn()
const mockListCategoriesWithItems = vi.fn()

vi.mock('@repo/data-access', () => ({
  createTenantScope: (restaurantId: string) => ({ restaurantId }),
  createPlatformDataAccess: () => ({
    findTenantByHost: mockFindTenantByHost
  }),
  createTenantDataAccess: () => ({
    menu: {
      listCategoriesWithItems: mockListCategoriesWithItems
    },
    customers: {},
    orders: {}
  })
}))

describe('menu integration', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('resolves tenant from host and returns tenant-scoped menu data', async () => {
    await import('./setup')
    const { createApp } = await import('../app')

    mockFindTenantByHost.mockResolvedValue({
      id: 'rest_1',
      slug: 'demo'
    })
    mockListCategoriesWithItems.mockResolvedValue({
      categories: [{ id: 'cat_1', name: 'Pizza', items: [] }],
      brand: { restaurantId: 'rest_1', config: { appTitle: 'Demo' } }
    })

    const response = await request(createApp())
      .get('/v1/menu')
      .set('Host', 'demo.example.com')

    expect(response.status).toBe(200)
    expect(mockFindTenantByHost).toHaveBeenCalledWith('demo.example.com')
    expect(mockListCategoriesWithItems).toHaveBeenCalledTimes(1)
    expect(response.body.categories).toHaveLength(1)
  })

  it('returns 404 when tenant cannot be resolved', async () => {
    await import('./setup')
    const { createApp } = await import('../app')

    mockFindTenantByHost.mockResolvedValue(null)

    const response = await request(createApp())
      .get('/v1/menu')
      .set('Host', 'missing.example.com')

    expect(response.status).toBe(404)
    expect(response.body.error).toBe('Unknown tenant')
  })
})
