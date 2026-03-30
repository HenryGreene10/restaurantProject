export {
  bindTenantScope,
  createTenantScope,
  scopeCreate,
  scopeDelete,
  scopeUpdate,
  scopeWhere
} from "./scope.js"
export { createPlatformDataAccess } from "./repositories/platform.js"
export { createTenantDataAccess } from "./repositories/tenant.js"
export { createWorkerDataAccess } from "./repositories/worker.js"
export type {
  TenantScope,
  TenantScoped,
  TenantScopedMutation,
  WithoutRestaurantId
} from "./scope.js"
