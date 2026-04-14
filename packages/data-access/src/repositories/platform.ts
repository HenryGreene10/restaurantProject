import { randomUUID } from "node:crypto"
import { Prisma } from "@repo/db"
import { getInternalPrismaClient } from "../prisma.js"

export type ResolvedTenant = {
  id: string
  slug: string
}

export type StripeConnectedTenant = {
  id: string
  slug: string
  stripeAccountId: string
  stripeChargesEnabled: boolean
  stripePayoutsEnabled: boolean
}

export type CloudPrntRestaurant = {
  id: string
  slug: string
  timezone: string
  cloudPrntEnabled: boolean
  cloudPrntMacAddress: string | null
  pendingPrintJob: string | null
}

export type AdminAccess = {
  adminUserId: string
  clerkUserId: string
  email: string
  role: string
  restaurantId: string
  tenantSlug: string
  restaurantName: string
}

type AdminAccessRow = {
  adminUserId: string
  clerkUserId: string
  email: string
  role: string
  restaurantId: string
  tenantSlug: string
  restaurantName: string
}

function normalizeSlug(slug: string) {
  return slug.trim().toLowerCase()
}

function mapAdminAccess(row: AdminAccessRow | null) {
  if (!row) {
    return null
  }

  return {
    adminUserId: row.adminUserId,
    clerkUserId: row.clerkUserId,
    email: row.email,
    role: row.role,
    restaurantId: row.restaurantId,
    tenantSlug: row.tenantSlug,
    restaurantName: row.restaurantName,
  }
}

async function queryAdminAccessByColumn(
  column: "clerkUserId" | "email",
  value: string,
) {
  const prisma = getInternalPrismaClient()
  const columnPredicate =
    column === "clerkUserId"
      ? Prisma.sql`admin_user."clerkUserId" = ${value}`
      : Prisma.sql`admin_user."email" = ${value}`
  const rows = await prisma.$queryRaw<AdminAccessRow[]>(Prisma.sql`
    SELECT
      admin_user."id" AS "adminUserId",
      admin_user."clerkUserId" AS "clerkUserId",
      admin_user."email" AS "email",
      admin_user."role" AS "role",
      restaurant."id" AS "restaurantId",
      restaurant."slug" AS "tenantSlug",
      restaurant."name" AS "restaurantName"
    FROM "AdminUser" AS admin_user
    INNER JOIN "Restaurant" AS restaurant
      ON restaurant."id" = admin_user."restaurantId"
    WHERE ${columnPredicate}
    ORDER BY admin_user."createdAt" ASC
    LIMIT 2
  `)

  if (rows.length !== 1) {
    return null
  }

  return mapAdminAccess(rows[0])
}

