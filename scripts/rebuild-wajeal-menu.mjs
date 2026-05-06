import { PrismaClient } from "../packages/db/generated/client/index.js"

const prisma = new PrismaClient()

const TENANT_SLUG = "wajeal"

const spiceLevelOptions = [
  { name: "As Recommended", priceDeltaCents: 0 },
  { name: "Not Spicy", priceDeltaCents: 0 },
  { name: "Not Spicy / Chili Oil on Side", priceDeltaCents: 0 },
  { name: "Mild Spice", priceDeltaCents: 0 },
  { name: "Extra Spicy", priceDeltaCents: 0 },
]

const riceOptionOptions = [
  { name: "White Rice", priceDeltaCents: 0 },
  { name: "No Rice", priceDeltaCents: 0 },
  { name: "Brown Rice", priceDeltaCents: 140 },
  { name: "Brown & White Rice", priceDeltaCents: 230 },
]

const steamedSauceOptions = [
  { name: "Ginger Scallion", priceDeltaCents: 0 },
  { name: "Spicy Garlic", priceDeltaCents: 0 },
  { name: "Brown", priceDeltaCents: 0 },
  { name: "House Special (mild spicy)", priceDeltaCents: 0 },
]

function dollars(value) {
  return Math.round(value * 100)
}

function item(name, price, extras = {}) {
  return {
    name,
    basePriceCents: dollars(price),
    description: extras.description ?? null,
    tags: extras.tags ?? [],
    modifiers: extras.modifiers ?? [],
  }
}

function proteinOption(name, upcharge) {
  return { name, priceDeltaCents: dollars(upcharge) }
}

function proteinModifier(options, extra = {}) {
  return {
    kind: "protein",
    options,
    required: extra.required ?? true,
  }
}

function spiceModifier() {
  return { kind: "spice" }
}

function riceModifier() {
  return { kind: "rice" }
}

function sauceModifier() {
  return { kind: "sauce" }
}

