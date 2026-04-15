import { randomUUID } from "node:crypto"
import {
  CatalogVisibility,
  Customer,
  FulfillmentType,
  ModifierSelectionType,
  NotificationJobType,
  OrderStatus,
  Prisma,
} from "@repo/db"
import type { BrandConfig } from "@repo/brand-config"
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
  variantId?: string | null
  name?: string
  variantName?: string | null
  quantity?: number
  unitPriceCents?: number
  notes?: string | null
  modifiers?: Array<{
    groupId?: string | null
    groupName: string
    optionId?: string | null
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

type CheckoutSessionStatus =
  | "PENDING"
  | "REQUIRES_ACTION"
  | "PAYMENT_FAILED"
  | "PAYMENT_SUCCEEDED"
  | "ORDER_CREATED"
  | "EXPIRED"

type NormalizedOrderModifierSnapshot = {
  groupId: string | null
  groupName: string
  optionId: string | null
  optionName: string
  priceDeltaCents: number
  portion: "WHOLE" | "LEFT" | "RIGHT"
}

type NormalizedOrderItemSnapshot = {
  itemId: string | null
  variantId: string | null
  name: string
  nameLocalized: string | null
  variantName: string | null
  quantity: number
  unitPriceCents: number
  linePriceCents: number
  notes: string | null
  modifiers: NormalizedOrderModifierSnapshot[]
}

type CheckoutCartSnapshot = {
  items: NormalizedOrderItemSnapshot[]
}

type CreateCheckoutSessionInput = {
  customerId?: string | null
  customerNameSnapshot?: string | null
  customerPhoneSnapshot?: string | null
  fulfillmentType?: FulfillmentType
  notes?: string | null
  pickupTime?: Date | null
  deliveryAddressSnapshot?: Prisma.InputJsonValue | null
  items: CreateOrderItemInput[]
  stripeAccountId: string
}

type CheckoutSessionRow = {
  id: string
  restaurantId: string
  customerId: string | null
  customerNameSnapshot: string | null
  customerPhoneSnapshot: string | null
  fulfillmentType: FulfillmentType
  notes: string | null
  pickupTime: Date | null
  deliveryAddressSnapshot: Prisma.JsonValue | null
  cartSnapshot: Prisma.JsonValue
  subtotalCents: number
  taxCents: number
  discountCents: number
  totalCents: number
  stripeAccountId: string
  stripePaymentIntentId: string | null
  status: CheckoutSessionStatus
  createdOrderId: string | null
  createdAt: Date
  updatedAt: Date
}

type MenuCategoryCreateInput = {
  menuId?: string
  name: string
  sortOrder?: number
  visibility?: CatalogVisibility
  availableFrom?: Date | null
  availableUntil?: Date | null
  daysOfWeek?: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | null
}

type MenuCategoryUpdateInput = Partial<Omit<MenuCategoryCreateInput, "menuId">>

type MenuItemCreateInput = {
  name: string
  nameLocalized?: string | null
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

type UpdateBrandConfigInput = WithoutRestaurantId<BrandConfig>
type ReorderCategoryItemsInput = {
  categoryId: string
  itemIds: string[]
}

function notFound(entityName: string): Error {
  return new Error(`${entityName} not found for tenant`)
}

function badRequest(message: string): Error {
  return new Error(message)
}

function titleCaseWord(word: string) {
  if (!word) return word
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
}

function formatTenantSlugAsName(slug: string) {
  return slug
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part, index, parts) => {
      if (index === 0 && parts.length > 1 && /^[a-z]+s$/i.test(part) && part.length > 3) {
        const stem = part.slice(0, -1)
        return `${titleCaseWord(stem)}'s`
      }

      return titleCaseWord(part)
    })
    .join(" ")
}

