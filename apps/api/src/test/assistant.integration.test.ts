import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'

const mockVerifyToken = vi.fn()
const mockFindTenantByHost = vi.fn()
const mockFindTenantBySlug = vi.fn()
const mockFindAdminAccessByClerkUserId = vi.fn()
const mockClaimLegacyAdminAccessByEmail = vi.fn()
const mockGetPublicMenu = vi.fn()
const mockListFeaturedItems = vi.fn()
const mockListCategories = vi.fn()
const mockGetBrandConfig = vi.fn()
const mockCreateCategory = vi.fn()
const mockCreateItem = vi.fn()
const mockReorderCategoryItems = vi.fn()
const mockSetItemVisibility = vi.fn()
const mockUpdateItem = vi.fn()
const mockSetCategoryVisibility = vi.fn()

vi.mock('@clerk/backend', () => ({
  verifyToken: mockVerifyToken,
}))

// @repo/ai-assistant is NOT mocked here — the real handler runs.
// groq-sdk is mocked globally (global-mocks.ts) to prevent network calls at
// import time. Anthropic API calls use raw fetch, stubbed per-test below.

vi.mock('@repo/data-access', () => ({
  createTenantScope: (restaurantId: string) => ({ restaurantId }),
  createPlatformDataAccess: () => ({
    findTenantByHost: mockFindTenantByHost,
    findTenantBySlug: mockFindTenantBySlug,
    findAdminAccessByClerkUserId: mockFindAdminAccessByClerkUserId,
    claimLegacyAdminAccessByEmail: mockClaimLegacyAdminAccessByEmail,
  }),
  createTenantDataAccess: () => ({
    brand: {
      getConfig: mockGetBrandConfig,
      updateConfig: vi.fn(),
    },
    menu: {
      getPublicMenu: mockGetPublicMenu,
      listFeaturedItems: mockListFeaturedItems,
      listCategories: mockListCategories,
      createCategory: mockCreateCategory,
      updateCategory: vi.fn(),
      setCategoryVisibility: mockSetCategoryVisibility,
      reorderCategoryItems: mockReorderCategoryItems,
      deleteCategory: vi.fn(),
      listItems: vi.fn(),
      createItem: mockCreateItem,
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

describe.sequential('assistant integration', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.stubGlobal('fetch', anthropicFetch)

    mockVerifyToken.mockResolvedValue({ sub: 'user_1' })
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

    const categories = [
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
    ]

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
      categories,
      brandConfig: {
        config: {
          heroHeadline: 'Direct ordering',
        },
      },
      brand: null,
    })
    mockListCategories.mockResolvedValue(categories)
    mockCreateCategory.mockReset()
    mockReorderCategoryItems.mockResolvedValue(undefined)
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
                kind: 'actions',
                actions: [
                  {
                    action: 'set_item_visibility',
                    targetType: 'item',
                    targetQuery: 'Margherita Pizza',
                    visibility: 'SOLD_OUT',
                  },
                ],
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
  }, 30000)

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
                kind: 'actions',
                actions: [
                  {
                    action: 'set_item_visibility',
                    targetType: 'item',
                    targetQuery: 'pizza',
                    visibility: 'HIDDEN',
                  },
                ],
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
  }, 30000)

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
                kind: 'actions',
                actions: [
                  {
                    action: 'set_item_featured',
                    targetType: 'item',
                    targetQuery: 'Garlic Knots',
                    isFeatured: true,
                  },
                ],
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
  }, 30000)

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
                kind: 'actions',
                actions: [
                  {
                    action: 'set_category_visibility',
                    targetType: 'category',
                    targetQuery: 'Apps',
                    visibility: 'HIDDEN',
                  },
                ],
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
  }, 30000)

  it('executes add_item commands for a resolved category', async () => {
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
                kind: 'actions',
                actions: [
                  {
                    action: 'add_item',
                    targetType: 'category',
                    targetQuery: 'Apps',
                    itemName: 'caesar salad',
                    price: 12.99,
                    description: 'Romaine, parmesan, croutons',
                    isFeatured: true,
                  },
                ],
              },
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    )

    mockListCategories.mockResolvedValue([
      {
        id: 'cat_1',
        name: 'Pizza',
        visibility: 'AVAILABLE',
        categoryItems: [
          { id: 'link_1', item: { id: 'item_1', name: 'Margherita Pizza' } },
          { id: 'link_2', item: { id: 'item_2', name: 'Pepperoni Pizza' } },
        ],
      },
      {
        id: 'cat_2',
        name: 'Apps',
        visibility: 'AVAILABLE',
        categoryItems: [{ id: 'link_3', item: { id: 'item_3', name: 'Garlic Knots' } }],
      },
    ])
    mockCreateItem.mockResolvedValue({
      id: 'item_4',
      name: 'Caesar Salad',
    })

    const response = await request(createApp())
      .post('/v1/assistant/command')
      .set('x-tenant-slug', 'demo')
      .send({ message: 'add a caesar salad to Apps for $12.99' })

    expect(response.status).toBe(200)
    expect(mockCreateItem).toHaveBeenCalledWith({
      name: 'Caesar Salad',
      description: 'Romaine, parmesan, croutons',
      basePriceCents: 1299,
      isFeatured: true,
      photoUrl: null,
      tags: [],
      prepTimeMinutes: 0,
      specialInstructionsEnabled: false,
      visibility: 'AVAILABLE',
      categoryIds: ['cat_2'],
    })
    expect(mockReorderCategoryItems).toHaveBeenCalledWith({
      categoryId: 'cat_2',
      itemIds: ['item_3', 'item_4'],
    })
    expect(response.body).toEqual({
      reply: 'Added Caesar Salad to Apps for $12.99.',
      changes: [
        {
          resource: 'item',
          id: 'item_4',
          fields: ['name', 'basePriceCents', 'description', 'isFeatured'],
        },
      ],
      refresh: ['menu'],
    })
  }, 30000)

  it('executes add_category commands', async () => {
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
                kind: 'actions',
                actions: [
                  {
                    action: 'add_category',
                    categoryName: 'salads',
                  },
                ],
              },
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    )

    mockCreateCategory.mockResolvedValue({
      id: 'cat_3',
      name: 'Salads',
      visibility: 'AVAILABLE',
    })

    const response = await request(createApp())
      .post('/v1/assistant/command')
      .set('x-tenant-slug', 'demo')
      .send({ message: 'add a new section called salads' })

    expect(response.status).toBe(200)
    expect(mockCreateCategory).toHaveBeenCalledWith({
      name: 'Salads',
      sortOrder: 2,
      visibility: 'AVAILABLE',
    })
    expect(response.body).toEqual({
      reply:
        'Created the Salads category. You can now add items to it by saying "add Caesar Salad to Salads for $12.99".',
      changes: [
        {
          resource: 'category',
          id: 'cat_3',
          fields: ['name', 'sortOrder', 'visibility'],
        },
      ],
      refresh: ['menu'],
    })
  }, 30000)

  it('asks for clarification when add_item is missing a price', async () => {
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
                kind: 'clarification',
                message: 'What price would you like for Caesar Salad?',
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
      .send({ message: 'add caesar salad' })

    expect(response.status).toBe(200)
    expect(mockCreateItem).not.toHaveBeenCalled()
    expect(response.body).toEqual({
      reply: 'What price would you like for Caesar Salad?',
      changes: [],
      refresh: [],
      needsClarification: true,
    })
  }, 30000)

  it('executes multiple add_item actions and summarizes them naturally', async () => {
    await import('./setup')
    const { createApp } = await import('../app')

    const saladsMenu = {
      categories: [
        {
          id: 'cat_3',
          name: 'Salads',
          visibility: 'AVAILABLE',
          categoryItems: [],
        },
      ],
      brandConfig: {
        config: {
          heroHeadline: 'Direct ordering',
        },
      },
      brand: null,
    }

    const saladsMenuWithCaesar = {
      ...saladsMenu,
      categories: [
        {
          id: 'cat_3',
          name: 'Salads',
          visibility: 'AVAILABLE',
          categoryItems: [
            {
              id: 'link_4',
              item: {
                id: 'item_4',
                name: 'Caesar Salad',
                visibility: 'AVAILABLE',
                isFeatured: false,
              },
            },
          ],
        },
      ],
    }

    mockGetPublicMenu
      .mockResolvedValueOnce(saladsMenu)
      .mockResolvedValueOnce(saladsMenu)
      .mockResolvedValueOnce(saladsMenuWithCaesar)

    mockListCategories
      .mockResolvedValueOnce(saladsMenu.categories)
      .mockResolvedValueOnce(saladsMenuWithCaesar.categories)

    anthropicFetch
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            content: [
              {
                type: 'tool_use',
                id: 'toolu_1',
                name: 'classify_admin_command',
                input: {
                  kind: 'actions',
                  actions: [
                    {
                      action: 'add_item',
                      targetType: 'category',
                      targetQuery: 'Salads',
                      itemName: 'caesar salad',
                      price: 10,
                    },
                    {
                      action: 'add_item',
                      targetType: 'category',
                      targetQuery: 'Salads',
                      itemName: 'house salad',
                      price: 6,
                    },
                  ],
                },
              },
            ],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            content: [
              {
                type: 'text',
                text: 'Added Caesar Salad ($10.00) and House Salad ($6.00) to Salads.',
              },
            ],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      )

    mockCreateItem
      .mockResolvedValueOnce({
        id: 'item_4',
        name: 'Caesar Salad',
      })
      .mockResolvedValueOnce({
        id: 'item_5',
        name: 'House Salad',
      })

    const response = await request(createApp())
      .post('/v1/assistant/command')
      .set('x-tenant-slug', 'demo')
      .send({ message: 'add caesar salad for $10 and house salad for $6' })

    expect(response.status).toBe(200)
    expect(mockCreateItem).toHaveBeenNthCalledWith(1, {
      name: 'Caesar Salad',
      description: null,
      basePriceCents: 1000,
      isFeatured: false,
      photoUrl: null,
      tags: [],
      prepTimeMinutes: 0,
      specialInstructionsEnabled: false,
      visibility: 'AVAILABLE',
      categoryIds: ['cat_3'],
    })
    expect(mockCreateItem).toHaveBeenNthCalledWith(2, {
      name: 'House Salad',
      description: null,
      basePriceCents: 600,
      isFeatured: false,
      photoUrl: null,
      tags: [],
      prepTimeMinutes: 0,
      specialInstructionsEnabled: false,
      visibility: 'AVAILABLE',
      categoryIds: ['cat_3'],
    })
    expect(response.body).toEqual({
      reply: 'Added Caesar Salad ($10.00) and House Salad ($6.00) to Salads.',
      changes: [
        {
          resource: 'item',
          id: 'item_4',
          fields: ['name', 'basePriceCents', 'description', 'isFeatured'],
        },
        {
          resource: 'item',
          id: 'item_5',
          fields: ['name', 'basePriceCents', 'description', 'isFeatured'],
        },
      ],
      refresh: ['menu'],
    })
  }, 30000)

  it('refreshes tenant context between sequential actions', async () => {
    await import('./setup')
    const { createApp } = await import('../app')

    const initialMenu = {
      categories: [
        {
          id: 'cat_1',
          name: 'Pizza',
          visibility: 'AVAILABLE',
          categoryItems: [],
        },
      ],
      brandConfig: {
        config: {
          heroHeadline: 'Direct ordering',
        },
      },
      brand: null,
    }

    const updatedMenu = {
      ...initialMenu,
      categories: [
        ...initialMenu.categories,
        {
          id: 'cat_3',
          name: 'Salads',
          visibility: 'AVAILABLE',
          categoryItems: [],
        },
      ],
    }

    mockGetPublicMenu
      .mockResolvedValueOnce(initialMenu)
      .mockResolvedValueOnce(updatedMenu)

    mockListCategories
      .mockResolvedValueOnce(initialMenu.categories)
      .mockResolvedValueOnce(updatedMenu.categories)

    anthropicFetch
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            content: [
              {
                type: 'tool_use',
                id: 'toolu_1',
                name: 'classify_admin_command',
                input: {
                  kind: 'actions',
                  actions: [
                    {
                      action: 'add_category',
                      categoryName: 'salads',
                    },
                    {
                      action: 'add_item',
                      targetType: 'category',
                      targetQuery: 'salads',
                      itemName: 'caesar salad',
                      price: 12.99,
                    },
                  ],
                },
              },
            ],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            content: [
              {
                type: 'text',
                text: 'Created Salads and added Caesar Salad ($12.99) to it.',
              },
            ],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      )

    mockCreateCategory.mockResolvedValue({
      id: 'cat_3',
      name: 'Salads',
      visibility: 'AVAILABLE',
    })
    mockCreateItem.mockResolvedValue({
      id: 'item_4',
      name: 'Caesar Salad',
    })

    const response = await request(createApp())
      .post('/v1/assistant/command')
      .set('x-tenant-slug', 'demo')
      .send({ message: 'add a new section called salads and add caesar salad to salads for $12.99' })

    expect(response.status).toBe(200)
    expect(mockCreateCategory).toHaveBeenCalledWith({
      name: 'Salads',
      sortOrder: 1,
      visibility: 'AVAILABLE',
    })
    expect(mockCreateItem).toHaveBeenCalledWith({
      name: 'Caesar Salad',
      description: null,
      basePriceCents: 1299,
      isFeatured: false,
      photoUrl: null,
      tags: [],
      prepTimeMinutes: 0,
      specialInstructionsEnabled: false,
      visibility: 'AVAILABLE',
      categoryIds: ['cat_3'],
    })
    expect(response.body).toEqual({
      reply: 'Created Salads and added Caesar Salad ($12.99) to it.',
      changes: [
        {
          resource: 'category',
          id: 'cat_3',
          fields: ['name', 'sortOrder', 'visibility'],
        },
        {
          resource: 'item',
          id: 'item_4',
          fields: ['name', 'basePriceCents', 'description', 'isFeatured'],
        },
      ],
      refresh: ['menu'],
    })
  }, 30000)

  it('passes conversation history so follow-up confirmations like yes can execute', async () => {
    await import('./setup')
    const { createApp } = await import('../app')

    anthropicFetch.mockImplementationOnce(async (_url, init) => {
      const body = JSON.parse(String(init?.body ?? '{}'))

      expect(body.messages).toEqual([
        {
          role: 'assistant',
          content: 'I can hide Margherita Pizza from your menu. Do it?',
        },
        {
          role: 'user',
          content: expect.stringContaining('Tenant context:\n'),
        },
      ])

      return new Response(
        JSON.stringify({
          content: [
            {
              type: 'tool_use',
              id: 'toolu_1',
              name: 'classify_admin_command',
              input: {
                kind: 'actions',
                actions: [
                  {
                    action: 'set_item_visibility',
                    targetType: 'item',
                    targetQuery: 'Margherita Pizza',
                    visibility: 'HIDDEN',
                  },
                ],
              },
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      )
    })

    mockSetItemVisibility.mockResolvedValue({
      id: 'item_1',
      name: 'Margherita Pizza',
      visibility: 'HIDDEN',
    })

    const response = await request(createApp())
      .post('/v1/assistant/command')
      .set('x-tenant-slug', 'demo')
      .send({
        message: 'yes',
        history: [
          {
            role: 'assistant',
            content: 'I can hide Margherita Pizza from your menu. Do it?',
          },
        ],
      })

    expect(response.status).toBe(200)
    expect(mockSetItemVisibility).toHaveBeenCalledWith('item_1', 'HIDDEN')
    expect(response.body).toEqual({
      reply: 'Hid Margherita Pizza from the storefront.',
      changes: [
        {
          resource: 'item',
          id: 'item_1',
          fields: ['visibility'],
        },
      ],
      refresh: ['menu'],
    })
  }, 30000)

  it('executes add_item after a clarification follow-up that supplies category and price', async () => {
    await import('./setup')
    const { createApp } = await import('../app')

    mockListCategories.mockResolvedValue([
      {
        id: 'cat_1',
        name: 'Pizza',
        visibility: 'AVAILABLE',
        categoryItems: [],
      },
      {
        id: 'cat_2',
        name: 'Apps',
        visibility: 'AVAILABLE',
        categoryItems: [],
      },
    ])

    mockCreateItem.mockResolvedValue({
      id: 'item_9',
      name: 'Calzone',
    })

    anthropicFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          content: [
            {
              type: 'tool_use',
              id: 'toolu_repro_1',
              name: 'classify_admin_command',
              input: {
                kind: 'actions',
                actions: [
                  {
                    action: 'add_item',
                    categoryName: 'Apps',
                    itemName: 'Calzone',
                    price: 7,
                  },
                ],
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
      .send({
        message: 'yes add to apps, calzone $7',
        history: [
          { role: 'user', content: 'add calzone' },
          { role: 'assistant', content: 'What price and which category?' },
        ],
      })

    expect(response.status).toBe(200)
    expect(mockCreateItem).toHaveBeenCalledWith({
      name: 'Calzone',
      description: null,
      basePriceCents: 700,
      isFeatured: false,
      photoUrl: null,
      tags: [],
      prepTimeMinutes: 0,
      specialInstructionsEnabled: false,
      visibility: 'AVAILABLE',
      categoryIds: ['cat_2'],
    })
    expect(response.body).toEqual({
      reply: 'Added Calzone to Apps for $7.00.',
      changes: [
        {
          resource: 'item',
          id: 'item_9',
          fields: ['name', 'basePriceCents', 'description', 'isFeatured'],
        },
      ],
      refresh: ['menu'],
    })
  }, 30000)
})
