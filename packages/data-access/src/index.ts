export {
  bindTenantScope,
  createTenantScope,
  scopeCreate,
  scopeDelete,
  scopeUpdate,
  scopeWhere
} from "./scope"
export { createPlatformDataAccess } from "./repositories/platform"
export { createTenantDataAccess } from "./repositories/tenant"
export { createWorkerDataAccess } from "./repositories/worker"
export type {
  TenantScope,
  TenantScoped,
  TenantScopedMutation,
  WithoutRestaurantId
} from "./scope"
