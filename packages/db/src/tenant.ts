import { AsyncLocalStorage } from 'node:async_hooks'
import type { PrismaClient } from '../generated/client/index.js'

const als = new AsyncLocalStorage<{ tenantId: string }>()

export function runWithTenant<T>(tenantId: string, cb: () => Promise<T>): Promise<T> {
  return als.run({ tenantId }, cb)
}

export function getTenantId(): string | undefined {
  return als.getStore()?.tenantId
}

export async function setTenantOnConnection(tx: PrismaClient, tenantId: string) {
  await tx.$executeRawUnsafe(`SET LOCAL app.restaurant_id = '${tenantId}'`)
}
