import { randomUUID } from "node:crypto"
import { PrismaClient } from "../generated/client/index.js"

const prisma = new PrismaClient()

const tenantDefinitions = [
  {
    slug: "joes-pizza",
    name: "Joe's Pizza",
    orderNumberStart: 1003,
    domain: "joes-pizza.localhost",
    subdomain: "joes-pizza.example.com",
    brandConfig: {
      appTitle: "Joe's Pizza",
      primaryColor: "#b42318",
      onPrimary: "#fff7ed",
      fontFamily: "Oswald, sans-serif",
      themePreset: "warm-casual"
    },
    menuName: "Main Menu",
    categories: [
      {
        name: "Pizza",
        items: [
          {
            name: "Margherita",
            description: "San Marzano tomato, mozzarella, basil",
            basePriceCents: 1499,
            tags: ["vegetarian", "classic"],
            prepTimeMinutes: 14,
            isFeatured: true,
            variants: [
              { name: "12 inch", priceCents: 1499, isDefault: true },
              { name: "16 inch", priceCents: 2199, isDefault: false }
            ],
            modifierGroups: [
              {
                name: "Cheese Add-ons",
                selection: "MULTIPLE",
                isRequired: false,
                minSelections: 0,
                maxSelections: 3,
                allowOptionQuantity: false,
                options: [
                  { name: "Fresh Mozzarella", priceDeltaCents: 250 },
                  { name: "Ricotta", priceDeltaCents: 200 },
                  { name: "Parmesan", priceDeltaCents: 150 }
                ]
              }
            ]
          },
          {
            name: "Pepperoni",
            description: "Cup-and-char pepperoni, mozzarella, oregano",
            basePriceCents: 1699,
            tags: ["bestseller"],
            prepTimeMinutes: 15,
            isFeatured: true,
            variants: [
              { name: "12 inch", priceCents: 1699, isDefault: true },
              { name: "16 inch", priceCents: 2399, isDefault: false }
            ],
            modifierGroups: [
              {
                name: "Extra Toppings",
                selection: "MULTIPLE",
                isRequired: false,
                minSelections: 0,
                maxSelections: 4,
                allowOptionQuantity: false,
                options: [
                  { name: "Extra Pepperoni", priceDeltaCents: 250 },
                  { name: "Mushrooms", priceDeltaCents: 200 },
                  { name: "Hot Honey", priceDeltaCents: 150 }
                ]
              }
            ]
          }
        ]
      },
      {
        name: "Apps",
        items: [
          {
            name: "Garlic Knots",
            description: "Six knots, roasted garlic butter, parmesan",
            basePriceCents: 699,
            tags: ["shareable"],
            prepTimeMinutes: 8,
            isFeatured: false,
            variants: [
              { name: "Standard", priceCents: 699, isDefault: true }
            ],
            modifierGroups: []
          },
          {
            name: "Caesar Salad",
            description: "Romaine, croutons, parmesan, house caesar",
            basePriceCents: 1099,
            tags: ["salad"],
            prepTimeMinutes: 6,
            isFeatured: false,
            variants: [
              { name: "Standard", priceCents: 1099, isDefault: true }
            ],
            modifierGroups: [
              {
                name: "Protein",
                selection: "SINGLE",
                isRequired: false,
                minSelections: 0,
                maxSelections: 1,
                allowOptionQuantity: false,
                options: [
                  { name: "Chicken", priceDeltaCents: 350 },
                  { name: "Shrimp", priceDeltaCents: 550 }
                ]
              }
            ]
          }
        ]
      }
    ]
  },
  {
    slug: "sunrise-cafe",
    name: "Sunrise Cafe",
    orderNumberStart: 2003,
    domain: "sunrise-cafe.localhost",
    subdomain: "sunrise-cafe.example.com",
    brandConfig: {
      appTitle: "Sunrise Cafe",
      primaryColor: "#3f5f45",
      onPrimary: "#f7f2e8",
      fontFamily: "Fraunces, serif",
      themePreset: "earthy-warm"
    },
    menuName: "All Day",
    categories: [
      {
        name: "Coffee",
        items: [
          {
            name: "Latte",
            description: "Espresso with silky steamed milk",
            basePriceCents: 525,
            tags: ["coffee"],
            prepTimeMinutes: 4,
            isFeatured: true,
            variants: [
              { name: "12 oz", priceCents: 525, isDefault: true },
              { name: "16 oz", priceCents: 625, isDefault: false }
            ],
            modifierGroups: [
              {
                name: "Milk",
                selection: "SINGLE",
                isRequired: true,
                minSelections: 1,
                maxSelections: 1,
                allowOptionQuantity: false,
                options: [
                  { name: "Whole", priceDeltaCents: 0 },
                  { name: "Oat", priceDeltaCents: 75 },
                  { name: "Almond", priceDeltaCents: 75 }
                ]
              },
              {
                name: "Syrup",
                selection: "MULTIPLE",
                isRequired: false,
                minSelections: 0,
                maxSelections: 2,
                allowOptionQuantity: false,
                options: [
                  { name: "Vanilla", priceDeltaCents: 50 },
                  { name: "Caramel", priceDeltaCents: 50 },
                  { name: "Honey Cinnamon", priceDeltaCents: 75 }
                ]
              }
            ]
          },
          {
            name: "Cold Brew",
            description: "Slow-steeped for 18 hours",
            basePriceCents: 475,
            tags: ["coffee", "iced"],
            prepTimeMinutes: 2,
            isFeatured: false,
            variants: [
              { name: "16 oz", priceCents: 475, isDefault: true },
              { name: "24 oz", priceCents: 575, isDefault: false }
            ],
            modifierGroups: []
          }
        ]
      },
      {
        name: "Breakfast",
        items: [
          {
            name: "Avocado Toast",
            description: "Sourdough, chili flakes, lemon, herbs",
            basePriceCents: 1299,
            tags: ["vegetarian", "breakfast"],
            prepTimeMinutes: 8,
            isFeatured: true,
            variants: [
              { name: "Standard", priceCents: 1299, isDefault: true }
            ],
            modifierGroups: [
              {
                name: "Add-ons",
                selection: "MULTIPLE",
                isRequired: false,
                minSelections: 0,
                maxSelections: 3,
                allowOptionQuantity: false,
                options: [
                  { name: "Poached Egg", priceDeltaCents: 250 },
                  { name: "Feta", priceDeltaCents: 200 },
                  { name: "Smoked Salmon", priceDeltaCents: 450 }
                ]
              }
            ]
          },
          {
            name: "Breakfast Burrito",
            description: "Eggs, potatoes, cheddar, salsa verde",
            basePriceCents: 1399,
            tags: ["breakfast", "handheld"],
            prepTimeMinutes: 10,
            isFeatured: false,
            variants: [
              { name: "Standard", priceCents: 1399, isDefault: true }
            ],
            modifierGroups: [
              {
                name: "Protein",
                selection: "SINGLE",
                isRequired: false,
                minSelections: 0,
                maxSelections: 1,
                allowOptionQuantity: false,
                options: [
                  { name: "Bacon", priceDeltaCents: 250 },
                  { name: "Chorizo", priceDeltaCents: 250 },
                  { name: "Plant Sausage", priceDeltaCents: 250 }
                ]
              }
            ]
          }
        ]
      }
    ]
  }
]

