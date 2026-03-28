import { PrismaClient, type Prisma } from "@prisma/client"

// Keep the Prisma client internal to this package. Callers only receive
// tenant-bound repositories, never the raw client itself.
const prismaClient = new PrismaClient({
  log: ["error", "warn"]
})

export type RootPrismaClient = PrismaClient
export type TenantTransactionClient = Prisma.TransactionClient

export async function withTenantConnection<T>(
  restaurantId: string,
  callback: (client: TenantTransactionClient) => Promise<T>
): Promise<T> {
  return prismaClient.$transaction(async (transactionClient) => {
    await transactionClient.$executeRawUnsafe(
      `SET LOCAL app.restaurant_id = '${restaurantId}'`
    )

    return callback(transactionClient)
  })
}

export function getInternalPrismaClient(): RootPrismaClient {
  return prismaClient
}