function resolveRestaurantDisplayName(input: {
  appTitle?: string | null
  restaurantSlug?: string | null
  restaurantName?: string | null
}) {
  if (input.appTitle?.trim()) {
    return input.appTitle.trim()
  }

  if (input.restaurantSlug?.trim()) {
    return formatTenantSlugAsName(input.restaurantSlug.trim())
  }

  return input.restaurantName?.trim() || "Restaurant"
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

async function resolveOrderCustomer(
  prisma: Prisma.TransactionClient,
  scope: TenantScope,
  scoped: ReturnType<typeof bindTenantScope>,
  input: {
    customerId?: string | null
    customerPhoneSnapshot?: string | null
    customerNameSnapshot?: string | null
  },
) {
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

  return customer
}

async function normalizeOrderItems(
  prisma: Prisma.TransactionClient,
  scope: TenantScope,
  scoped: ReturnType<typeof bindTenantScope>,
  items: CreateOrderItemInput[],
) {
  const normalizedItems = await Promise.all(
    items.map(async (item) => {
      if (!item.itemId) {
        throw badRequest("Order items must include a valid itemId")
      }

      const menuItem = await prisma.menuItem.findFirst({
        where: scoped.scopeWhere({ id: item.itemId }),
        include: {
          variants: true,
          itemModifierGroups: {
            include: {
              group: {
                include: {
                  options: true,
                },
              },
            },
          },
        },
      })

      if (!menuItem) {
        throw badRequest(`Menu item ${item.itemId} not found for tenant`)
      }

      const quantity = item.quantity ?? 1
      if (!Number.isInteger(quantity) || quantity <= 0) {
        throw badRequest("Order item quantity must be a positive integer")
      }

      const selectedVariant = item.variantId
        ? menuItem.variants.find((variant) => variant.id === item.variantId)
        : menuItem.variants.find((variant) => variant.isDefault) ?? null

      if (item.variantId && !selectedVariant) {
        throw badRequest(`Variant ${item.variantId} not found for item ${menuItem.id}`)
      }

      const normalizedModifiers = (item.modifiers ?? []).map((modifier) => {
        if (modifier.optionId) {
          const matchingGroup = menuItem.itemModifierGroups.find(
            (entry) => !modifier.groupId || entry.groupId === modifier.groupId,
          )

          const option = matchingGroup?.group.options.find(
            (entry) => entry.id === modifier.optionId,
          )

          if (!matchingGroup || !option) {
            throw badRequest(
              `Modifier option ${modifier.optionId} not found for item ${menuItem.id}`,
            )
          }

          return {
            groupId: matchingGroup.groupId,
            groupName: matchingGroup.group.name,
            optionId: option.id,
            optionName: option.name,
            priceDeltaCents: option.priceDeltaCents,
            portion: modifier.portion ?? "WHOLE",
          } satisfies NormalizedOrderModifierSnapshot
        }

        return {
          groupId: modifier.groupId ?? null,
          groupName: modifier.groupName,
          optionId: modifier.optionId ?? null,
          optionName: modifier.optionName,
          priceDeltaCents: modifier.priceDeltaCents ?? 0,
          portion: modifier.portion ?? "WHOLE",
        } satisfies NormalizedOrderModifierSnapshot
      })

      const unitPriceCents =
        selectedVariant?.priceCents ?? item.unitPriceCents ?? menuItem.basePriceCents
      const modifierUnitTotal = normalizedModifiers.reduce(
        (sum, modifier) => sum + modifier.priceDeltaCents,
        0,
      )

      return {
        itemId: menuItem.id,
        variantId: selectedVariant?.id ?? item.variantId ?? null,
        name: menuItem.name,
        nameLocalized: menuItem.nameLocalized ?? null,
        variantName: selectedVariant?.name ?? item.variantName ?? null,
        quantity,
        unitPriceCents,
        linePriceCents: (unitPriceCents + modifierUnitTotal) * quantity,
        notes: item.notes ?? null,
        modifiers: normalizedModifiers,
      } satisfies NormalizedOrderItemSnapshot
    }),
  )

  const subtotalCents = normalizedItems.reduce((sum, item) => sum + item.linePriceCents, 0)
  const taxCents = Math.round(subtotalCents * 0.08875)
  const totalCents = subtotalCents + taxCents

  return {
    items: normalizedItems,
    subtotalCents,
    taxCents,
    totalCents,
  }
}

function parseCheckoutCartSnapshot(value: Prisma.JsonValue): CheckoutCartSnapshot {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("items" in value) ||
    !Array.isArray(value.items)
  ) {
    throw badRequest("Checkout cart snapshot is invalid")
  }

  return value as CheckoutCartSnapshot
}

