export const ACTIVE_ORDER_STORAGE_KEY = "activeOrder"
const ACTIVE_ORDER_DISMISSED_KEY = "activeOrderDismissed"

export type ActiveOrderRecord = {
  orderId: string
  tenantSlug: string
  placedAt: string
  discountCents?: number
  isNewMember?: boolean
}

function recordSignature(record: ActiveOrderRecord) {
  return `${record.tenantSlug}:${record.orderId}`
}

export function readActiveOrder(): ActiveOrderRecord | null {
  if (typeof window === "undefined") return null

  const raw = window.localStorage.getItem(ACTIVE_ORDER_STORAGE_KEY)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as Partial<ActiveOrderRecord>
    if (
      typeof parsed.orderId === "string" &&
      typeof parsed.tenantSlug === "string" &&
      typeof parsed.placedAt === "string"
    ) {
      return parsed as ActiveOrderRecord
    }
  } catch {
    return null
  }

  return null
}

export function writeActiveOrder(record: ActiveOrderRecord) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(ACTIVE_ORDER_STORAGE_KEY, JSON.stringify(record))
  window.sessionStorage.removeItem(ACTIVE_ORDER_DISMISSED_KEY)
}

export function clearActiveOrder(record?: ActiveOrderRecord | null) {
  if (typeof window === "undefined") return

  const existing = readActiveOrder()
  if (record && existing && recordSignature(existing) !== recordSignature(record)) {
    return
  }

  window.localStorage.removeItem(ACTIVE_ORDER_STORAGE_KEY)
  window.sessionStorage.removeItem(ACTIVE_ORDER_DISMISSED_KEY)
}

export function dismissActiveOrderForSession(record: ActiveOrderRecord) {
  if (typeof window === "undefined") return
  window.sessionStorage.setItem(ACTIVE_ORDER_DISMISSED_KEY, recordSignature(record))
}

export function isActiveOrderDismissed(record: ActiveOrderRecord) {
  if (typeof window === "undefined") return false
  return window.sessionStorage.getItem(ACTIVE_ORDER_DISMISSED_KEY) === recordSignature(record)
}