function buildPhone(index) {
  return `+1555${String(100000 + index).slice(-6)}`
}

function seededDate(offsetDays, offsetHours = 0) {
  const now = new Date()
  now.setDate(now.getDate() - offsetDays)
  now.setHours((10 + offsetHours) % 24, 0, 0, 0)
  return now
}

async function resetRestaurantData(restaurantId) {
  await prisma.notificationJob.deleteMany({ where: { restaurantId } })
  await prisma.promotionRedemption.deleteMany({ where: { restaurantId } })
  await prisma.orderStatusEvent.deleteMany({ where: { restaurantId } })
  await prisma.orderItemModifierSelection.deleteMany({ where: { restaurantId } })
  await prisma.orderItem.deleteMany({ where: { restaurantId } })
  await prisma.order.deleteMany({ where: { restaurantId } })
  await prisma.loyaltyEvent.deleteMany({ where: { restaurantId } })
  await prisma.loyaltyAccount.deleteMany({ where: { restaurantId } })
  await prisma.loyaltyProgram.deleteMany({ where: { restaurantId } })
  await prisma.webPushSubscription.deleteMany({ where: { restaurantId } })
  await prisma.smsSubscription.deleteMany({ where: { restaurantId } })
  await prisma.customer.deleteMany({ where: { restaurantId } })
  await prisma.menuItemModifierGroup.deleteMany({ where: { restaurantId } })
  await prisma.modifierOption.deleteMany({ where: { restaurantId } })
  await prisma.modifierGroup.deleteMany({ where: { restaurantId } })
  await prisma.menuItemVariant.deleteMany({ where: { restaurantId } })
  await prisma.menuCategoryItem.deleteMany({ where: { restaurantId } })
  await prisma.menuCategory.deleteMany({ where: { restaurantId } })
  await prisma.menuItem.deleteMany({ where: { restaurantId } })
  await prisma.menu.deleteMany({ where: { restaurantId } })
  await prisma.promotion.deleteMany({ where: { restaurantId } })
  await prisma.restaurantOrderSequence.deleteMany({ where: { restaurantId } })
  await prisma.adminUser.deleteMany({ where: { restaurantId } })
  await prisma.restaurantDomain.deleteMany({ where: { restaurantId } })
  await prisma.brandConfig.deleteMany({ where: { restaurantId } })
}

