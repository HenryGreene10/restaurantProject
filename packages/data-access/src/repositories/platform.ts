import { getInternalPrismaClient } from "../prisma"

export type ResolvedTenant = {
  id: string
  slug: string
}

export function createPlatformDataAccess() {
  const prisma = getInternalPrismaClient()

  return {
    async findTenantByHost(host: string): Promise<ResolvedTenant | null> {
      const hostname = host.split(":")[0].toLowerCase()

      const domain = await prisma.domain.findUnique({
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

      const restaurant = await prisma.restaurant.findUnique({
        where: { slug: hostParts[0] }
      })

      if (!restaurant) {
        return null
      }

      return {
        id: restaurant.id,
        slug: restaurant.slug
      }
    }
  }
}