export function createPlatformDataAccess() {
  const prisma = getInternalPrismaClient()

  return {
    async getRestaurantById(restaurantId: string): Promise<CloudPrntRestaurant | null> {
      const restaurant = await prisma.restaurant.findUnique({
        where: { id: restaurantId },
        select: {
          id: true,
          slug: true,
          timezone: true,
          cloudPrntEnabled: true,
          cloudPrntMacAddress: true,
          pendingPrintJob: true,
        },
      })

      return restaurant
    },

    async findTenantBySlug(slug: string): Promise<ResolvedTenant | null> {
      const restaurant = await prisma.restaurant.findUnique({
        where: { slug: normalizeSlug(slug) }
      })

      if (!restaurant) {
        return null
      }

      return {
        id: restaurant.id,
        slug: restaurant.slug
      }
    },

    async findTenantByHost(host: string): Promise<ResolvedTenant | null> {
      const hostname = host.split(":")[0].toLowerCase()

      const domain = await prisma.restaurantDomain.findUnique({
        where: { hostname }
      })

      if (domain) {
        const restaurant = await prisma.restaurant.findUnique({
          where: { id: domain.restaurantId }
        })

        if (restaurant) {
          return {
            id: restaurant.id,
            slug: restaurant.slug
          }
        }
      }

      const hostParts = hostname.split(".")
      if (hostParts.length < 3) {
        return null
      }

      return this.findTenantBySlug(hostParts[0])
    },

    async isTenantSlugAvailable(slug: string) {
      const existingTenant = await prisma.restaurant.findUnique({
        where: { slug: normalizeSlug(slug) },
        select: { id: true },
      })

      return !existingTenant
    },

    async findTenantByStripeAccountId(
      stripeAccountId: string,
    ): Promise<StripeConnectedTenant | null> {
      const restaurant = await prisma.restaurant.findUnique({
        where: { stripeAccountId },
      })

      if (!restaurant || !restaurant.stripeAccountId) {
        return null
      }

      return {
        id: restaurant.id,
        slug: restaurant.slug,
        stripeAccountId: restaurant.stripeAccountId,
        stripeChargesEnabled: restaurant.stripeChargesEnabled,
        stripePayoutsEnabled: restaurant.stripePayoutsEnabled,
      }
    },

    async findRestaurantByCloudPrntMacAddress(
      cloudPrntMacAddress: string,
    ): Promise<CloudPrntRestaurant | null> {
      const restaurant = await prisma.restaurant.findFirst({
        where: { cloudPrntMacAddress },
        select: {
          id: true,
          slug: true,
          timezone: true,
          cloudPrntEnabled: true,
          cloudPrntMacAddress: true,
          pendingPrintJob: true,
        },
      })

      return restaurant
    },

    async findAdminAccessByClerkUserId(clerkUserId: string): Promise<AdminAccess | null> {
      return queryAdminAccessByColumn("clerkUserId", clerkUserId)
    },

    async claimLegacyAdminAccessByEmail(input: {
      clerkUserId: string
      email: string
    }): Promise<AdminAccess | null> {
      const normalizedEmail = input.email.trim().toLowerCase()
      if (!normalizedEmail) {
        return null
      }

      return prisma.$transaction(async (transactionClient) => {
        const matches = await transactionClient.$queryRaw<AdminAccessRow[]>(Prisma.sql`
          SELECT
            admin_user."id" AS "adminUserId",
            admin_user."clerkUserId" AS "clerkUserId",
            admin_user."email" AS "email",
            admin_user."role" AS "role",
            restaurant."id" AS "restaurantId",
            restaurant."slug" AS "tenantSlug",
            restaurant."name" AS "restaurantName"
          FROM "AdminUser" AS admin_user
          INNER JOIN "Restaurant" AS restaurant
            ON restaurant."id" = admin_user."restaurantId"
          WHERE LOWER(admin_user."email") = ${normalizedEmail}
          ORDER BY admin_user."createdAt" ASC
          LIMIT 2
        `)

        if (matches.length !== 1) {
          return null
        }

        await transactionClient.$executeRaw(Prisma.sql`
          UPDATE "AdminUser"
          SET "clerkUserId" = ${input.clerkUserId}
          WHERE "id" = ${matches[0].adminUserId}
        `)

        return mapAdminAccess({
          ...matches[0],
          clerkUserId: input.clerkUserId,
        })
      })
    },

    async createRestaurantOnboarding(input: {
      clerkUserId: string
      email: string
      restaurantName: string
      slug: string
    }) {
      const normalizedSlug = normalizeSlug(input.slug)
      const normalizedEmail = input.email.trim().toLowerCase()

      try {
        return await prisma.$transaction(async (transactionClient) => {
          const restaurant = await transactionClient.restaurant.create({
            data: {
              id: randomUUID(),
              slug: normalizedSlug,
              name: input.restaurantName.trim(),
            },
          })

          const adminUserId = randomUUID()
          await transactionClient.$executeRaw(Prisma.sql`
            INSERT INTO "AdminUser" (
              "id",
              "restaurantId",
              "clerkUserId",
              "email",
              "role",
              "createdAt"
            ) VALUES (
              ${adminUserId},
              ${restaurant.id},
              ${input.clerkUserId},
              ${normalizedEmail},
              ${"owner"},
              NOW()
            )
          `)

          return {
            adminUserId,
            restaurantId: restaurant.id,
            tenantSlug: restaurant.slug,
            restaurantName: restaurant.name,
          }
        })
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          throw new Error("SLUG_TAKEN")
        }

        throw error
      }
    },

    async deleteRestaurantOnboarding(restaurantId: string) {
      await prisma.$transaction(async (transactionClient) => {
        await transactionClient.$executeRaw(Prisma.sql`
          DELETE FROM "AdminUser"
          WHERE "restaurantId" = ${restaurantId}
        `)

        await transactionClient.restaurant.delete({
          where: { id: restaurantId },
        })
      })
    },

    async updateTenantStripeCapabilities(
      stripeAccountId: string,
      input: {
        chargesEnabled: boolean
        payoutsEnabled: boolean
      },
    ) {
      return prisma.restaurant.update({
        where: { stripeAccountId },
        data: {
          stripeChargesEnabled: input.chargesEnabled,
          stripePayoutsEnabled: input.payoutsEnabled,
        },
      })
    },

    async updateRestaurantPendingPrintJob(
      restaurantId: string,
      pendingPrintJob: string | null,
    ) {
      return prisma.restaurant.update({
        where: { id: restaurantId },
        data: {
          pendingPrintJob,
        },
      })
    },
  }
}
