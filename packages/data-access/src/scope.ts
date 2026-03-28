const tenantScopeBrand: unique symbol = Symbol("TenantScope")

type RestaurantIdKey = "restaurantId" | "restaurant_id"

export type TenantScope = {
  readonly restaurantId: string
  readonly [tenantScopeBrand]: "TenantScope"
}

export type WithoutRestaurantId<T> = T extends object
  ? Omit<T, RestaurantIdKey>
  : T

export type TenantScoped<T extends object> = WithoutRestaurantId<T> & {
  restaurantId: string
}

export type TenantScopedMutation<TWhere extends object, TData extends object> = {
  where: TenantScoped<TWhere>
  data: WithoutRestaurantId<TData>
}

export function createTenantScope(restaurantId: string): TenantScope {
  const normalizedRestaurantId = restaurantId.trim()
  if (!normalizedRestaurantId) {
    throw new Error("TenantScope requires a non-empty restaurantId")
  }

  return {
    restaurantId: normalizedRestaurantId,
    [tenantScopeBrand]: "TenantScope"
  }
}

export function scopeWhere<TWhere extends object>(
  scope: TenantScope,
  where: WithoutRestaurantId<TWhere>
): TenantScoped<TWhere> {
  return {
    ...where,
    restaurantId: scope.restaurantId
  }
}

export function scopeCreate<TCreate extends object>(
  scope: TenantScope,
  data: WithoutRestaurantId<TCreate>
): TenantScoped<TCreate> {
  return {
    ...data,
    restaurantId: scope.restaurantId
  }
}

export function scopeUpdate<TWhere extends object, TData extends object>(
  scope: TenantScope,
  where: WithoutRestaurantId<TWhere>,
  data: WithoutRestaurantId<TData>
): TenantScopedMutation<TWhere, TData> {
  return {
    where: scopeWhere(scope, where),
    data
  }
}

export function scopeDelete<TWhere extends object>(
  scope: TenantScope,
  where: WithoutRestaurantId<TWhere>
): TenantScoped<TWhere> {
  return scopeWhere(scope, where)
}

export function bindTenantScope(scope: TenantScope) {
  return {
    scope,
    scopeWhere: <TWhere extends object>(where: WithoutRestaurantId<TWhere>) =>
      scopeWhere(scope, where),
    scopeCreate: <TCreate extends object>(data: WithoutRestaurantId<TCreate>) =>
      scopeCreate(scope, data),
    scopeUpdate: <TWhere extends object, TData extends object>(
      where: WithoutRestaurantId<TWhere>,
      data: WithoutRestaurantId<TData>
    ) => scopeUpdate(scope, where, data),
    scopeDelete: <TWhere extends object>(where: WithoutRestaurantId<TWhere>) =>
      scopeDelete(scope, where)
  }
}
