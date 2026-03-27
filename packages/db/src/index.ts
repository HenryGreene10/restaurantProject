import { PrismaClient } from '@prisma/client'

// Single Prisma instance for the monorepo
export const prisma = new PrismaClient({
  log: ['error', 'warn']
})

// Run a callback within a tenant scoped transaction.
export async function withTenant<T>(restaurantId: string, fn: (tx: PrismaClient) => Promise<T>): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET LOCAL app.restaurant_id = '${restaurantId}'`)
    return fn(tx)
  })
}

// Helper to compute Grubhub savings (30% reference)
export function computeSavings(gross: number): number {
  return Math.round(gross * 0.30)
}
