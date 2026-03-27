import { prisma } from '@repo/db'

export async function tenantFromHost(host: string): Promise<{ id: string, slug: string } | null> {
  const hostname = host.split(':')[0].toLowerCase()
  // Try custom domains first
  const domain = await prisma.domain.findUnique({ where: { hostname } })
  if (domain) {
    const restaurant = await prisma.restaurant.findUnique({ where: { id: domain.restaurantId } })
    if (restaurant) return { id: restaurant.id, slug: restaurant.slug }
  }
  // Fallback to subdomain: <slug>.example.com
  const parts = hostname.split('.')
  if (parts.length >= 3) {
    const slug = parts[0]
    const restaurant = await prisma.restaurant.findUnique({ where: { slug } })
    if (restaurant) return { id: restaurant.id, slug: restaurant.slug }
  }
  return null
}
