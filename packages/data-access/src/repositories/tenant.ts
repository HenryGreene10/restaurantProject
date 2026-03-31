import {
  CatalogVisibility,
  Customer,
  FulfillmentType,
  ModifierSelectionType,
  NotificationJobType,
  OrderStatus,
  Prisma,
} from "@prisma/client"
import { withTenantConnection } from "../prisma.js"
import {
  bindTenantScope,
  type TenantScope,
  type WithoutRestaurantId,
} from "../scope.js"

type UpsertCustomerByPhoneInput = {
  phone: string
  email?: string | null
  name?: string | null
}

type CreateOrderItemInput = {
  itemId?: string | null
  name?: string
  variantName?: string | null
  quantity?: number
  unitPriceCents?: number
  notes?: string | null
  modifiers?: Array<{
    groupName: string
    optionName: string
    priceDeltaCents?: number
    portion?: "WHOLE" | "LEFT" | "RIGHT"
  }>
}

type CreateOrderInput = {
  customerId?: string | null
  customerNameSnapshot?: string | null
  customerPhoneSnapshot?: string | null
  fulfillmentType?: FulfillmentType
  notes?: string | null
  pickupTime?: Date | null
  deliveryAddressSnapshot?: Prisma.InputJsonValue | null
  items: CreateOrderItemInput[]
}

type MenuCategoryCreateInput = {
  menuId?: string
  name: string
  sortOrder?: number
  visibility?: CatalogVisibility
  availableFrom?: Date | null
  availableUntil?: Date | null
}

type MenuCategoryUpdateInput = Partial<
  Omit<MenuCategoryCreateInput, "menuId"> & {
    menuId: string
  }
>

type MenuItemCreateInput = {
  name: string
  description?: string | null
  photoUrl?: string | null
  basePriceCents: number
  tags?: string[]
  prepTimeMinutes?: number
  specialInstructionsEnabled?: boolean
  isFeatured?: boolean
  visibility?: CatalogVisibility
  categoryIds?: string[]
}

type MenuItemUpdateInput = Partial<MenuItemCreateInput>

type MenuVariantCreateInput = {
  itemId: string
  name: string
  priceCents: number
  isDefault?: boolean
}

type MenuVariantUpdateInput = Partial<Omit<MenuVariantCreateInput, "itemId">> & {
  itemId?: string
}

type ModifierGroupCreateInput = {
  name: string
  selection: ModifierSelectionType
}

type ModifierGroupUpdateInput = Partial<ModifierGroupCreateInput>

type ModifierOptionCreateInput = {
  groupId: string
  name: string
  priceDeltaCents?: number
  position?: number
}

type ModifierOptionUpdateInput = Partial<Omit<ModifierOptionCreateInput, "groupId">> & {
  groupId?: string
}

type ItemModifierGroupCreateInput = {
  itemId: string
  groupId: string
  isRequired?: boolean
  minSelections?: number
  maxSelections?: number | null
  allowOptionQuantity?: boolean
}

type ItemModifierGroupUpdateInput = Partial<Omit<ItemModifierGroupCreateInput, "itemId" | "groupId">> & {
  itemId?: string
  groupId?: string
}

function notFound(entityName: string): Error {
  return new Error(`${entityName} not found for tenant`)
}

function badRequest(message: string): Error {
  return new Error(message)
}

async function ensureDefaultMenu(
  prisma: Prisma.TransactionClient,
  restaurantId: string,
) {
  const existingMenu = await prisma.menu.findFirst({
    where: { restaurantId, isDefault: true },
    orderBy: { createdAt: "asc" },
  })

  if (existingMenu) {
    return existingMenu
  }

  return prisma.menu.create({
    data: {
      restaurantId,
      name: "Main Menu",
      isDefault: true,
    },
  })
}

async function requireTenantRecord<T>(
  loader: () => Promise<T | null>,
  entityName: string,
): Promise<T> {
  const record = await loader()
  if (!record) {
    throw notFound(entityName)
  }

  return record
}

async function nextOrderNumber(
  prisma: Prisma.TransactionClient,
  restaurantId: string,
) {
  const sequence = await prisma.restaurantOrderSequence.upsert({
    where: { restaurantId },
    update: {
      nextValue: {
        increment: 1,
      },
    },
    create: {
      restaurantId,
      nextValue: 2,
    },
  })

  return sequence.nextValue - 1
}

