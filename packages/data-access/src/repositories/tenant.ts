import type {
  BrandTheme,
  Customer,
  MenuCategory,
  MenuItem,
  MenuVariant,
  Order,
  OrderItem
} from "@prisma/client"
import { withTenantConnection } from "../prisma"
import {
  bindTenantScope,
  type TenantScope,
  type WithoutRestaurantId
} from "../scope"

type MenuCategoryWithItems = MenuCategory & {
  items: Array<MenuItem & { variants: MenuVariant[] }>
}

type CreateOrderItemInput = {
  itemId?: string
  name: string
  variant?: string | null
  modifiers?: unknown
  quantity?: number
  price?: number
}

type CreateOrderInput = {
  customerId?: string | null
  type?: "PICKUP" | "DELIVERY"
  notes?: string | null
  pickupTime?: Date | null
  deliveryAddr?: unknown
  items: CreateOrderItemInput[]
}

type CreatedOrder = Order & { items: OrderItem[] }

type UpsertCustomerByPhoneInput = {
  phone: string
  email?: string | null
  name?: string | null
}

export function createTenantDataAccess(scope: TenantScope) {
  const scoped = bindTenantScope(scope)

  const menu = {
    async listCategoriesWithItems(): Promise<{
      categories: MenuCategoryWithItems[]
      brand: BrandTheme | null
    }> {
      return withTenantConnection(scope.restaurantId, async (prisma) => {
        const [categories, brand] = await Promise.all([
          prisma.menuCategory.findMany({
            where: scoped.scopeWhere({}),
            include: {
              items: {
                include: {
                  variants: true
                }
              }
            },
            orderBy: {
              position: "asc"
            }
          }),
          prisma.brandTheme.findUnique({
            where: {
              restaurantId: scope.restaurantId
            }
          })
        ])

        return { categories, brand }
      })
    },

    async createCategory(
      data: WithoutRestaurantId<{
        name: string
        position?: number
      }>
    ): Promise<MenuCategory> {
      return withTenantConnection(scope.restaurantId, async (prisma) => {
        return prisma.menuCategory.create({
          data: scoped.scopeCreate(data)
        })
      })
    }
  }

  const customers = {
    async findById(customerId: string): Promise<Customer | null> {
      return withTenantConnection(scope.restaurantId, async (prisma) => {
        return prisma.customer.findFirst({
          where: scoped.scopeWhere({
            id: customerId
          })
        })
      })
    },

    async findByPhone(phone: string): Promise<Customer | null> {
      return withTenantConnection(scope.restaurantId, async (prisma) => {
        return prisma.customer.findFirst({
          where: scoped.scopeWhere({
            phone
          })
        })
      })
    },

    async upsertByPhone(input: UpsertCustomerByPhoneInput): Promise<Customer> {
      return withTenantConnection(scope.restaurantId, async (prisma) => {
        const existingCustomer = await prisma.customer.findFirst({
          where: scoped.scopeWhere({
            phone: input.phone
          })
        })

        if (existingCustomer) {
          return prisma.customer.update({
            where: { id: existingCustomer.id },
            data: {
              email: input.email ?? existingCustomer.email,
              name: input.name ?? existingCustomer.name
            }
          })
        }

        return prisma.customer.create({
          data: scoped.scopeCreate({
            phone: input.phone,
            email: input.email ?? null,
            name: input.name ?? null
          })
        })
      })
    }
  }

  const orders = {
    async createOrder(input: CreateOrderInput): Promise<CreatedOrder> {
      return withTenantConnection(scope.restaurantId, async (prisma) => {
        let subtotal = 0
        for (const item of input.items) {
          subtotal += (item.price ?? 0) * (item.quantity ?? 1)
        }

        const tax = Math.round(subtotal * 0.08875)
        const total = subtotal + tax

        return prisma.order.create({
          data: {
            ...scoped.scopeCreate({
              customerId: input.customerId ?? null,
              status: "RECEIVED",
              type: input.type === "DELIVERY" ? "DELIVERY" : "PICKUP",
              subtotal,
              tax,
              total,
              notes: input.notes ?? null,
              pickupTime: input.pickupTime ?? null,
              deliveryAddr: input.deliveryAddr ?? null
            }),
            items: {
              create: input.items.map((item) =>
                scoped.scopeCreate({
                  itemId: item.itemId ?? "custom",
                  name: item.name,
                  variant: item.variant ?? null,
                  modifiers: item.modifiers ?? null,
                  quantity: item.quantity ?? 1,
                  price: (item.price ?? 0) * (item.quantity ?? 1)
                })
              )
            }
          },
          include: {
            items: true
          }
        })
      })
    },

    async listActiveKitchenOrders(): Promise<CreatedOrder[]> {
      return withTenantConnection(scope.restaurantId, async (prisma) => {
        return prisma.order.findMany({
          where: scoped.scopeWhere({
            status: {
              in: ["RECEIVED", "IN_PREPARATION", "READY"]
            }
          }),
          include: {
            items: true
          },
          orderBy: {
            createdAt: "desc"
          }
        })
      })
    }
  }

  return {
    scope,
    customers,
    menu,
    orders
  }
}