async function persistOrderFromSnapshot(
  prisma: Prisma.TransactionClient,
  scope: TenantScope,
  scoped: ReturnType<typeof bindTenantScope>,
  input: {
    customerId?: string | null
    customerNameSnapshot?: string | null
    customerPhoneSnapshot?: string | null
    fulfillmentType?: FulfillmentType
    notes?: string | null
    pickupTime?: Date | null
    deliveryAddressSnapshot?: Prisma.InputJsonValue | null
    items: NormalizedOrderItemSnapshot[]
    subtotalCents: number
    taxCents: number
    totalCents: number
    paymentStatus?: "PENDING" | "REQUIRES_ACTION" | "PAID" | "FAILED" | "REFUNDED"
    stripePaymentIntentId?: string | null
  },
) {
  const customer = await resolveOrderCustomer(prisma, scope, scoped, {
    customerId: input.customerId,
    customerPhoneSnapshot: input.customerPhoneSnapshot,
    customerNameSnapshot: input.customerNameSnapshot,
  })

  const orderNumber = await nextOrderNumber(prisma, scope.restaurantId)
  const deliveryAddressSnapshot =
    input.deliveryAddressSnapshot === null
      ? Prisma.JsonNull
      : input.deliveryAddressSnapshot

  return prisma.order.create({
    data: {
      ...scoped.scopeCreate({
        customerId: customer.id,
        orderNumber,
        status: "PENDING",
        paymentStatus: input.paymentStatus ?? "PENDING",
        fulfillmentType: input.fulfillmentType ?? "PICKUP",
        subtotalCents: input.subtotalCents,
        taxCents: input.taxCents,
        discountCents: 0,
        totalCents: input.totalCents,
        notes: input.notes ?? null,
        pickupTime: input.pickupTime ?? null,
        deliveryAddressSnapshot,
        customerNameSnapshot: input.customerNameSnapshot ?? customer.name ?? null,
        customerPhoneSnapshot: input.customerPhoneSnapshot ?? customer.phone ?? null,
        stripePaymentIntentId: input.stripePaymentIntentId ?? null,
      }),
      items: {
        create: input.items.map((item) => ({
          restaurantId: scope.restaurantId,
          itemId: item.itemId,
          name: item.name,
          nameLocalized: item.nameLocalized,
          variantName: item.variantName,
          quantity: item.quantity,
          unitPriceCents: item.unitPriceCents,
          linePriceCents: item.linePriceCents,
          notes: item.notes ?? null,
          modifierSelections: {
            create: item.modifiers.map((modifier) => ({
              restaurantId: scope.restaurantId,
              groupName: modifier.groupName,
              optionName: modifier.optionName,
              priceDeltaCents: modifier.priceDeltaCents,
              portion: modifier.portion,
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
}

export function createTenantDataAccess(scope: TenantScope) {
  const scoped = bindTenantScope(scope)

  const brand = {
    async getConfig() {
      return withTenantConnection(scope.restaurantId, async (prisma) => {
        return prisma.brandConfig.findUnique({
          where: {
            restaurantId: scope.restaurantId,
          },
        })
      })
    },

    async updateConfig(input: UpdateBrandConfigInput) {
      return withTenantConnection(scope.restaurantId, async (prisma) => {
        const existing = await prisma.brandConfig.findUnique({
          where: {
            restaurantId: scope.restaurantId,
          },
        })

        const previousConfig =
          existing?.config && typeof existing.config === "object" && !Array.isArray(existing.config)
            ? (existing.config as Record<string, unknown>)
            : {}

        return prisma.brandConfig.upsert({
          where: {
            restaurantId: scope.restaurantId,
          },
          update: {
            config: {
              ...previousConfig,
              ...input,
            },
          },
          create: {
            restaurantId: scope.restaurantId,
            config: input,
          },
        })
      })
    },
  }

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
            daysOfWeek: data.daysOfWeek ?? Prisma.DbNull,
          }),
        })
      })
    },

    async updateCategory(
      categoryId: string,
      data: WithoutRestaurantId<MenuCategoryUpdateInput>,
    ) {
      return withTenantConnection(scope.restaurantId, async (prisma) => {
        const { daysOfWeek, ...rest } = data
        const result = await prisma.menuCategory.updateMany({
          where: scoped.scopeWhere({ id: categoryId }),
          data: {
            ...rest,
            ...(daysOfWeek !== undefined
              ? {
                  daysOfWeek: daysOfWeek ?? Prisma.DbNull,
                }
              : {}),
          },
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

    async reorderCategoryItems(data: ReorderCategoryItemsInput) {
      return withTenantConnection(scope.restaurantId, async (prisma) => {
        await requireTenantRecord(
          () =>
            prisma.menuCategory.findFirst({
              where: scoped.scopeWhere({ id: data.categoryId }),
            }),
          "MenuCategory",
        )

        const existingLinks = await prisma.menuCategoryItem.findMany({
          where: scoped.scopeWhere({
            categoryId: data.categoryId,
          }),
          orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        })

        const existingItemIds = new Set(existingLinks.map((link) => link.itemId))

        if (
          data.itemIds.length !== existingLinks.length ||
          data.itemIds.some((itemId) => !existingItemIds.has(itemId))
        ) {
          throw badRequest("Item reorder payload must match the category's current items")
        }

        await Promise.all(
          data.itemIds.map((itemId, index) =>
            prisma.menuCategoryItem.updateMany({
              where: scoped.scopeWhere({
                categoryId: data.categoryId,
                itemId,
              }),
              data: {
                sortOrder: index,
              },
            }),
          ),
        )

        return prisma.menuCategory.findFirst({
          where: scoped.scopeWhere({ id: data.categoryId }),
          include: {
            categoryItems: {
              orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
              include: {
                item: {
                  include: {
                    variants: {
                      orderBy: [{ isDefault: "desc" }, { priceCents: "asc" }],
                    },
                  },
                },
              },
            },
          },
        })
      })
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
            nameLocalized: data.nameLocalized ?? null,
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

  async function findCheckoutSessionById(
    prisma: Prisma.TransactionClient,
    checkoutSessionId: string,
  ) {
    const rows = await prisma.$queryRaw<CheckoutSessionRow[]>(Prisma.sql`
      SELECT *
      FROM "CheckoutSession"
      WHERE "restaurantId" = ${scope.restaurantId}
        AND "id" = ${checkoutSessionId}
      LIMIT 1
    `)

    return rows[0] ?? null
  }

  async function findCheckoutSessionByPaymentIntentId(
    prisma: Prisma.TransactionClient,
    paymentIntentId: string,
  ) {
    const rows = await prisma.$queryRaw<CheckoutSessionRow[]>(Prisma.sql`
      SELECT *
      FROM "CheckoutSession"
      WHERE "restaurantId" = ${scope.restaurantId}
        AND "stripePaymentIntentId" = ${paymentIntentId}
      LIMIT 1
    `)

    return rows[0] ?? null
  }

  const checkouts = {
    async createCheckoutSession(input: CreateCheckoutSessionInput) {
      return withTenantConnection(scope.restaurantId, async (prisma) => {
        const customer = await resolveOrderCustomer(prisma, scope, scoped, {
          customerId: input.customerId,
          customerPhoneSnapshot: input.customerPhoneSnapshot,
          customerNameSnapshot: input.customerNameSnapshot,
        })

        const normalized = await normalizeOrderItems(prisma, scope, scoped, input.items)
        const deliveryAddressSnapshotValue =
          input.deliveryAddressSnapshot === null
            ? Prisma.sql`NULL`
            : Prisma.sql`${JSON.stringify(input.deliveryAddressSnapshot)}::jsonb`
        const cartSnapshotValue = Prisma.sql`${JSON.stringify({
          items: normalized.items,
        })}::jsonb`
        const rows = await prisma.$queryRaw<CheckoutSessionRow[]>(Prisma.sql`
          INSERT INTO "CheckoutSession" (
            "id",
            "restaurantId",
            "customerId",
            "customerNameSnapshot",
            "customerPhoneSnapshot",
            "fulfillmentType",
            "notes",
            "pickupTime",
            "deliveryAddressSnapshot",
            "cartSnapshot",
            "subtotalCents",
            "taxCents",
            "discountCents",
            "totalCents",
            "stripeAccountId",
            "status",
            "createdAt",
            "updatedAt"
          ) VALUES (
            ${randomUUID()},
            ${scope.restaurantId},
            ${customer.id},
            ${input.customerNameSnapshot ?? customer.name ?? null},
            ${input.customerPhoneSnapshot ?? customer.phone ?? null},
            ${Prisma.sql`${input.fulfillmentType ?? "PICKUP"}::"FulfillmentType"`},
            ${input.notes ?? null},
            ${input.pickupTime ?? null},
            ${deliveryAddressSnapshotValue},
            ${cartSnapshotValue},
            ${normalized.subtotalCents},
            ${normalized.taxCents},
            ${0},
            ${normalized.totalCents},
            ${input.stripeAccountId},
            ${Prisma.sql`${"PENDING" satisfies CheckoutSessionStatus}::"CheckoutSessionStatus"`},
            NOW(),
            NOW()
          )
          RETURNING *
        `)

        return rows[0] ?? null
      })
    },

    async findById(checkoutSessionId: string) {
      return withTenantConnection(scope.restaurantId, async (prisma) => {
        return findCheckoutSessionById(prisma, checkoutSessionId)
      })
    },

    async findByPaymentIntentId(paymentIntentId: string) {
      return withTenantConnection(scope.restaurantId, async (prisma) => {
        return findCheckoutSessionByPaymentIntentId(prisma, paymentIntentId)
      })
    },

    async attachPaymentIntent(checkoutSessionId: string, paymentIntentId: string) {
      return withTenantConnection(scope.restaurantId, async (prisma) => {
        const rows = await prisma.$queryRaw<CheckoutSessionRow[]>(Prisma.sql`
          UPDATE "CheckoutSession"
          SET "stripePaymentIntentId" = ${paymentIntentId},
              "updatedAt" = NOW()
          WHERE "restaurantId" = ${scope.restaurantId}
            AND "id" = ${checkoutSessionId}
          RETURNING *
        `)

        return rows[0] ?? null
      })
    },

    async markRequiresAction(checkoutSessionId: string) {
      return withTenantConnection(scope.restaurantId, async (prisma) => {
        const rows = await prisma.$queryRaw<CheckoutSessionRow[]>(Prisma.sql`
          UPDATE "CheckoutSession"
          SET "status" = ${Prisma.sql`${"REQUIRES_ACTION" satisfies CheckoutSessionStatus}::"CheckoutSessionStatus"`},
              "updatedAt" = NOW()
          WHERE "restaurantId" = ${scope.restaurantId}
            AND "id" = ${checkoutSessionId}
          RETURNING *
        `)

        return rows[0] ?? null
      })
    },

    async markPaymentFailedByIntent(paymentIntentId: string) {
      return withTenantConnection(scope.restaurantId, async (prisma) => {
        const rows = await prisma.$queryRaw<CheckoutSessionRow[]>(Prisma.sql`
          UPDATE "CheckoutSession"
          SET "status" = ${Prisma.sql`${"PAYMENT_FAILED" satisfies CheckoutSessionStatus}::"CheckoutSessionStatus"`},
              "updatedAt" = NOW()
          WHERE "restaurantId" = ${scope.restaurantId}
            AND "stripePaymentIntentId" = ${paymentIntentId}
          RETURNING *
        `)

        return rows[0] ?? null
      })
    },

    async markPaymentSucceededByIntent(paymentIntentId: string) {
      return withTenantConnection(scope.restaurantId, async (prisma) => {
        const rows = await prisma.$queryRaw<CheckoutSessionRow[]>(Prisma.sql`
          UPDATE "CheckoutSession"
          SET "status" = ${Prisma.sql`${"PAYMENT_SUCCEEDED" satisfies CheckoutSessionStatus}::"CheckoutSessionStatus"`},
              "updatedAt" = NOW()
          WHERE "restaurantId" = ${scope.restaurantId}
            AND "stripePaymentIntentId" = ${paymentIntentId}
          RETURNING *
        `)

        return rows[0] ?? null
      })
    },

    async createOrderFromCheckoutSession(checkoutSessionId: string) {
      return withTenantConnection(scope.restaurantId, async (prisma) => {
        const checkoutSession = await findCheckoutSessionById(prisma, checkoutSessionId)

        if (!checkoutSession) {
          return { kind: "not_found" as const }
        }

        if (checkoutSession.createdOrderId) {
          const existingOrder = await prisma.order.findFirst({
            where: scoped.scopeWhere({ id: checkoutSession.createdOrderId }),
            include: {
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

          return {
            kind: "already_created" as const,
            order: existingOrder,
          }
        }

        const cartSnapshot = parseCheckoutCartSnapshot(checkoutSession.cartSnapshot as Prisma.JsonValue)
        const createdOrder = await persistOrderFromSnapshot(prisma, scope, scoped, {
          customerId: checkoutSession.customerId,
          customerNameSnapshot: checkoutSession.customerNameSnapshot,
          customerPhoneSnapshot: checkoutSession.customerPhoneSnapshot,
          fulfillmentType: checkoutSession.fulfillmentType,
          notes: checkoutSession.notes,
          pickupTime: checkoutSession.pickupTime,
          deliveryAddressSnapshot:
            checkoutSession.deliveryAddressSnapshot === null
              ? null
              : (checkoutSession.deliveryAddressSnapshot as Prisma.InputJsonValue),
          items: cartSnapshot.items,
          subtotalCents: checkoutSession.subtotalCents,
          taxCents: checkoutSession.taxCents,
          totalCents: checkoutSession.totalCents,
          paymentStatus: "PAID",
          stripePaymentIntentId: checkoutSession.stripePaymentIntentId,
        })

        await prisma.$executeRaw(Prisma.sql`
          UPDATE "CheckoutSession"
          SET "createdOrderId" = ${createdOrder.id},
              "status" = ${Prisma.sql`${"ORDER_CREATED" satisfies CheckoutSessionStatus}::"CheckoutSessionStatus"`},
              "updatedAt" = NOW()
          WHERE "restaurantId" = ${scope.restaurantId}
            AND "id" = ${checkoutSession.id}
        `)

        return {
          kind: "created" as const,
          order: createdOrder,
        }
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
        const normalized = await normalizeOrderItems(prisma, scope, scoped, input.items)

        return persistOrderFromSnapshot(prisma, scope, scoped, {
          customerId: input.customerId,
          customerNameSnapshot: input.customerNameSnapshot,
          customerPhoneSnapshot: input.customerPhoneSnapshot,
          fulfillmentType: input.fulfillmentType,
          notes: input.notes,
          pickupTime: input.pickupTime,
          deliveryAddressSnapshot: input.deliveryAddressSnapshot ?? null,
          items: normalized.items,
          subtotalCents: normalized.subtotalCents,
          taxCents: normalized.taxCents,
          totalCents: normalized.totalCents,
          paymentStatus: "PENDING",
        })
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

    async enqueueStatusNotification(
      orderId: string,
      nextStatus: OrderStatus,
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

        const customerPhone =
          existing.customerPhoneSnapshot ?? existing.customer?.phone ?? null
        if (!customerPhone) {
          return null
        }

        const brandConfig = await prisma.brandConfig.findUnique({
          where: {
            restaurantId: scope.restaurantId,
          },
        })

        const rawConfig =
          brandConfig?.config &&
          typeof brandConfig.config === "object" &&
          !Array.isArray(brandConfig.config)
            ? (brandConfig.config as Record<string, unknown>)
            : {}

        const restaurantName = resolveRestaurantDisplayName({
          appTitle:
            typeof rawConfig.appTitle === "string" ? rawConfig.appTitle : null,
          restaurantSlug: existing.restaurant.slug,
          restaurantName: existing.restaurant.name,
        })

        return prisma.notificationJob.create({
          data: scoped.scopeCreate({
            orderId,
            customerId: existing.customerId ?? null,
            type: "ORDER_STATUS" satisfies NotificationJobType,
            status: "PENDING",
            payload: {
              orderId,
              orderNumber: existing.orderNumber,
              customerPhone,
              restaurantName,
              newStatus: nextStatus,
            },
          }),
        })
      })
    },

    async enqueueDeliveryEtaNotification(orderId: string, etaMinutes: number) {
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

        const customerPhone =
          existing.customerPhoneSnapshot ?? existing.customer?.phone ?? null
        if (!customerPhone) {
          return null
        }

        const brandConfig = await prisma.brandConfig.findUnique({
          where: { restaurantId: scope.restaurantId },
        })

        const rawConfig =
          brandConfig?.config &&
          typeof brandConfig.config === "object" &&
          !Array.isArray(brandConfig.config)
            ? (brandConfig.config as Record<string, unknown>)
            : {}

        const restaurantName = resolveRestaurantDisplayName({
          appTitle:
            typeof rawConfig.appTitle === "string" ? rawConfig.appTitle : null,
          restaurantSlug: existing.restaurant.slug,
          restaurantName: existing.restaurant.name,
        })

        return prisma.notificationJob.create({
          data: scoped.scopeCreate({
            orderId,
            customerId: existing.customerId ?? null,
            type: "ORDER_STATUS" satisfies NotificationJobType,
            status: "PENDING",
            payload: {
              orderId,
              orderNumber: existing.orderNumber,
              customerPhone,
              restaurantName,
              newStatus: "DELIVERY_ETA",
              etaMinutes,
            },
          }),
        })
      })
    },
  }

  const payments = {
    async getStripeConnection() {
      return withTenantConnection(scope.restaurantId, async (prisma) => {
        const restaurant = await prisma.restaurant.findUnique({
          where: { id: scope.restaurantId },
          include: {
            brandConfig: true,
          },
        })

        if (!restaurant) {
          throw notFound("Restaurant")
        }

        const rawConfig =
          restaurant.brandConfig?.config &&
          typeof restaurant.brandConfig.config === "object" &&
          !Array.isArray(restaurant.brandConfig.config)
            ? (restaurant.brandConfig.config as Record<string, unknown>)
            : {}

        return {
          restaurantId: restaurant.id,
          slug: restaurant.slug,
          name: restaurant.name,
          displayName: resolveRestaurantDisplayName({
            appTitle:
              typeof rawConfig.appTitle === "string" ? rawConfig.appTitle : null,
            restaurantSlug: restaurant.slug,
            restaurantName: restaurant.name,
          }),
          stripeAccountId: restaurant.stripeAccountId,
          stripeChargesEnabled: restaurant.stripeChargesEnabled,
          stripePayoutsEnabled: restaurant.stripePayoutsEnabled,
        }
      })
    },

    async setStripeAccountId(stripeAccountId: string) {
      return withTenantConnection(scope.restaurantId, async (prisma) => {
        return prisma.restaurant.update({
          where: { id: scope.restaurantId },
          data: {
            stripeAccountId,
          },
        })
      })
    },

    async updateStripeCapabilities(input: {
      chargesEnabled: boolean
      payoutsEnabled: boolean
    }) {
      return withTenantConnection(scope.restaurantId, async (prisma) => {
        return prisma.restaurant.update({
          where: { id: scope.restaurantId },
          data: {
            stripeChargesEnabled: input.chargesEnabled,
            stripePayoutsEnabled: input.payoutsEnabled,
          },
        })
      })
    },
  }

  const printing = {
    async getSettings() {
      return withTenantConnection(scope.restaurantId, async (prisma) => {
        const restaurant = await prisma.restaurant.findUnique({
          where: { id: scope.restaurantId },
          select: {
            cloudPrntEnabled: true,
            cloudPrntMacAddress: true,
          },
        })

        if (!restaurant) {
          throw notFound("Restaurant")
        }

        return restaurant
      })
    },

    async updateSettings(input: {
      cloudPrntEnabled: boolean
      cloudPrntMacAddress: string | null
    }) {
      return withTenantConnection(scope.restaurantId, async (prisma) => {
        return prisma.restaurant.update({
          where: { id: scope.restaurantId },
          data: {
            cloudPrntEnabled: input.cloudPrntEnabled,
            cloudPrntMacAddress: input.cloudPrntMacAddress,
          },
          select: {
            cloudPrntEnabled: true,
            cloudPrntMacAddress: true,
          },
        })
      })
    },
  }

  return {
    brand,
    scope,
    customers,
    menu,
    checkouts,
    orders,
    payments,
    printing,
  }
}
