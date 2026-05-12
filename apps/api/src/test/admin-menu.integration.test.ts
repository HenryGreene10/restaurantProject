import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import type { Express } from 'express'

const mockFindTenantByHost = vi.fn()
const mockFindTenantBySlug = vi.fn()
const mockFindAdminAccessByClerkUserId = vi.fn()
const mockListCategories = vi.fn()
const mockCreateCategory = vi.fn()
const mockUpdateCategory = vi.fn()
const mockSetCategoryVisibility = vi.fn()
const mockDeleteCategory = vi.fn()
const mockListItems = vi.fn()
const mockCreateItem = vi.fn()
const mockUpdateItem = vi.fn()
const mockSetItemVisibility = vi.fn()
const mockDeleteItem = vi.fn()
const mockListVariants = vi.fn()
const mockCreateVariant = vi.fn()
const mockUpdateVariant = vi.fn()
const mockDeleteVariant = vi.fn()
const mockListModifierGroups = vi.fn()
const mockCreateModifierGroup = vi.fn()
const mockUpdateModifierGroup = vi.fn()
const mockDeleteModifierGroup = vi.fn()
const mockCreateModifierOption = vi.fn()
const mockUpdateModifierOption = vi.fn()
const mockDeleteModifierOption = vi.fn()
const mockListItemModifierGroups = vi.fn()
const mockAttachModifierGroup = vi.fn()
const mockUpdateItemModifierGroup = vi.fn()
const mockDeleteItemModifierGroup = vi.fn()
const mockGetBrandConfig = vi.fn()
const mockUpdateBrandConfig = vi.fn()
const mockReorderCategoryItems = vi.fn()

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
    brand: {
      getConfig: mockGetBrandConfig,
      updateConfig: mockUpdateBrandConfig,
    },
    menu: {
      getPublicMenu: vi.fn(),
      listFeaturedItems: vi.fn(),
      listCategories: mockListCategories,
      createCategory: mockCreateCategory,
      updateCategory: mockUpdateCategory,
      setCategoryVisibility: mockSetCategoryVisibility,
      reorderCategoryItems: mockReorderCategoryItems,
      deleteCategory: mockDeleteCategory,
      listItems: mockListItems,
      createItem: mockCreateItem,
      updateItem: mockUpdateItem,
      setItemVisibility: mockSetItemVisibility,
      deleteItem: mockDeleteItem,
      listVariants: mockListVariants,
      createVariant: mockCreateVariant,
      updateVariant: mockUpdateVariant,
      deleteVariant: mockDeleteVariant,
      listModifierGroups: mockListModifierGroups,
      createModifierGroup: mockCreateModifierGroup,
      updateModifierGroup: mockUpdateModifierGroup,
      deleteModifierGroup: mockDeleteModifierGroup,
      createModifierOption: mockCreateModifierOption,
      updateModifierOption: mockUpdateModifierOption,
      deleteModifierOption: mockDeleteModifierOption,
      listItemModifierGroups: mockListItemModifierGroups,
      attachModifierGroup: mockAttachModifierGroup,
      updateItemModifierGroup: mockUpdateItemModifierGroup,
      deleteItemModifierGroup: mockDeleteItemModifierGroup,
    },
    customers: {},
    orders: {},
  }),
}))