async function seedRestaurant(definition, restaurantIndex) {
  const restaurant = await prisma.restaurant.upsert({
    where: { slug: definition.slug },
    update: {
      name: definition.name,
      status: "ACTIVE"
    },
    create: {
      slug: definition.slug,
      name: definition.name,
      status: "ACTIVE",
      timezone: "America/New_York"
    }
  })

  await resetRestaurantData(restaurant.id)

  await prisma.brandConfig.create({
    data: {
      restaurantId: restaurant.id,
      config: definition.brandConfig
    }
  })

  await prisma.restaurantDomain.createMany({
    data: [
      {
        restaurantId: restaurant.id,
        hostname: definition.domain,
        sslStatus: "ACTIVE"
      },
      {
        restaurantId: restaurant.id,
        hostname: definition.subdomain,
        sslStatus: "ACTIVE"
      }
    ]
  })

  await prisma.$executeRaw`
    INSERT INTO "AdminUser" ("id", "restaurantId", "clerkUserId", "email", "role", "createdAt")
    VALUES (
      ${randomUUID()},
      ${restaurant.id},
      ${`seed-${definition.slug}-owner`},
      ${`owner@${definition.slug}.test`},
      ${"owner"},
      NOW()
    )
  `

  const menu = await prisma.menu.create({
    data: {
      restaurantId: restaurant.id,
      name: definition.menuName,
      isDefault: true
    }
  })

  const itemCatalog = []

  for (const [categoryIndex, categoryDefinition] of definition.categories.entries()) {
    const category = await prisma.menuCategory.create({
      data: {
        restaurantId: restaurant.id,
        menuId: menu.id,
        name: categoryDefinition.name,
        sortOrder: categoryIndex,
        visibility: "AVAILABLE"
      }
    })

    for (const [itemIndex, itemDefinition] of categoryDefinition.items.entries()) {
      const item = await prisma.menuItem.create({
        data: {
          restaurantId: restaurant.id,
          name: itemDefinition.name,
          description: itemDefinition.description,
          photoUrl: null,
          basePriceCents: itemDefinition.basePriceCents,
          tags: itemDefinition.tags,
          prepTimeMinutes: itemDefinition.prepTimeMinutes,
          specialInstructionsEnabled: true,
          isFeatured: itemDefinition.isFeatured,
          visibility: "AVAILABLE"
        }
      })

      await prisma.menuCategoryItem.create({
        data: {
          restaurantId: restaurant.id,
          categoryId: category.id,
          itemId: item.id,
          sortOrder: itemIndex
        }
      })

      for (const variantDefinition of itemDefinition.variants) {
        await prisma.menuItemVariant.create({
          data: {
            restaurantId: restaurant.id,
            itemId: item.id,
            name: variantDefinition.name,
            priceCents: variantDefinition.priceCents,
            isDefault: variantDefinition.isDefault
          }
        })
      }

      for (const modifierGroupDefinition of itemDefinition.modifierGroups) {
        const modifierGroup = await prisma.modifierGroup.create({
          data: {
            restaurantId: restaurant.id,
            name: `${itemDefinition.name} ${modifierGroupDefinition.name}`,
            selection: modifierGroupDefinition.selection
          }
        })

        await prisma.menuItemModifierGroup.create({
          data: {
            restaurantId: restaurant.id,
            itemId: item.id,
            groupId: modifierGroup.id,
            isRequired: modifierGroupDefinition.isRequired,
            minSelections: modifierGroupDefinition.minSelections,
            maxSelections: modifierGroupDefinition.maxSelections,
            allowOptionQuantity: modifierGroupDefinition.allowOptionQuantity
          }
        })

        for (const [optionIndex, option] of modifierGroupDefinition.options.entries()) {
          await prisma.modifierOption.create({
            data: {
              restaurantId: restaurant.id,
              groupId: modifierGroup.id,
              name: option.name,
              priceDeltaCents: option.priceDeltaCents,
              position: optionIndex
            }
          })
        }
      }

      itemCatalog.push(item)
    }
  }

  await prisma.restaurantOrderSequence.create({
    data: {
      restaurantId: restaurant.id,
      nextValue: definition.orderNumberStart + 200
    }
  })

  await prisma.loyaltyProgram.create({
    data: {
      restaurantId: restaurant.id,
      name: "Points",
      type: "POINTS",
      config: { pointsPerDollar: 1, rewardThreshold: 100 }
    }
  })

  await prisma.promotion.create({
    data: {
      restaurantId: restaurant.id,
      code: restaurantIndex === 0 ? "PIZZA10" : "SUNRISE10",
      description: "Seeded welcome offer",
      type: "PERCENT_OFF",
      value: 10,
      minOrderCents: 1500,
      active: true
    }
  })

  const customers = []
  for (let index = 0; index < 30; index += 1) {
    const customer = await prisma.customer.create({
      data: {
        restaurantId: restaurant.id,
        phone: buildPhone(restaurantIndex * 100 + index),
        email: `customer${restaurantIndex}-${index}@example.test`,
        name: `Customer ${restaurantIndex + 1}-${index + 1}`,
        marketingSmsOptIn: index % 2 === 0,
        marketingEmailOptIn: index % 3 === 0,
        totalSpendCents: 0
      }
    })

    customers.push(customer)

    await prisma.smsSubscription.create({
      data: {
        restaurantId: restaurant.id,
        customerId: customer.id,
        phone: customer.phone,
        optedIn: customer.marketingSmsOptIn
      }
    })
  }

  for (let index = 0; index < 200; index += 1) {
    const customer = customers[index % customers.length]
    const item = itemCatalog[index % itemCatalog.length]
    const quantity = (index % 3) + 1
    const subtotalCents = item.basePriceCents * quantity
    const taxCents = Math.round(subtotalCents * 0.08875)
    const totalCents = subtotalCents + taxCents
    const statusCycle = ["PREPARING", "CONFIRMED", "PENDING", "CANCELLED"]
    const status = statusCycle[index % statusCycle.length]
    const orderNumber = definition.orderNumberStart + index
    const createdAt = seededDate(Math.floor(index / 8), index % 12)

    const order = await prisma.order.create({
      data: {
        restaurantId: restaurant.id,
        customerId: customer.id,
        orderNumber,
        status,
        paymentStatus: status === "CANCELLED" ? "FAILED" : "PAID",
        fulfillmentType: index % 4 === 0 ? "DELIVERY" : "PICKUP",
        subtotalCents,
        taxCents,
        discountCents: 0,
        totalCents,
        notes: index % 7 === 0 ? "No onions" : null,
        pickupTime: new Date(createdAt.getTime() + 20 * 60 * 1000),
        deliveryAddressSnapshot:
          index % 4 === 0
            ? {
                line1: `${100 + index} Main St`,
                city: "Brooklyn",
                state: "NY",
                postalCode: "11201"
              }
            : null,
        customerNameSnapshot: customer.name,
        customerPhoneSnapshot: customer.phone,
        stripePaymentIntentId: `pi_seed_${definition.slug}_${orderNumber}`,
        createdAt,
        updatedAt: createdAt,
        items: {
          create: [
            {
              restaurantId: restaurant.id,
              itemId: item.id,
              name: item.name,
              variantName: null,
              quantity,
              unitPriceCents: item.basePriceCents,
              linePriceCents: subtotalCents,
              notes: null
            }
          ]
        }
      },
      include: {
        items: true
      }
    })

    await prisma.orderStatusEvent.create({
      data: {
        orderId: order.id,
        restaurantId: restaurant.id,
        fromStatus: null,
        toStatus: status,
        source: "seed",
        createdAt
      }
    })

  }

  return restaurant
}

async function main() {
  for (const [index, definition] of tenantDefinitions.entries()) {
    await seedRestaurant(definition, index)
  }
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
