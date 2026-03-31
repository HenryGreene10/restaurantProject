import { beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'

const mockFindTenantByHost = vi.fn()
const mockFindTenantBySlug = vi.fn()
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

vi.mock('@repo/data-access', () => ({
  createTenantScope: (restaurantId: string) => ({ restaurantId }),
  createPlatformDataAccess: () => ({
    findTenantByHost: mockFindTenantByHost,
    findTenantBySlug: mockFindTenantBySlug
  }),
  createTenantDataAccess: () => ({
    menu: {
      getPublicMenu: vi.fn(),
      listFeaturedItems: vi.fn(),
      listCategories: mockListCategories,
      createCategory: mockCreateCategory,
      updateCategory: mockUpdateCategory,
      setCategoryVisibility: mockSetCategoryVisibility,
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
      deleteItemModifierGroup: mockDeleteItemModifierGroup
    },
    customers: {},
    orders: {}
  })
}))

describe('admin menu integration', () => {
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

  it('creates a tenant-scoped category', async () => {
    await import('./setup')
    const { createApp } = await import('../app')

    mockCreateCategory.mockResolvedValue({
      id: 'cat_1',
      name: 'Pizza',
      menuId: 'menu_1'
    })

    const response = await request(createApp())
      .post('/admin/menu/categories')
      .set('Host', 'demo.example.com')
      .send({ name: 'Pizza', menuId: 'menu_1', sortOrder: 1 })

    expect(response.status).toBe(201)
    expect(mockCreateCategory).toHaveBeenCalledWith({
      menuId: 'menu_1',
      name: 'Pizza',
      sortOrder: 1,
      visibility: 'AVAILABLE',
      availableFrom: null,
      availableUntil: null
    })
  }, 10000)

  it('updates item availability', async () => {
    await import('./setup')
    const { createApp } = await import('../app')

    mockSetItemVisibility.mockResolvedValue({
      id: 'item_1',
      visibility: 'SOLD_OUT'
    })

    const response = await request(createApp())
      .patch('/admin/menu/items/item_1/availability')
      .set('Host', 'demo.example.com')
      .send({ visibility: 'SOLD_OUT' })

    expect(response.status).toBe(200)
    expect(mockSetItemVisibility).toHaveBeenCalledWith('item_1', 'SOLD_OUT')
  })

  it('creates modifier options under a specific group', async () => {
    await import('./setup')
    const { createApp } = await import('../app')

    mockCreateModifierOption.mockResolvedValue({
      id: 'opt_1',
      groupId: 'group_1',
      name: 'Mushrooms'
    })

    const response = await request(createApp())
      .post('/admin/menu/modifier-groups/group_1/options')
      .set('Host', 'demo.example.com')
      .send({ name: 'Mushrooms', priceDeltaCents: 200, position: 1 })

    expect(response.status).toBe(201)
    expect(mockCreateModifierOption).toHaveBeenCalledWith({
      groupId: 'group_1',
      name: 'Mushrooms',
      priceDeltaCents: 200,
      position: 1
    })
  })

  it('attaches a modifier group to an item', async () => {
    await import('./setup')
    const { createApp } = await import('../app')

    mockAttachModifierGroup.mockResolvedValue({
      id: 'img_1',
      itemId: 'item_1',
      groupId: 'group_1'
    })

    const response = await request(createApp())
      .post('/admin/menu/items/item_1/modifier-groups')
      .set('x-tenant-slug', 'demo')
      .send({
        groupId: 'group_1',
        isRequired: true,
        minSelections: 1,
        maxSelections: 2,
        allowOptionQuantity: false
      })

    expect(response.status).toBe(201)
    expect(mockFindTenantBySlug).toHaveBeenCalledWith('demo')
    expect(mockAttachModifierGroup).toHaveBeenCalledWith({
      itemId: 'item_1',
      groupId: 'group_1',
      isRequired: true,
      minSelections: 1,
      maxSelections: 2,
      allowOptionQuantity: false
    })
  })
})
