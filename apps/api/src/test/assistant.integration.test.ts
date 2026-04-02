import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'

const mockFindTenantByHost = vi.fn()
const mockFindTenantBySlug = vi.fn()
const mockGetPublicMenu = vi.fn()
const mockListFeaturedItems = vi.fn()
const mockGetBrandConfig = vi.fn()
const mockSetItemVisibility = vi.fn()
const mockUpdateItem = vi.fn()
const mockSetCategoryVisibility = vi.fn()

vi.mock('@repo/data-access', () => ({
  createTenantScope: (restaurantId: string) => ({ restaurantId }),
  createPlatformDataAccess: () => ({
    findTenantByHost: mockFindTenantByHost,
    findTenantBySlug: mockFindTenantBySlug,
  }),
  createTenantDataAccess: () => ({
    brand: {
      getConfig: mockGetBrandConfig,
      updateConfig: vi.fn(),
    },
    menu: {
      getPublicMenu: mockGetPublicMenu,
      listFeaturedItems: mockListFeaturedItems,
      listCategories: vi.fn(),
      createCategory: vi.fn(),
      updateCategory: vi.fn(),
      setCategoryVisibility: mockSetCategoryVisibility,
      reorderCategoryItems: vi.fn(),
      deleteCategory: vi.fn(),
      listItems: vi.fn(),
      createItem: vi.fn(),
      updateItem: mockUpdateItem,
      setItemVisibility: mockSetItemVisibility,
      deleteItem: vi.fn(),
      listVariants: vi.fn(),
      createVariant: vi.fn(),
      updateVariant: vi.fn(),
      deleteVariant: vi.fn(),
      listModifierGroups: vi.fn(),
      createModifierGroup: vi.fn(),
      updateModifierGroup: vi.fn(),
      deleteModifierGroup: vi.fn(),
      createModifierOption: vi.fn(),
      updateModifierOption: vi.fn(),
      deleteModifierOption: vi.fn(),
      listItemModifierGroups: vi.fn(),
      attachModifierGroup: vi.fn(),
      updateItemModifierGroup: vi.fn(),
      deleteItemModifierGroup: vi.fn(),
    },
    customers: {},
    orders: {},
  }),
}))

const anthropicFetch = vi.fn()

