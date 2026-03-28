import { getInternalPrismaClient } from "../prisma"

export type ResolvedTenant = {
  id: string
  slug: string
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
    }
  }
}