const menuDefinition = [
  {
    name: "Cold Appetizers",
    items: [
      item("Shredded Chicken w. Spicy Sesame Dressing", 14.95),
      item("Thin Sliced Beef & Tripe w. Chili oil, Cilantro, Minced Peanut", 17.5),
      item("Pork Belly & Cucumber Sliced in Chili Garlic Sauce", 16.95),
      item("Sliced Chicken w. Chili Sesame Soy & Peanut", 16.5),
      item("Herbed Bamboo Shoots", 13.95),
      item("Cucumber Sticks w. Dipping Sauce", 11.5),
      item("Chef's Chili Pickled Vegetables", 8.95),
      item("Spicy Sesame Noodle", 9.95),
    ],
  },
  {
    name: "Hot Appetizers",
    items: [
      item("Veggie Spring Roll", 6.95),
      item("Steamed Shrimp Dumpling", 12.95),
      item("Scallion Pancakes", 8.95),
      item("Pan Seared Pork Dumpling", 9.95),
      item("Steamed Veggie Dumpling", 14.5),
      item("Pork Dumpling w. Chili-Garlic & Minced Peanut", 12.5),
      item("Honey Glazed Spare Ribs", 16.5),
      item("Steamed Mini Pork Buns", 15.5),
      item("Fried Calamari w. Spiced Salt & Pepper", 16.95),
      item("Crab Rangoon", 13.5),
      item("Shrimp Roll", 13.5),
    ],
  },
  {
    name: "Soups",
    items: [
      item("Fish Filet w. Sour Pickle Soup", 16.95),
      item("Seafood Tofu Chowder", 15.95),
      item("West Lake Beef Chowder", 15.95),
      item("Wonton in Chicken Broth", 10.95),
      item("Assorted Mushroom Soup", 16.95),
      item("Hot & Sour Soup", 6.5),
      item("Mixed Vegetables & Tofu", 13.5),
      item("Mixed Vegetables Soup", 6.5),
      item("Corn Egg Drop Soup", 6.5),
    ],
  },
  {
    name: "Chef's Specialties",
    items: [
      item("Peking Duck — Half", 39.95, {
        description: "Shredded cucumbers, scallions, 4 crepes.",
      }),
      item("Peking Duck — Full", 76.95, {
        description: "Shredded cucumbers, scallions, 10 crepes included.",
      }),
      item("Whole Fish w. Chili Bean Sauce", 44.95),
      item("Crispy Whole Fish Deboned w. Pine Nut Sauce", 44.95),
      item("Filet Mignon Black Pepper Sauce", 44.95),
      item("Tea Smoked Duck (Half)", 34.95),
      item("Shredded Tea Smoked Duck w. Spring Ginger", 28.95),
      item("Whole Fish w. Chili & Garlic", 44.95),
      item("Whole Fish w. Sour Pickled Chili", 44.95),
      item("Steamed Whole Fish w. Ginger & Scallion", 43.95),
      item("Grand Marnier Prawns", 28.95, {
        description: "Sauté Prawns w. Sweet Citrus Sauce",
      }),
      item("Prawns w. Spiced Chili Cucumber", 28.95),
      item("Prawns w. Asparagus, Ginger & Scallion", 29.95),
      item("Shredded Beef w. Dry Chili Sichuan Pepper  (spicy 8/10)", 25.95),
      item("Crispy Shredded Beef sweet, vinegar, sesame seed", 28.95),
      item("Double cooked pork belly w. leek and Sichuan fermented chili (spicy 6/10)", 24.95),
      item("Diced chicken w. Thousand Chili (spicy 7/10)", 23.95),
      item("Stir fried chicken w. hot green pepper , dried red pepper ( spicy 7/10)", 23.95),
      item("Ma Po Tofu w. ginger, garlic, chili sauce", 19.95),
      item("Diced Fish & Crispy Tofu w. Ma Po sauce", 27.95),
      item("Tofu w. Chili-Sliced Pork", 19.95),
      item("Crispy Fish Filets w. Chili Sauce", 28.95),
      item("Baby Shrimp w. Peas, Carrot & Corn", 23.95),
      item("Baby Shrimp & Cucumber w. Chili Sauce", 23.95),
      item("Baby Shrimp w. Sichuan Chili Peppercorn", 24.95),
    ],
  },
  {
    name: "Entrees — Select Your Protein",
    items: [
      item("Kung Pao", 21.5, {
        description: "Bell peppers, roasted peanuts, dried chili, serve with rice. (spicy level 3/10)",
        modifiers: [
          proteinModifier([
            proteinOption("Tofu", 0),
            proteinOption("Chicken", 2),
            proteinOption("Shrimp", 7),
            proteinOption("Diced Fish", 6),
          ]),
          spiceModifier(),
          riceModifier(),
        ],
      }),
      item("Tangerine sauce", 21.5, {
        description: "Broccoli, aromatic citrus-chili sauce. (spicy 3/10)",
        modifiers: [
          proteinModifier([
            proteinOption("Tofu", 0),
            proteinOption("Chicken", 2),
            proteinOption("Beef", 4),
            proteinOption("Prawns", 7),
          ]),
          spiceModifier(),
          riceModifier(),
        ],
      }),
      item("General Tso's", 19.95, {
        description: "Broccoli, chili sweet-vinegar, scallion (spicy 3/10)",
        modifiers: [
          proteinModifier([
            proteinOption("Tofu", 0),
            proteinOption("Chicken", 2.5),
            proteinOption("Beef", 5),
            proteinOption("Prawns", 8),
          ]),
          spiceModifier(),
          riceModifier(),
        ],
      }),
      item("Sesame Sauce Style", 19.95, {
        modifiers: [
          proteinModifier([
            proteinOption("Tofu", 0),
            proteinOption("Chicken", 2),
            proteinOption("Prawns", 6),
            proteinOption("Crispy Shredded Beef", 7),
          ]),
          spiceModifier(),
          riceModifier(),
        ],
      }),
      item("Sweet & Sour Style", 19.5, {
        modifiers: [
          proteinModifier([
            proteinOption("Chicken", 2),
            proteinOption("Fish Filets", 7),
            proteinOption("Fried Tofu", 0),
          ]),
          spiceModifier(),
          riceModifier(),
        ],
      }),
      item("Spicy Garlic Style", 19.95, {
        description: "Straw mushroom, water chestnut, wood ear mushroom, Garlic, ginger, chili, vinegar, scallion",
        modifiers: [
          proteinModifier([
            proteinOption("Eggplant", 0),
            proteinOption("Tofu", 0),
            proteinOption("Chicken (Shredded)", 3),
            proteinOption("Crispy Chicken", 3),
            proteinOption("Pork (Shredded)", 3),
            proteinOption("Prawns", 8),
            proteinOption("Scallops", 8),
          ]),
          spiceModifier(),
          riceModifier(),
        ],
      }),
      item("Hunan Sauce Style", 19.95, {
        description: "Bell pepper, broccoli, bamboo shoot, straw mushroom. Spicy level 3/10",
        modifiers: [
          proteinModifier([
            proteinOption("Tofu", 0),
            proteinOption("Chicken", 2),
            proteinOption("Beef", 4),
            proteinOption("Prawn", 8),
          ]),
          spiceModifier(),
          riceModifier(),
        ],
      }),
      item("Lemon Sauce Style", 19.95, {
        modifiers: [
          proteinModifier([
            proteinOption("Tofu", 0),
            proteinOption("Crisp Chicken", 2),
            proteinOption("Prawn", 8),
          ]),
          spiceModifier(),
          riceModifier(),
        ],
      }),
      item("Cashew Style", 20.5, {
        description: "Bell peppers, cashew, not spicy.",
        modifiers: [
          proteinModifier([
            proteinOption("Tofu", 0),
            proteinOption("Chicken", 2),
            proteinOption("Prawn", 8),
          ]),
          spiceModifier(),
          riceModifier(),
        ],
      }),
      item("Brown Sauce", 19.5, {
        description: "Sautee with Broccoli",
        modifiers: [
          proteinModifier([
            proteinOption("Chicken", 2),
            proteinOption("Beef", 5),
            proteinOption("Prawn", 9),
            proteinOption("Scallop", 9),
          ]),
          spiceModifier(),
          riceModifier(),
        ],
      }),
      item("Spiced Salt & Pepper — Crispy", 20.95, {
        description: "Stir fry, spiced salt, black pepper,  green pepper",
        modifiers: [
          proteinModifier([
            proteinOption("Fried Lotus Root", 0),
            proteinOption("Scallops", 8),
            proteinOption("Fried Prawns (Shelled)", 8),
          ]),
          spiceModifier(),
          riceModifier(),
        ],
      }),
      item("Toasted Rice Style", 20.95, {
        description: "Puffed crispy rice topped with vegetables in savory gravy — dramatic tableside preparation.",
        modifiers: [
          proteinModifier([
            proteinOption("Tofu", 1),
            proteinOption("Chichen", 3),
            proteinOption("Beef", 6),
            proteinOption("Prawns", 9),
            proteinOption("Scallop", 9),
          ]),
          spiceModifier(),
          riceModifier(),
        ],
      }),
      item("Hot Sauce Style", 20.95, {
        description: "Napa Cabage, celery, garlic in authentic Sichuan chili oil hot sauce",
        modifiers: [
          proteinModifier([
            proteinOption("Fried Tofu", 0),
            proteinOption("Chicken", 2.5),
            proteinOption("Pork", 3),
            proteinOption("Fish", 6),
            proteinOption("Beef", 6.5),
          ]),
          spiceModifier(),
          riceModifier(),
        ],
      }),
      item("Chili-Cumin", 20.95, {
        description: "Bamboo shoot, onion, bell pepper",
        modifiers: [
          proteinModifier([
            proteinOption("Tofu", 0),
            proteinOption("Spare Ribs", 2),
            proteinOption("Beef", 7),
            proteinOption("Lamb", 7),
          ]),
          spiceModifier(),
          riceModifier(),
        ],
      }),
      item("Roasted Chili", 20.95, {
        description: "Bamboo shoot, bell pepper, onion, dried chili (spicy 8/10)",
        modifiers: [
          proteinModifier([
            proteinOption("Tofu", 0),
            proteinOption("Chicken", 3),
            proteinOption("Beef", 5),
            proteinOption("Prawn", 8),
            proteinOption("Fish", 9),
          ]),
          spiceModifier(),
          riceModifier(),
        ],
      }),
      item("Mixed vegetable w. brown sauce", 19.95, {
        modifiers: [
          proteinModifier([
            proteinOption("Tofu", 0),
            proteinOption("Chicken", 3),
            proteinOption("Beef", 5),
            proteinOption("Prawn", 8),
          ]),
          spiceModifier(),
          riceModifier(),
        ],
      }),
      item("Dried tofu", 17.95, {
        description: "Shredded Tofu, celery, bell pepper, chili.",
        modifiers: [
          proteinModifier([
            proteinOption("Pork", 3),
            proteinOption("Chicken", 2),
            proteinOption("Beef", 4),
          ]),
          spiceModifier(),
          riceModifier(),
        ],
      }),
      item("Moo Shu", 19.95, {
        description: "Shredded cabbage, black fungus mushroom, eggs, Includes 4 crepes & plum sauce",
        modifiers: [
          proteinModifier([
            proteinOption("Vegetable", 0),
            proteinOption("Pork", 2),
            proteinOption("Chicken", 2),
            proteinOption("Beef", 4),
            proteinOption("Baby Shrimp", 5),
          ]),
          spiceModifier(),
          riceModifier(),
        ],
      }),
    ],
  },
  {
    name: "Steamed Dishes",
    items: [
      item("Steamed Dishes", 19.95, {
        description: "Steamed in a bamboo steamer. Sauce on the side: Ginger Scallion / Spicy Garlic / Brown / House Special (mild spicy)",
        modifiers: [
          proteinModifier([
            proteinOption("Broccoli", 0),
            proteinOption("Mixed vegetable", 0),
            proteinOption("Chicken", 3),
            proteinOption("Spinach & Tofu", 1),
            proteinOption("Scallops", 9),
            proteinOption("Prawns", 9),
          ]),
          sauceModifier(),
          spiceModifier(),
          riceModifier(),
        ],
      }),
    ],
  },
  {
    name: "Vegetables",
    items: [
      item("Sauté Snow Pea Leaf", 23.95, {
        modifiers: [spiceModifier(), riceModifier()],
      }),
      item("Shiitake w. Baby Bok Choy", 19.95, {
        modifiers: [spiceModifier(), riceModifier()],
      }),
      item("Sauté Chinese Broccoli", 20.95, {
        modifiers: [spiceModifier(), riceModifier()],
      }),
      item("Sauté Spinach w. Garlic", 19.95, {
        modifiers: [spiceModifier(), riceModifier()],
      }),
      item("Sauté Baby Bok Choy", 19.95, {
        modifiers: [spiceModifier(), riceModifier()],
      }),
      item("Sauté String Beans", 19.95, {
        modifiers: [spiceModifier(), riceModifier()],
      }),
    ],
  },
  {
    name: "Rice & Noodles",
    items: [
      item("House Special Fried Rice", 20.95, {
        description: "Diced cured pork, onion, scallion & egg. Set recipe.",
        modifiers: [spiceModifier()],
      }),
      item("Young Chow Fried Rice", 20.95, {
        description: "Shrimp, chicken, pork, egg & vegetable. Set combination.",
        modifiers: [spiceModifier()],
      }),
      item("Fried Rice", 16.95, {
        modifiers: [
          proteinModifier([
            proteinOption("Vegetable", 0),
            proteinOption("Eggs", 0),
            proteinOption("Pork", 1),
            proteinOption("Chicken", 1),
            proteinOption("Beef", 2),
            proteinOption("Shrimp", 2),
          ]),
          spiceModifier(),
          riceModifier(),
        ],
      }),
      item("Singapore Rice Noodle w. Curry", 20.95, {
        description: "Shrimp, chicken, pork, egg & vegetable. Set combination.",
        modifiers: [spiceModifier()],
      }),
      item("Mei Fun", 16.95, {
        description: "Thin rice vermicelli, wok-tossed with vegetable",
        modifiers: [
          proteinModifier([
            proteinOption("Vegetable", 0),
            proteinOption("Egg", 0),
            proteinOption("Pork", 1),
            proteinOption("Chicken", 1),
            proteinOption("Beef", 2),
            proteinOption("Shrimp", 2),
          ]),
          spiceModifier(),
          riceModifier(),
        ],
      }),
      item("Crispy Noodles", 16.95, {
        description: "Pan-fried crispy noodles with thick savory gravy.",
        modifiers: [
          proteinModifier([
            proteinOption("Vegetable", 2),
            proteinOption("Pork", 3),
            proteinOption("Chicken", 3),
            proteinOption("Beef", 3),
            proteinOption("Prawn", 5),
          ]),
          spiceModifier(),
          riceModifier(),
        ],
      }),
      item("Chow Fun", 17.95, {
        description: "Flat wide rice noodles, wok-tossed.",
        modifiers: [
          proteinModifier([
            proteinOption("Vegetable", 0),
            proteinOption("Chicken", 1),
            proteinOption("Pork", 1),
            proteinOption("Beef", 2),
          ]),
          spiceModifier(),
          riceModifier(),
        ],
      }),
      item("Lo Mein", 14.95, {
        description: "Soft egg noodle, wok-tossed with vegetables.",
        modifiers: [
          proteinModifier([
            proteinOption("Vegetable", 0),
            proteinOption("Egg", 0),
            proteinOption("Pork", 1),
            proteinOption("Chicken", 1),
            proteinOption("Beef", 2),
            proteinOption("Shrimp", 2),
          ]),
          spiceModifier(),
          riceModifier(),
        ],
      }),
    ],
  },
]

