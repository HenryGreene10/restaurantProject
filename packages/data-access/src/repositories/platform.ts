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

export function createPlatformDataAccess() {
  const prisma = getInternalPrismaClient()

  return {
    async findTenantBySlug(slug: string): Promise<ResolvedTenant | null> {
      const restaurant = await prisma.restaurant.findUnique({
        where: { slug: slug.toLowerCase() }
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
    }
  }
}
