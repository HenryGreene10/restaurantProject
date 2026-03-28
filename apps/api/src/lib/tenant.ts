import { createPlatformDataAccess } from '@repo/data-access'

export async function tenantFromHost(host: string): Promise<{ id: string, slug: string } | null> {
  const platformDataAccess = createPlatformDataAccess()
  return platformDataAccess.findTenantByHost(host)
}

export async function tenantFromSlug(slug: string): Promise<{ id: string, slug: string } | null> {
  const platformDataAccess = createPlatformDataAccess()
  return platformDataAccess.findTenantBySlug(slug)
}