function visibleGroupName(kind) {
  if (kind === "protein") return "Protein"
  if (kind === "spice") return "Spice Level"
  if (kind === "rice") return "Rice Option"
  if (kind === "sauce") return "Sauce"
  throw new Error(`Unsupported modifier kind: ${kind}`)
}

function selectionTypeFor(kind) {
  return kind === "spice" || kind === "rice" || kind === "sauce" || kind === "protein"
    ? "SINGLE"
    : "MULTIPLE"
}

function optionsForSharedKind(kind) {
  if (kind === "spice") return spiceLevelOptions
  if (kind === "rice") return riceOptionOptions
  if (kind === "sauce") return steamedSauceOptions
  throw new Error(`Unsupported shared modifier kind: ${kind}`)
}

function hiddenSuffix(index) {
  return "\u200B".repeat(index)
}

async function ensureSharedGroup(tx, restaurantId, kind) {
  const groupName = visibleGroupName(kind)
  const existing = await tx.modifierGroup.findFirst({
    where: { restaurantId, name: groupName },
    include: { options: true },
  })

  if (existing) {
    return existing
  }

  return tx.modifierGroup.create({
    data: {
      restaurantId,
      name: groupName,
      selection: selectionTypeFor(kind),
      options: {
        create: optionsForSharedKind(kind).map((option, index) => ({
          restaurantId,
          name: option.name,
          priceDeltaCents: option.priceDeltaCents,
          position: index,
        })),
      },
    },
    include: { options: true },
  })
}