export function createTenantDataAccess(scope: TenantScope) {
  const scoped = bindTenantScope(scope)

  const menu = {
    async getPublicMenu() {
      return withTenantConnection(scope.restaurantId, async (prisma) => {
        const menuRecord = await ensureDefaultMenu(prisma, scope.restaurantId)

        const [categories, brandConfig] = await Promise.all([
          prisma.menuCategory.findMany({
            where: scoped.scopeWhere({
              menuId: menuRecord.id,
            }),
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
            include: {
              categoryItems: {
                orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
                include: {
                  item: {
                    include: {
                      variants: {
                        orderBy: [{ isDefault: "desc" }, { priceCents: "asc" }],
                      },
                      itemModifierGroups: {
                        orderBy: { createdAt: "asc" },
                        include: {
                          group: {
                            include: {
                              options: {
                                orderBy: [{ position: "asc" }, { name: "asc" }],
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          }),
          prisma.brandConfig.findUnique({
            where: {
              restaurantId: scope.restaurantId,
            },
          }),
        ])

        return {
          menu: menuRecord,
          categories,
          brandConfig,
          brand: brandConfig,
        }
      })
    },

    async listFeaturedItems() {
      return withTenantConnection(scope.restaurantId, async (prisma) => {
        return prisma.menuItem.findMany({
          where: scoped.scopeWhere({
            isFeatured: true,
          }),
          orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
          include: {
            variants: {
              orderBy: [{ isDefault: "desc" }, { priceCents: "asc" }],
            },
            categoryItems: {
              include: {
                category: true,
              },
            },
          },
        })
      })
    },

    async listCategories(menuId?: string) {
      return withTenantConnection(scope.restaurantId, async (prisma) => {
        const targetMenuId = menuId ?? (await ensureDefaultMenu(prisma, scope.restaurantId)).id

        return prisma.menuCategory.findMany({
          where: scoped.scopeWhere({
            menuId: targetMenuId,
          }),
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          include: {
            categoryItems: {
              orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
              include: {
                item: {
                  include: {
                    variants: true,
                  },
                },
              },
            },
          },
        })
      })
    },

    async createCategory(data: WithoutRestaurantId<MenuCategoryCreateInput>) {
      return withTenantConnection(scope.restaurantId, async (prisma) => {
        const menuId = data.menuId ?? (await ensureDefaultMenu(prisma, scope.restaurantId)).id

        return prisma.menuCategory.create({
          data: scoped.scopeCreate({
            menuId,
            name: data.name,
            sortOrder: data.sortOrder ?? 0,
            visibility: data.visibility ?? "AVAILABLE",
            availableFrom: data.availableFrom ?? null,
            availableUntil: data.availableUntil ?? null,
          }),
        })
      })
    },

    async updateCategory(
      categoryId: string,
      data: WithoutRestaurantId<MenuCategoryUpdateInput>,
    ) {
      return withTenantConnection(scope.restaurantId, async (prisma) => {
        const result = await prisma.menuCategory.updateMany({
          where: scoped.scopeWhere({ id: categoryId }),
          data,
        })

        if (result.count === 0) {
          return null
        }

        return prisma.menuCategory.findFirst({
          where: scoped.scopeWhere({ id: categoryId }),
        })
      })
    },

    async deleteCategory(categoryId: string) {
      return withTenantConnection(scope.restaurantId, async (prisma) => {
        const existing = await prisma.menuCategory.findFirst({
          where: scoped.scopeWhere({ id: categoryId }),
        })

        if (!existing) {
          return null
        }

        await prisma.menuCategory.deleteMany({
          where: scoped.scopeDelete({ id: categoryId }),
        })

        return existing
      })
    },

    async setCategoryVisibility(categoryId: string, visibility: CatalogVisibility) {
      return this.updateCategory(categoryId, { visibility })
    },

    async listItems() {
      return withTenantConnection(scope.restaurantId, async (prisma) => {
        return prisma.menuItem.findMany({
          where: scoped.scopeWhere({}),
          orderBy: [{ createdAt: "asc" }],
          include: {
            categoryItems: {
              include: {
                category: true,
              },
            },
            variants: {
              orderBy: [{ isDefault: "desc" }, { priceCents: "asc" }],
            },
            itemModifierGroups: {
              include: {
                group: {
                  include: {
                    options: {
                      orderBy: [{ position: "asc" }, { name: "asc" }],
                    },
                  },
                },
              },
            },
          },
        })
      })
    },

    async createItem(data: WithoutRestaurantId<MenuItemCreateInput>) {
      return withTenantConnection(scope.restaurantId, async (prisma) => {
        const item = await prisma.menuItem.create({
          data: scoped.scopeCreate({
            name: data.name,
            description: data.description ?? null,
            photoUrl: data.photoUrl ?? null,
            basePriceCents: data.basePriceCents,
            tags: data.tags ?? [],
            prepTimeMinutes: data.prepTimeMinutes ?? 0,
            specialInstructionsEnabled: data.specialInstructionsEnabled ?? false,
            isFeatured: data.isFeatured ?? false,
            visibility: data.visibility ?? "AVAILABLE",
          }),
        })

        if (data.categoryIds?.length) {
          await Promise.all(
            data.categoryIds.map(async (categoryId, index) => {
              await requireTenantRecord(
                () =>
                  prisma.menuCategory.findFirst({
                    where: scoped.scopeWhere({ id: categoryId }),
                  }),
                "MenuCategory",
              )

              await prisma.menuCategoryItem.create({
                data: scoped.scopeCreate({
                  categoryId,
                  itemId: item.id,
                  sortOrder: index,
                }),
              })
            }),
          )
        }

        return prisma.menuItem.findFirst({
          where: scoped.scopeWhere({ id: item.id }),
          include: {
            categoryItems: {
              include: {
                category: true,
              },
            },
            variants: true,
          },
        })
      })
    },

    async updateItem(itemId: string, data: WithoutRestaurantId<MenuItemUpdateInput>) {
      return withTenantConnection(scope.restaurantId, async (prisma) => {
        const { categoryIds, ...itemData } = data

        const result = await prisma.menuItem.updateMany({
          where: scoped.scopeWhere({ id: itemId }),
          data: itemData,
        })

        if (result.count === 0) {
          return null
        }

        if (categoryIds) {
          await prisma.menuCategoryItem.deleteMany({
            where: scoped.scopeWhere({ itemId }),
          })

          for (const [index, categoryId] of categoryIds.entries()) {
            await requireTenantRecord(
              () =>
                prisma.menuCategory.findFirst({
                  where: scoped.scopeWhere({ id: categoryId }),
                }),
              "MenuCategory",
            )

            await prisma.menuCategoryItem.create({
              data: scoped.scopeCreate({
                categoryId,
                itemId,
                sortOrder: index,
              }),
            })
          }
        }

        return prisma.menuItem.findFirst({
          where: scoped.scopeWhere({ id: itemId }),
          include: {
            categoryItems: {
              include: {
                category: true,
              },
            },
            variants: true,
          },
        })
      })
    },

    async deleteItem(itemId: string) {
      return withTenantConnection(scope.restaurantId, async (prisma) => {
        const existing = await prisma.menuItem.findFirst({
          where: scoped.scopeWhere({ id: itemId }),
        })

        if (!existing) {
          return null
        }

        await prisma.menuItem.deleteMany({
          where: scoped.scopeDelete({ id: itemId }),
        })

        return existing
      })
    },

    async setItemVisibility(itemId: string, visibility: CatalogVisibility) {
      return this.updateItem(itemId, { visibility })
    },

    async listVariants(itemId?: string) {
      return withTenantConnection(scope.restaurantId, async (prisma) => {
        return prisma.menuItemVariant.findMany({
          where: scoped.scopeWhere(itemId ? { itemId } : {}),
          orderBy: [{ itemId: "asc" }, { isDefault: "desc" }, { priceCents: "asc" }],
        })
      })
    },

    async createVariant(data: WithoutRestaurantId<MenuVariantCreateInput>) {
      return withTenantConnection(scope.restaurantId, async (prisma) => {
        await requireTenantRecord(
          () =>
            prisma.menuItem.findFirst({
              where: scoped.scopeWhere({ id: data.itemId }),
            }),
          "MenuItem",
        )

        if (data.isDefault) {
          await prisma.menuItemVariant.updateMany({
            where: scoped.scopeWhere({ itemId: data.itemId }),
            data: { isDefault: false },
          })
        }

        return prisma.menuItemVariant.create({
          data: scoped.scopeCreate({
            itemId: data.itemId,
            name: data.name,
            priceCents: data.priceCents,
            isDefault: data.isDefault ?? false,
          }),
        })
      })
    },

    async updateVariant(
      variantId: string,
      data: WithoutRestaurantId<MenuVariantUpdateInput>,
    ) {
      return withTenantConnection(scope.restaurantId, async (prisma) => {
        const existing = await prisma.menuItemVariant.findFirst({
          where: scoped.scopeWhere({ id: variantId }),
        })

        if (!existing) {
          return null
        }

        const targetItemId = data.itemId ?? existing.itemId

        if (data.itemId) {
          await requireTenantRecord(
            () =>
              prisma.menuItem.findFirst({
                where: scoped.scopeWhere({ id: data.itemId }),
              }),
            "MenuItem",
          )
        }

        if (data.isDefault) {
          await prisma.menuItemVariant.updateMany({
            where: scoped.scopeWhere({ itemId: targetItemId }),
            data: { isDefault: false },
          })
        }

        await prisma.menuItemVariant.updateMany({
          where: scoped.scopeWhere({ id: variantId }),
          data,
        })

        return prisma.menuItemVariant.findFirst({
          where: scoped.scopeWhere({ id: variantId }),
        })
      })
    },

    async deleteVariant(variantId: string) {
      return withTenantConnection(scope.restaurantId, async (prisma) => {
        const existing = await prisma.menuItemVariant.findFirst({
          where: scoped.scopeWhere({ id: variantId }),
        })

        if (!existing) {
          return null
        }

        await prisma.menuItemVariant.deleteMany({
          where: scoped.scopeDelete({ id: variantId }),
        })

        return existing
      })
    },

    async listModifierGroups() {
      return withTenantConnection(scope.restaurantId, async (prisma) => {
        return prisma.modifierGroup.findMany({
          where: scoped.scopeWhere({}),
          orderBy: [{ createdAt: "asc" }],
          include: {
            options: {
              orderBy: [{ position: "asc" }, { name: "asc" }],
            },
            itemModifierGroups: true,
          },
        })
      })
    },

    async createModifierGroup(data: WithoutRestaurantId<ModifierGroupCreateInput>) {
      return withTenantConnection(scope.restaurantId, async (prisma) => {
        return prisma.modifierGroup.create({
          data: scoped.scopeCreate(data),
        })
      })
    },

    async updateModifierGroup(
      modifierGroupId: string,
      data: WithoutRestaurantId<ModifierGroupUpdateInput>,
    ) {
      return withTenantConnection(scope.restaurantId, async (prisma) => {
        const result = await prisma.modifierGroup.updateMany({
          where: scoped.scopeWhere({ id: modifierGroupId }),
          data,
        })

        if (result.count === 0) {
          return null
        }

        return prisma.modifierGroup.findFirst({
          where: scoped.scopeWhere({ id: modifierGroupId }),
        })
      })
    },

    async deleteModifierGroup(modifierGroupId: string) {
      return withTenantConnection(scope.restaurantId, async (prisma) => {
        const existing = await prisma.modifierGroup.findFirst({
          where: scoped.scopeWhere({ id: modifierGroupId }),
        })

        if (!existing) {
          return null
        }

        await prisma.modifierGroup.deleteMany({
          where: scoped.scopeDelete({ id: modifierGroupId }),
        })

        return existing
      })
    },

    async createModifierOption(data: WithoutRestaurantId<ModifierOptionCreateInput>) {
      return withTenantConnection(scope.restaurantId, async (prisma) => {
        await requireTenantRecord(
          () =>
            prisma.modifierGroup.findFirst({
              where: scoped.scopeWhere({ id: data.groupId }),
            }),
          "ModifierGroup",
        )

        return prisma.modifierOption.create({
          data: scoped.scopeCreate({
            groupId: data.groupId,
            name: data.name,
            priceDeltaCents: data.priceDeltaCents ?? 0,
            position: data.position ?? 0,
          }),
        })
      })
    },

    async updateModifierOption(
      modifierOptionId: string,
      data: WithoutRestaurantId<ModifierOptionUpdateInput>,
    ) {
      return withTenantConnection(scope.restaurantId, async (prisma) => {
        const existing = await prisma.modifierOption.findFirst({
          where: scoped.scopeWhere({ id: modifierOptionId }),
        })

        if (!existing) {
          return null
        }

        if (data.groupId) {
          await requireTenantRecord(
            () =>
              prisma.modifierGroup.findFirst({
                where: scoped.scopeWhere({ id: data.groupId }),
              }),
            "ModifierGroup",
          )
        }

        await prisma.modifierOption.updateMany({
          where: scoped.scopeWhere({ id: modifierOptionId }),
          data,
        })

        return prisma.modifierOption.findFirst({
          where: scoped.scopeWhere({ id: modifierOptionId }),
        })
      })
    },

    async deleteModifierOption(modifierOptionId: string) {
      return withTenantConnection(scope.restaurantId, async (prisma) => {
        const existing = await prisma.modifierOption.findFirst({
          where: scoped.scopeWhere({ id: modifierOptionId }),
        })

        if (!existing) {
          return null
        }

        await prisma.modifierOption.deleteMany({
          where: scoped.scopeDelete({ id: modifierOptionId }),
        })

        return existing
      })
    },

    async listItemModifierGroups(itemId: string) {
      return withTenantConnection(scope.restaurantId, async (prisma) => {
        return prisma.menuItemModifierGroup.findMany({
          where: scoped.scopeWhere({ itemId }),
          orderBy: [{ createdAt: "asc" }],
          include: {
            group: {
              include: {
                options: {
                  orderBy: [{ position: "asc" }, { name: "asc" }],
                },
              },
            },
          },
        })
      })
    },

    async attachModifierGroup(data: WithoutRestaurantId<ItemModifierGroupCreateInput>) {
      return withTenantConnection(scope.restaurantId, async (prisma) => {
        await Promise.all([
          requireTenantRecord(
            () =>
              prisma.menuItem.findFirst({
                where: scoped.scopeWhere({ id: data.itemId }),
              }),
            "MenuItem",
          ),
          requireTenantRecord(
            () =>
              prisma.modifierGroup.findFirst({
                where: scoped.scopeWhere({ id: data.groupId }),
              }),
            "ModifierGroup",
          ),
        ])

        return prisma.menuItemModifierGroup.create({
          data: scoped.scopeCreate({
            itemId: data.itemId,
            groupId: data.groupId,
            isRequired: data.isRequired ?? false,
            minSelections: data.minSelections ?? 0,
            maxSelections: data.maxSelections ?? null,
            allowOptionQuantity: data.allowOptionQuantity ?? false,
          }),
        })
      })
    },

    async updateItemModifierGroup(
      itemModifierGroupId: string,
      data: WithoutRestaurantId<ItemModifierGroupUpdateInput>,
    ) {
      return withTenantConnection(scope.restaurantId, async (prisma) => {
        const existing = await prisma.menuItemModifierGroup.findFirst({
          where: scoped.scopeWhere({ id: itemModifierGroupId }),
        })

        if (!existing) {
          return null
        }

        if (data.itemId) {
          await requireTenantRecord(
            () =>
              prisma.menuItem.findFirst({
                where: scoped.scopeWhere({ id: data.itemId }),
              }),
            "MenuItem",
          )
        }

        if (data.groupId) {
          await requireTenantRecord(
            () =>
              prisma.modifierGroup.findFirst({
                where: scoped.scopeWhere({ id: data.groupId }),
              }),
            "ModifierGroup",
          )
        }

        await prisma.menuItemModifierGroup.updateMany({
          where: scoped.scopeWhere({ id: itemModifierGroupId }),
          data,
        })

        return prisma.menuItemModifierGroup.findFirst({
          where: scoped.scopeWhere({ id: itemModifierGroupId }),
          include: {
            group: {
              include: {
                options: {
                  orderBy: [{ position: "asc" }, { name: "asc" }],
                },
              },
            },
          },
        })
      })
    },

    async deleteItemModifierGroup(itemModifierGroupId: string) {
      return withTenantConnection(scope.restaurantId, async (prisma) => {
        const existing = await prisma.menuItemModifierGroup.findFirst({
          where: scoped.scopeWhere({ id: itemModifierGroupId }),
        })

        if (!existing) {
          return null
        }

        await prisma.menuItemModifierGroup.deleteMany({
          where: scoped.scopeDelete({ id: itemModifierGroupId }),
        })

        return existing
      })
    },
  }

  const customers = {
    async findById(customerId: string): Promise<Customer | null> {
      return withTenantConnection(scope.restaurantId, async (prisma) => {
        return prisma.customer.findFirst({
          where: scoped.scopeWhere({
            id: customerId,
          }),
        })
      })
    },

    async findByPhone(phone: string): Promise<Customer | null> {
      return withTenantConnection(scope.restaurantId, async (prisma) => {
        return prisma.customer.findFirst({
          where: scoped.scopeWhere({
            phone,
          }),
        })
      })
    },

    async upsertByPhone(input: UpsertCustomerByPhoneInput): Promise<Customer> {
      return withTenantConnection(scope.restaurantId, async (prisma) => {
        const existingCustomer = await prisma.customer.findFirst({
          where: scoped.scopeWhere({
            phone: input.phone,
          }),
        })

        if (existingCustomer) {
          await prisma.customer.updateMany({
            where: scoped.scopeWhere({
              id: existingCustomer.id,
            }),
            data: {
              email: input.email ?? existingCustomer.email,
              name: input.name ?? existingCustomer.name,
            },
          })

          return requireTenantRecord(
            () =>
              prisma.customer.findFirst({
                where: scoped.scopeWhere({
                  id: existingCustomer.id,
                }),
              }),
            "Customer",
          )
        }

        return prisma.customer.create({
          data: scoped.scopeCreate({
            phone: input.phone,
            email: input.email ?? null,
            name: input.name ?? null,
          }),
        })
      })
    },
  }

  const orders = {
    async findById(orderId: string) {
      return withTenantConnection(scope.restaurantId, async (prisma) => {
        return prisma.order.findFirst({
          where: scoped.scopeWhere({ id: orderId }),
          include: {
            restaurant: true,
            customer: true,
            items: {
              include: {
                modifierSelections: true,
              },
            },
            statusEvents: {
              orderBy: [{ createdAt: "asc" }],
            },
          },
        })
      })
    },

    async createOrder(input: CreateOrderInput) {
      return withTenantConnection(scope.restaurantId, async (prisma) => {
        let customer: Customer | null = null

        if (input.customerId) {
          customer = await prisma.customer.findFirst({
            where: scoped.scopeWhere({ id: input.customerId }),
          })

          if (!customer) {
            throw badRequest("Customer not found for tenant")
          }
        } else if (input.customerPhoneSnapshot) {
          customer =
            (await prisma.customer.findFirst({
              where: scoped.scopeWhere({ phone: input.customerPhoneSnapshot }),
            })) ??
            (await prisma.customer.create({
              data: scoped.scopeCreate({
                phone: input.customerPhoneSnapshot,
                name: input.customerNameSnapshot ?? null,
              }),
            }))

          if (!customer) {
            throw badRequest("Customer lookup or creation failed")
          }
        } else {
          throw badRequest("Customer phone is required to create an order")
        }

        const normalizedItems = await Promise.all(input.items.map(async (item) => {
          if (!item.itemId) {
            throw badRequest("Order items must include a valid itemId")
          }

          const menuItem = await prisma.menuItem.findFirst({
            where: scoped.scopeWhere({ id: item.itemId }),
          })

          if (!menuItem) {
            throw badRequest(`Menu item ${item.itemId} not found for tenant`)
          }

          const quantity = item.quantity ?? 1
          const unitPriceCents = item.unitPriceCents ?? menuItem.basePriceCents
          const modifierTotal = (item.modifiers ?? []).reduce(
            (sum, modifier) => sum + (modifier.priceDeltaCents ?? 0),
            0,
          )

          return {
            ...item,
            itemId: menuItem.id,
            name: menuItem.name,
            quantity,
            unitPriceCents,
            linePriceCents: (unitPriceCents + modifierTotal) * quantity,
          }
        }))

        const subtotalCents = normalizedItems.reduce(
          (sum, item) => sum + item.linePriceCents,
          0,
        )
        const taxCents = Math.round(subtotalCents * 0.08875)
        const totalCents = subtotalCents + taxCents
        const orderNumber = await nextOrderNumber(prisma, scope.restaurantId)
        const deliveryAddressSnapshot =
          input.deliveryAddressSnapshot === null
            ? Prisma.JsonNull
            : input.deliveryAddressSnapshot

        const createdOrder = await prisma.order.create({
          data: {
            ...scoped.scopeCreate({
              customerId: customer.id,
              orderNumber,
              status: "PENDING",
              paymentStatus: "PENDING",
              fulfillmentType: input.fulfillmentType ?? "PICKUP",
              subtotalCents,
              taxCents,
              discountCents: 0,
              totalCents,
              notes: input.notes ?? null,
              pickupTime: input.pickupTime ?? null,
              deliveryAddressSnapshot,
              customerNameSnapshot:
                input.customerNameSnapshot ?? customer.name ?? null,
              customerPhoneSnapshot:
                input.customerPhoneSnapshot ?? customer.phone ?? null,
            }),
            items: {
              create: normalizedItems.map((item) => ({
                restaurantId: scope.restaurantId,
                itemId: item.itemId ?? null,
                name: item.name,
                variantName: item.variantName ?? null,
                quantity: item.quantity,
                unitPriceCents: item.unitPriceCents,
                linePriceCents: item.linePriceCents,
                notes: item.notes ?? null,
                modifierSelections: {
                  create: (item.modifiers ?? []).map((modifier) => ({
                    restaurantId: scope.restaurantId,
                    groupName: modifier.groupName,
                    optionName: modifier.optionName,
                    priceDeltaCents: modifier.priceDeltaCents ?? 0,
                    portion: modifier.portion ?? "WHOLE",
                  })),
                },
              })),
            },
            statusEvents: {
              create: {
                restaurantId: scope.restaurantId,
                fromStatus: null,
                toStatus: "PENDING",
                source: "customer",
              },
            },
          },
          include: {
            items: {
              include: {
                modifierSelections: true,
              },
            },
            statusEvents: true,
          },
        })

        return createdOrder
      })
    },

    async listActiveKitchenOrders() {
      return withTenantConnection(scope.restaurantId, async (prisma) => {
        return prisma.order.findMany({
          where: scoped.scopeWhere({
            status: {
              in: ["PENDING", "CONFIRMED", "PREPARING", "READY"] satisfies OrderStatus[],
            },
          }),
          include: {
            items: {
              include: {
                modifierSelections: true,
              },
            },
          },
          orderBy: [{ createdAt: "desc" }],
        })
      })
    },

    async updateStatus(
      orderId: string,
      nextStatus: OrderStatus,
      actorAdminId?: string | null,
    ) {
      return withTenantConnection(scope.restaurantId, async (prisma) => {
        const existing = await prisma.order.findFirst({
          where: scoped.scopeWhere({ id: orderId }),
          include: {
            restaurant: true,
            customer: true,
          },
        })

        if (!existing) {
          return null
        }

        await prisma.order.updateMany({
          where: scoped.scopeWhere({ id: orderId }),
          data: {
            status: nextStatus,
          },
        })

        await prisma.orderStatusEvent.create({
          data: scoped.scopeCreate({
            orderId,
            fromStatus: existing.status,
            toStatus: nextStatus,
            actorAdminId: actorAdminId ?? null,
            source: "admin",
          }),
        })

        if (nextStatus === "READY") {
          await prisma.notificationJob.create({
            data: scoped.scopeCreate({
              orderId,
              customerId: existing.customerId ?? null,
              type: "ORDER_READY" satisfies NotificationJobType,
              status: "PENDING",
              payload: {
                orderId,
                orderNumber: existing.orderNumber,
                restaurantName: existing.restaurant.name,
                customerPhone:
                  existing.customerPhoneSnapshot ?? existing.customer?.phone ?? null,
              },
            }),
          })
        }

        return prisma.order.findFirst({
          where: scoped.scopeWhere({ id: orderId }),
          include: {
            items: true,
            statusEvents: {
              orderBy: [{ createdAt: "asc" }],
            },
          },
        })
      })
    },
  }

  return {
    scope,
    customers,
    menu,
    orders,
  }
}
