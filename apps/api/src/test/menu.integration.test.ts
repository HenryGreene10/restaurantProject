import { beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'

const mockFindTenantByHost = vi.fn()
const mockFindTenantBySlug = vi.fn()
const mockGetPublicMenu = vi.fn()
const mockListFeaturedItems = vi.fn()

vi.mock('@repo/data-access', () => ({
  createTenantScope: (restaurantId: string) => ({ restaurantId }),
  createPlatformDataAccess: () => ({
    findTenantByHost: mockFindTenantByHost,
    findTenantBySlug: mockFindTenantBySlug
  }),
  createTenantDataAccess: () => ({
    menu: {
      getPublicMenu: mockGetPublicMenu,
      listFeaturedItems: mockListFeaturedItems
    },
    customers: {},
    orders: {}
  })
}))

describe('menu integration', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockFindTenantBySlug.mockResolvedValue({
      id: 'rest_1',
      slug: 'demo'
    })
  })

  it('resolves tenant from host and returns tenant-scoped menu data', async () => {
    await import('./setup')
    const { createApp } = await import('../app')

    mockFindTenantByHost.mockResolvedValue({
      id: 'rest_1',
      slug: 'demo'
    })
    mockGetPublicMenu.mockResolvedValue({
      menu: { id: 'menu_1', name: 'Main Menu' },
      categories: [{ id: 'cat_1', name: 'Pizza', items: [] }],
      brandConfig: { restaurantId: 'rest_1', config: { appTitle: 'Demo' } }
    })

    const response = await request(createApp())
      .get('/v1/menu')
      .set('Host', 'demo.example.com')

    expect(response.status).toBe(200)
    expect(mockFindTenantByHost).toHaveBeenCalledWith('demo.example.com')
    expect(mockGetPublicMenu).toHaveBeenCalledTimes(1)
    expect(response.body.categories).toHaveLength(1)
  })

  it('serves the documented /menu route with x-tenant-slug', async () => {
    await import('./setup')
    const { createApp } = await import('../app')

    mockGetPublicMenu.mockResolvedValue({
      menu: { id: 'menu_1', name: 'Main Menu' },
      categories: [{ id: 'cat_1', name: 'Pizza', items: [] }],
      brandConfig: { restaurantId: 'rest_1', config: { appTitle: 'Joe\'s Pizza' } }
    })

    const response = await request(createApp())
      .get('/menu')
      .set('x-tenant-slug', 'joes-pizza')

    expect(response.status).toBe(200)
    expect(mockFindTenantBySlug).toHaveBeenCalledWith('joes-pizza')
    expect(mockGetPublicMenu).toHaveBeenCalledTimes(1)
  })

  it('resolves tenant from x-tenant-slug when present', async () => {
    await import('./setup')
    const { createApp } = await import('../app')

    mockGetPublicMenu.mockResolvedValue({
      menu: { id: 'menu_1', name: 'Main Menu' },
      categories: [],
      brandConfig: null
    })

    const response = await request(createApp())
      .get('/v1/menu')
      .set('x-tenant-slug', 'demo')

    expect(response.status).toBe(200)
    expect(mockFindTenantBySlug).toHaveBeenCalledWith('demo')
    expect(mockFindTenantByHost).not.toHaveBeenCalled()
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