describe('assistant integration', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.stubGlobal('fetch', anthropicFetch)

    mockFindTenantByHost.mockResolvedValue({
      id: 'rest_1',
      slug: 'demo',
    })
    mockFindTenantBySlug.mockResolvedValue({
      id: 'rest_1',
      slug: 'demo',
    })
    mockGetBrandConfig.mockResolvedValue({
      config: {
        heroHeadline: 'Direct ordering',
      },
    })
    mockGetPublicMenu.mockResolvedValue({
      categories: [
        {
          id: 'cat_1',
          name: 'Pizza',
          visibility: 'AVAILABLE',
          categoryItems: [
            {
              id: 'link_1',
              item: {
                id: 'item_1',
                name: 'Margherita Pizza',
                visibility: 'AVAILABLE',
                isFeatured: false,
              },
            },
            {
              id: 'link_2',
              item: {
                id: 'item_2',
                name: 'Pepperoni Pizza',
                visibility: 'AVAILABLE',
                isFeatured: false,
              },
            },
          ],
        },
        {
          id: 'cat_2',
          name: 'Apps',
          visibility: 'AVAILABLE',
          categoryItems: [
            {
              id: 'link_3',
              item: {
                id: 'item_3',
                name: 'Garlic Knots',
                visibility: 'AVAILABLE',
                isFeatured: false,
              },
            },
          ],
        },
      ],
      brandConfig: {
        config: {
          heroHeadline: 'Direct ordering',
        },
      },
      brand: null,
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('executes item visibility changes from assistant commands', async () => {
    await import('./setup')
    const { createApp } = await import('../app')

    anthropicFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          content: [
            {
              type: 'tool_use',
              id: 'toolu_1',
              name: 'classify_admin_command',
              input: {
                action: 'set_item_visibility',
                targetType: 'item',
                targetQuery: 'Margherita Pizza',
                visibility: 'SOLD_OUT',
              },
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    )
    mockSetItemVisibility.mockResolvedValue({
      id: 'item_1',
      name: 'Margherita Pizza',
      visibility: 'SOLD_OUT',
    })

    const response = await request(createApp())
      .post('/v1/assistant/command')
      .set('x-tenant-slug', 'demo')
      .send({ message: 'mark Margherita Pizza as sold out' })

    expect(response.status).toBe(200)
    expect(mockSetItemVisibility).toHaveBeenCalledWith('item_1', 'SOLD_OUT')
    expect(response.body).toEqual({
      reply: 'Marked Margherita Pizza as sold out.',
      changes: [
        {
          resource: 'item',
          id: 'item_1',
          fields: ['visibility'],
        },
      ],
      refresh: ['menu'],
    })
  }, 10000)

  it('returns clarification for ambiguous item matches without mutating', async () => {
    await import('./setup')
    const { createApp } = await import('../app')

    anthropicFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          content: [
            {
              type: 'tool_use',
              id: 'toolu_1',
              name: 'classify_admin_command',
              input: {
                action: 'set_item_visibility',
                targetType: 'item',
                targetQuery: 'pizza',
                visibility: 'HIDDEN',
              },
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    )

    const response = await request(createApp())
      .post('/v1/assistant/command')
      .set('x-tenant-slug', 'demo')
      .send({ message: 'hide pizza' })

    expect(response.status).toBe(200)
    expect(mockSetItemVisibility).not.toHaveBeenCalled()
    expect(response.body).toEqual({
      reply: 'I found multiple items matching "pizza". Which one did you mean?',
      changes: [],
      refresh: [],
      needsClarification: true,
      options: [
        { id: 'item_1', label: 'Margherita Pizza' },
        { id: 'item_2', label: 'Pepperoni Pizza' },
      ],
    })
  }, 10000)

  it('executes item featured changes from assistant commands', async () => {
    await import('./setup')
    const { createApp } = await import('../app')

    anthropicFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          content: [
            {
              type: 'tool_use',
              id: 'toolu_1',
              name: 'classify_admin_command',
              input: {
                action: 'set_item_featured',
                targetType: 'item',
                targetQuery: 'Garlic Knots',
                isFeatured: true,
              },
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    )
    mockUpdateItem.mockResolvedValue({
      id: 'item_3',
      name: 'Garlic Knots',
      isFeatured: true,
    })

    const response = await request(createApp())
      .post('/v1/assistant/command')
      .set('x-tenant-slug', 'demo')
      .send({ message: 'feature Garlic Knots' })

    expect(response.status).toBe(200)
    expect(mockUpdateItem).toHaveBeenCalledWith('item_3', { isFeatured: true })
    expect(response.body).toEqual({
      reply: 'Marked Garlic Knots as featured.',
      changes: [
        {
          resource: 'item',
          id: 'item_3',
          fields: ['isFeatured'],
        },
      ],
      refresh: ['menu'],
    })
  }, 10000)

  it('executes category visibility changes from assistant commands', async () => {
    await import('./setup')
    const { createApp } = await import('../app')

    anthropicFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          content: [
            {
              type: 'tool_use',
              id: 'toolu_1',
              name: 'classify_admin_command',
              input: {
                action: 'set_category_visibility',
                targetType: 'category',
                targetQuery: 'Apps',
                visibility: 'HIDDEN',
              },
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    )
    mockSetCategoryVisibility.mockResolvedValue({
      id: 'cat_2',
      name: 'Apps',
      visibility: 'HIDDEN',
    })

    const response = await request(createApp())
      .post('/v1/assistant/command')
      .set('x-tenant-slug', 'demo')
      .send({ message: 'hide the apps category' })

    expect(response.status).toBe(200)
    expect(mockSetCategoryVisibility).toHaveBeenCalledWith('cat_2', 'HIDDEN')
    expect(response.body).toEqual({
      reply: 'Hid the Apps category.',
      changes: [
        {
          resource: 'category',
          id: 'cat_2',
          fields: ['visibility'],
        },
      ],
      refresh: ['menu'],
    })
  }, 10000)
})