async function createProteinGroup(tx, restaurantId, proteinIndex, options) {
  return tx.modifierGroup.create({
    data: {
      restaurantId,
      name: `Protein${hiddenSuffix(proteinIndex)}`,
      selection: "SINGLE",
      options: {
        create: options.map((option, index) => ({
          restaurantId,
          name: option.name,
          priceDeltaCents: option.priceDeltaCents,
          position: index,
        })),
      },
    },
    include: { options: true },
  })
}

async function attachGroup(tx, restaurantId, itemId, groupId, modifier) {
  const kind = modifier.kind
  const isRequired = kind === "protein" ? (modifier.required ?? true) : kind === "sauce"
  const minSelections = isRequired ? 1 : 0
  const maxSelections = 1

  await tx.menuItemModifierGroup.create({
    data: {
      restaurantId,
      itemId,
      groupId,
      isRequired,
      minSelections,
      maxSelections,
      allowOptionQuantity: false,
    },
  })
}

async function rebuild() {
  const restaurant = await prisma.restaurant.findUnique({
    where: { slug: TENANT_SLUG },
    select: { id: true, name: true, slug: true },
  })

  if (!restaurant) {
    throw new Error(`Restaurant ${TENANT_SLUG} not found`)
  }

  const dryRunSummary = menuDefinition.map((category) => ({
    category: category.name,
    items: category.items.length,
  }))

  console.log(JSON.stringify({ tenant: restaurant, categories: dryRunSummary }, null, 2))

  await prisma.$transaction(async (tx) => {
    const restaurantId = restaurant.id

    await tx.menuItemModifierGroup.deleteMany({ where: { restaurantId } })
    await tx.modifierOption.deleteMany({ where: { restaurantId } })
    await tx.modifierGroup.deleteMany({ where: { restaurantId } })
    await tx.menuCategoryItem.deleteMany({ where: { restaurantId } })
    await tx.menuItemVariant.deleteMany({ where: { restaurantId } })
    await tx.menuItem.deleteMany({ where: { restaurantId } })
    await tx.menuCategory.deleteMany({ where: { restaurantId } })
    await tx.menu.deleteMany({ where: { restaurantId } })

    const menu = await tx.menu.create({
      data: {
        restaurantId,
        name: "Main Menu",
        isDefault: true,
      },
    })

    const sharedGroups = {
      spice: await ensureSharedGroup(tx, restaurantId, "spice"),
      rice: await ensureSharedGroup(tx, restaurantId, "rice"),
      sauce: await ensureSharedGroup(tx, restaurantId, "sauce"),
    }

    let proteinGroupCounter = 0

    for (const [categoryIndex, categoryDefinition] of menuDefinition.entries()) {
      const category = await tx.menuCategory.create({
        data: {
          restaurantId,
          menuId: menu.id,
          name: categoryDefinition.name,
          sortOrder: categoryIndex,
        },
      })

      for (const [itemIndex, itemDefinition] of categoryDefinition.items.entries()) {
        const createdItem = await tx.menuItem.create({
          data: {
            restaurantId,
            name: itemDefinition.name,
            description: itemDefinition.description,
            basePriceCents: itemDefinition.basePriceCents,
            tags: itemDefinition.tags,
            specialInstructionsEnabled: false,
          },
        })

        await tx.menuCategoryItem.create({
          data: {
            restaurantId,
            categoryId: category.id,
            itemId: createdItem.id,
            sortOrder: itemIndex,
          },
        })

        for (const modifier of itemDefinition.modifiers) {
          let group

          if (modifier.kind === "protein") {
            proteinGroupCounter += 1
            group = await createProteinGroup(
              tx,
              restaurantId,
              proteinGroupCounter,
              modifier.options
            )
          } else {
            group = sharedGroups[modifier.kind]
          }

          await attachGroup(tx, restaurantId, createdItem.id, group.id, modifier)
        }
      }
    }
  }, { maxWait: 10000, timeout: 120000 })

  const created = await prisma.menuCategory.findMany({
    where: { restaurantId: restaurant.id },
    orderBy: { sortOrder: "asc" },
    include: {
      categoryItems: {
        orderBy: { sortOrder: "asc" },
        include: {
          item: {
            include: {
              itemModifierGroups: {
                include: {
                  group: {
                    include: {
                      options: {
                        orderBy: { position: "asc" },
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
  })

  const summary = created.map((category) => ({
    name: category.name,
    count: category.categoryItems.length,
    items: category.categoryItems.map((entry) => ({
      name: entry.item.name,
      price: entry.item.basePriceCents / 100,
      modifiers: entry.item.itemModifierGroups.map((group) => ({
        name: group.group.name.replace(/\u200B+/g, ""),
        required: group.isRequired,
        options: group.group.options.map((option) => ({
          name: option.name,
          upcharge: option.priceDeltaCents / 100,
        })),
      })),
    })),
  }))

  console.log(JSON.stringify(summary, null, 2))
}

rebuild()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