describe('admin menu integration', () => {
  let createApp!: () => Express

  beforeAll(async () => {
    await import('./setup')
    ;({ createApp } = await import('../app'))
  })

  beforeEach(() => {
    vi.resetAllMocks()
    mockVerifyToken.mockResolvedValue({ sub: 'user_1' })
    mockFindTenantByHost.mockResolvedValue({
      id: 'rest_1',
      slug: 'demo',
    })
    mockFindTenantBySlug.mockResolvedValue({
      id: 'rest_1',
      slug: 'demo',
    })
    mockFindAdminAccessByClerkUserId.mockResolvedValue({
      adminUserId: 'admin_1',
      clerkUserId: 'user_1',
      email: 'owner@demo.test',
      role: 'owner',
      restaurantId: 'rest_1',
      tenantSlug: 'demo',
      restaurantName: 'Demo Restaurant',
      subscriptionStatus: 'ACTIVE',
    })
  })

  it('creates a tenant-scoped category', async () => {
    mockCreateCategory.mockResolvedValue({
      id: 'cat_1',
      name: 'Pizza',
      menuId: 'menu_1',
    })

    const response = await request(createApp())
      .post('/admin/menu/categories')
      .set('Authorization', 'Bearer clerk_token')
      .set('Host', 'demo.example.com')
      .send({ name: 'Pizza', menuId: 'menu_1', sortOrder: 1 })

    expect(response.status).toBe(201)
    expect(mockCreateCategory).toHaveBeenCalledWith({
      menuId: 'menu_1',
      name: 'Pizza',
      sortOrder: 1,
      visibility: 'AVAILABLE',
      availableFrom: null,
      availableUntil: null,
      daysOfWeek: null,
    })
  })

  it('updates item availability', async () => {
    mockSetItemVisibility.mockResolvedValue({
      id: 'item_1',
      visibility: 'SOLD_OUT',
    })

    const response = await request(createApp())
      .patch('/admin/menu/items/item_1/availability')
      .set('Authorization', 'Bearer clerk_token')
      .set('Host', 'demo.example.com')
      .send({ visibility: 'SOLD_OUT' })

    expect(response.status).toBe(200)
    expect(mockSetItemVisibility).toHaveBeenCalledWith('item_1', 'SOLD_OUT')
  })

  it('creates modifier options under a specific group', async () => {
    mockCreateModifierOption.mockResolvedValue({
      id: 'opt_1',
      groupId: 'group_1',
      name: 'Mushrooms',
    })

    const response = await request(createApp())
      .post('/admin/menu/modifier-groups/group_1/options')
      .set('Authorization', 'Bearer clerk_token')
      .set('Host', 'demo.example.com')
      .send({ name: 'Mushrooms', priceDeltaCents: 200, position: 1 })

    expect(response.status).toBe(201)
    expect(mockCreateModifierOption).toHaveBeenCalledWith({
      groupId: 'group_1',
      name: 'Mushrooms',
      priceDeltaCents: 200,
      position: 1,
    })
  })

  it('attaches a modifier group to an item', async () => {
    mockAttachModifierGroup.mockResolvedValue({
      id: 'img_1',
      itemId: 'item_1',
      groupId: 'group_1',
    })

    const response = await request(createApp())
      .post('/admin/menu/items/item_1/modifier-groups')
      .set('Authorization', 'Bearer clerk_token')
      .set('x-tenant-slug', 'demo')
      .send({
        groupId: 'group_1',
        isRequired: true,
        minSelections: 1,
        maxSelections: 2,
        allowOptionQuantity: false,
      })

    expect(response.status).toBe(201)
    expect(mockAttachModifierGroup).toHaveBeenCalledWith({
      itemId: 'item_1',
      groupId: 'group_1',
      isRequired: true,
      minSelections: 1,
      maxSelections: 2,
      allowOptionQuantity: false,
    })
  })

  it('updates tenant brand config', async () => {
    mockUpdateBrandConfig.mockResolvedValue({
      id: 'brand_1',
      restaurantId: 'rest_1',
      config: {
        appTitle: "Joe's Pizza",
        primaryColor: '#b42318',
        radius: 24,
      },
    })

    const response = await request(createApp())
      .patch('/admin/brand-config')
      .set('Authorization', 'Bearer clerk_token')
      .set('x-tenant-slug', 'demo')
      .send({
        appTitle: "Joe's Pizza",
        primaryColor: '#b42318',
        radius: 24,
      })

    expect(response.status).toBe(200)
    expect(mockUpdateBrandConfig).toHaveBeenCalledWith({
      appTitle: "Joe's Pizza",
      tagline: undefined,
      heroHeadline: undefined,
      heroSubheadline: undefined,
      heroBadgeText: undefined,
      promoBannerText: undefined,
      primaryColor: '#b42318',
      accentColor: undefined,
      backgroundColor: undefined,
      surfaceColor: undefined,
      textColor: undefined,
      mutedColor: undefined,
      borderColor: undefined,
      onPrimary: undefined,
      fontFamily: undefined,
      headingFont: undefined,
      radius: 24,
      buttonStyle: undefined,
      heroLayout: undefined,
      menuCardLayout: undefined,
      heroImageUrl: undefined,
      showFeaturedBadges: undefined,
      showCategoryChips: undefined,
    })
  })

  it('creates a menu item with category assignment', async () => {
    mockCreateItem.mockResolvedValue({
      id: 'item_1',
      name: 'Margherita Pizza',
      basePriceCents: 1299,
      visibility: 'AVAILABLE',
      categoryItems: [],
      variants: [],
      itemModifierGroups: [],
    })

    const response = await request(createApp())
      .post('/admin/menu/items')
      .set('Authorization', 'Bearer clerk_token')
      .set('Host', 'demo.example.com')
      .send({
        name: 'Margherita Pizza',
        basePriceCents: 1299,
        categoryIds: ['cat_1'],
        visibility: 'AVAILABLE',
      })

    expect(response.status).toBe(201)
    expect(mockCreateItem).toHaveBeenCalledWith({
      name: 'Margherita Pizza',
      nameLocalized: null,
      description: null,
      photoUrl: null,
      basePriceCents: 1299,
      tags: [],
      prepTimeMinutes: 0,
      specialInstructionsEnabled: false,
      isFeatured: false,
      visibility: 'AVAILABLE',
      categoryIds: ['cat_1'],
    })
    expect(response.body.id).toBe('item_1')
  })

  it('lists items and the created item appears in the response', async () => {
    mockListItems.mockResolvedValue({
      items: [
        {
          id: 'item_1',
          name: 'Margherita Pizza',
          basePriceCents: 1299,
          visibility: 'AVAILABLE',
        },
      ],
      nextCursor: null,
    })

    const response = await request(createApp())
      .get('/admin/menu/items')
      .set('Authorization', 'Bearer clerk_token')
      .set('x-tenant-slug', 'demo')

    expect(response.status).toBe(200)
    expect(mockListItems).toHaveBeenCalledTimes(1)
    expect(response.body.items).toHaveLength(1)
    expect(response.body.items[0]).toMatchObject({ id: 'item_1', name: 'Margherita Pizza' })
    expect(response.body.nextCursor).toBeNull()
  })

  it('reorders items within a category', async () => {
    mockReorderCategoryItems.mockResolvedValue({
      id: 'cat_1',
      categoryItems: [
        { itemId: 'item_2', sortOrder: 0 },
        { itemId: 'item_1', sortOrder: 1 },
      ],
    })

    const response = await request(createApp())
      .patch('/admin/menu/categories/cat_1/items/reorder')
      .set('Authorization', 'Bearer clerk_token')
      .set('x-tenant-slug', 'demo')
      .send({ itemIds: ['item_2', 'item_1'] })

    expect(response.status).toBe(200)
    expect(mockReorderCategoryItems).toHaveBeenCalledWith({
      categoryId: 'cat_1',
      itemIds: ['item_2', 'item_1'],
    })
  })
})
