import React, { useEffect, useMemo, useRef, useState } from "react"
import {
  ClerkProvider,
  SignIn,
  SignedIn,
  SignedOut,
  useAuth,
  useClerk,
  useUser,
} from "@clerk/clerk-react"
import { createRoot } from "react-dom/client"

type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PREPARING"
  | "READY"
  | "COMPLETED"
  | "CANCELLED"

type KitchenOrderItemModifier = {
  id: string
  groupName: string
  optionName: string
  portion?: string | null
}

type KitchenOrderItem = {
  id: string
  name: string
  quantity: number
  variantName: string | null
  notes?: string | null
  modifierSelections?: KitchenOrderItemModifier[]
}

type KitchenOrder = {
  id: string
  orderNumber: number
  customerNameSnapshot: string | null
  createdAt: string
  status: OrderStatus
  notes?: string | null
  fulfillmentType: "PICKUP" | "DELIVERY"
  deliveryAddressSnapshot: string | null
  items: KitchenOrderItem[]
}

type CompletedOrderRecord = {
  completedAt: string
  order: KitchenOrder
}

type KitchenTab = "pending" | "active" | "completed"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api"
const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ?? ""
const TENANT_DOMAIN_SUFFIX = (import.meta.env.VITE_TENANT_DOMAIN_SUFFIX ?? "").trim().toLowerCase()

const RESERVED_KITCHEN_SUBDOMAINS = new Set(["www", "admin", "api", "app", "kiosk", "kitchen"])

function getTenantSlugFromSubdomain(): string | null {
  if (typeof window === "undefined") return null
  const hostname = window.location.hostname.toLowerCase()

  if (TENANT_DOMAIN_SUFFIX && hostname.endsWith(`.${TENANT_DOMAIN_SUFFIX}`)) {
    const sub = hostname.slice(0, -(`.${TENANT_DOMAIN_SUFFIX}`.length)).trim()
    if (sub && !RESERVED_KITCHEN_SUBDOMAINS.has(sub)) return sub
  }

  if (import.meta.env.DEV) {
    const q = new URLSearchParams(window.location.search).get("tenant")?.trim()
    return q || null
  }

  return null
}
const POLL_INTERVAL_MS = 10_000
const EIGHT_HOURS_MS = 8 * 60 * 60 * 1000
const FOUR_HOURS_MS = 4 * 60 * 60 * 1000
const SOUND_PREF_STORAGE_KEY = "kitchen-dashboard-sound-enabled"
const COMPLETED_CACHE_STORAGE_KEY = "kitchen-dashboard-completed-orders"

type ClerkTokenGetter = () => Promise<string | null>

const statusAction: Record<
  OrderStatus,
  | {
      label: string
      nextStatus: OrderStatus
    }
  | null
> = {
  PENDING: { label: "Confirm & print receipt", nextStatus: "CONFIRMED" },
  CONFIRMED: { label: "Start preparing", nextStatus: "PREPARING" },
  PREPARING: { label: "Mark ready", nextStatus: "READY" },
  READY: { label: "Picked up", nextStatus: "COMPLETED" },
  COMPLETED: null,
  CANCELLED: null,
}

function tenantSlugFromMetadata(value: unknown) {
  if (typeof value !== "string") {
    return null
  }

  const nextValue = value.trim()
  return nextValue.length > 0 ? nextValue : null
}

function completedCacheKey(tenantSlug: string) {
  return `${COMPLETED_CACHE_STORAGE_KEY}:${tenantSlug}`
}

function readSoundPreference() {
  if (typeof window === "undefined") {
    return true
  }

  const rawValue = window.localStorage.getItem(SOUND_PREF_STORAGE_KEY)
  return rawValue === null ? true : rawValue === "true"
}

function writeSoundPreference(enabled: boolean) {
  window.localStorage.setItem(SOUND_PREF_STORAGE_KEY, String(enabled))
}

function readCompletedOrders(tenantSlug: string): CompletedOrderRecord[] {
  if (typeof window === "undefined") {
    return []
  }

  try {
    const rawValue = window.localStorage.getItem(completedCacheKey(tenantSlug))
    if (!rawValue) {
      return []
    }

    const parsed = JSON.parse(rawValue) as unknown
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed.filter((entry): entry is CompletedOrderRecord => {
      if (!entry || typeof entry !== "object") {
        return false
      }

      const candidate = entry as Record<string, unknown>
      return (
        typeof candidate.completedAt === "string" &&
        typeof candidate.order === "object" &&
        candidate.order !== null
      )
    })
  } catch {
    return []
  }
}

function writeCompletedOrders(tenantSlug: string, entries: CompletedOrderRecord[]) {
  window.localStorage.setItem(completedCacheKey(tenantSlug), JSON.stringify(entries))
}

function parseOrderTimestamp(value: string) {
  return new Date(value).getTime()
}

function isWithinWindow(value: string, durationMs: number) {
  return Date.now() - parseOrderTimestamp(value) <= durationMs
}

function formatPlacedTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value))
}

function formatElapsedTime(value: string) {
  const elapsedMs = Date.now() - parseOrderTimestamp(value)
  const elapsedMinutes = Math.max(0, Math.floor(elapsedMs / 60_000))

  if (elapsedMinutes < 1) {
    return "Just now"
  }

  if (elapsedMinutes < 60) {
    return `${elapsedMinutes} min ago`
  }

  const hours = Math.floor(elapsedMinutes / 60)
  const minutes = elapsedMinutes % 60

  if (hours < 24) {
    return minutes === 0
      ? `${hours} hr ago`
      : `${hours} hr ${minutes} min ago`
  }

  return `${Math.floor(hours / 24)} day ago`
}

function orderStatusLabel(status: OrderStatus) {
  switch (status) {
    case "PENDING":
      return "Pending"
    case "CONFIRMED":
      return "Confirmed"
    case "PREPARING":
      return "Preparing"
    case "READY":
      return "Ready"
    case "COMPLETED":
      return "Picked up"
    case "CANCELLED":
      return "Cancelled"
  }
}

function statusStyles(status: OrderStatus) {
  switch (status) {
    case "PENDING":
      return {
        badgeBackground: "rgba(255,255,255,0.08)",
        badgeColor: "#f9fafb",
        border: "1px solid rgba(255,255,255,0.07)",
        cardBackground: "#1f2937",
      }
    case "CONFIRMED":
      return {
        badgeBackground: "rgba(59,130,246,0.2)",
        badgeColor: "#dbeafe",
        border: "1px solid rgba(96,165,250,0.25)",
        cardBackground: "linear-gradient(180deg, rgba(30,64,175,0.28), rgba(17,24,39,0.95))",
      }
    case "PREPARING":
      return {
        badgeBackground: "rgba(245,158,11,0.2)",
        badgeColor: "#fef3c7",
        border: "1px solid rgba(251,191,36,0.24)",
        cardBackground: "linear-gradient(180deg, rgba(146,64,14,0.28), rgba(17,24,39,0.95))",
      }
    case "READY":
    case "COMPLETED":
      return {
        badgeBackground: "rgba(34,197,94,0.2)",
        badgeColor: "#dcfce7",
        border: "1px solid rgba(74,222,128,0.24)",
        cardBackground: "linear-gradient(180deg, rgba(21,128,61,0.24), rgba(17,24,39,0.95))",
      }
    case "CANCELLED":
      return {
        badgeBackground: "rgba(239,68,68,0.2)",
        badgeColor: "#fecaca",
        border: "1px solid rgba(248,113,113,0.24)",
        cardBackground: "#1f2937",
      }
  }
}

function modifierLine(modifier: KitchenOrderItemModifier) {
  if (modifier.portion && modifier.portion !== "WHOLE") {
    return `${modifier.optionName} (${modifier.portion.toLowerCase()})`
  }

  return modifier.optionName
}

async function fetchKitchenOrders(tenantSlug: string) {
  const response = await fetch(`${API_BASE_URL}/v1/kitchen/orders`, {
    headers: {
      "x-tenant-slug": tenantSlug,
    },
  })

  const body = (await response.json().catch(() => null)) as
    | { error?: string; orders?: KitchenOrder[] }
    | null

  if (!response.ok) {
    throw new Error(body?.error ?? "Failed to load kitchen orders")
  }

  return (body?.orders ?? []).slice().sort((left, right) => {
    return parseOrderTimestamp(right.createdAt) - parseOrderTimestamp(left.createdAt)
  })
}

async function transitionKitchenOrder(
  getToken: ClerkTokenGetter,
  tenantSlug: string,
  orderId: string,
  nextStatus: OrderStatus,
) {
  const token = await getToken()
  if (!token) {
    throw new Error("Unable to authenticate your kitchen session.")
  }

  const response = await fetch(`${API_BASE_URL}/admin/orders/${orderId}/status`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "x-tenant-slug": tenantSlug,
    },
    body: JSON.stringify({ status: nextStatus }),
  })

  const body = (await response.json().catch(() => null)) as { error?: string } | null

  if (!response.ok) {
    throw new Error(body?.error ?? "Failed to update order")
  }
}

async function sendKitchenDeliveryEta(
  getToken: ClerkTokenGetter,
  tenantSlug: string,
  orderId: string,
  etaMinutes: number,
) {
  const token = await getToken()
  if (!token) {
    throw new Error("Unable to authenticate your kitchen session.")
  }

  const response = await fetch(`${API_BASE_URL}/admin/orders/${orderId}/delivery-eta`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "x-tenant-slug": tenantSlug,
    },
    body: JSON.stringify({ etaMinutes }),
  })

  const body = (await response.json().catch(() => null)) as { error?: string } | null

  if (!response.ok) {
    throw new Error(body?.error ?? "Failed to send delivery ETA")
  }
}

async function printKitchenOrder(
  getToken: ClerkTokenGetter,
  tenantSlug: string,
  orderId: string,
) {
  const token = await getToken()
  if (!token) {
    throw new Error("Unable to authenticate your kitchen session.")
  }

  const response = await fetch(`${API_BASE_URL}/admin/orders/${orderId}/print`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "x-tenant-slug": tenantSlug,
    },
  })

  const body = (await response.json().catch(() => null)) as { error?: string } | null

  if (!response.ok) {
    throw new Error(body?.error ?? "Failed to queue print job")
  }
}

function playAlertTone(audioContextRef: React.MutableRefObject<AudioContext | null>) {
  if (typeof window === "undefined") {
    return
  }

  const AudioContextCtor =
    window.AudioContext ||
    (
      window as typeof window & {
        webkitAudioContext?: typeof AudioContext
      }
    ).webkitAudioContext

  if (!AudioContextCtor) {
    return
  }

  const audioContext = audioContextRef.current ?? new AudioContextCtor()
  audioContextRef.current = audioContext

  if (audioContext.state === "suspended") {
    void audioContext.resume()
  }

  const now = audioContext.currentTime
  const frequencies = [880, 1174]

  frequencies.forEach((frequency, index) => {
    const oscillator = audioContext.createOscillator()
    const gain = audioContext.createGain()
    const startAt = now + index * 0.18

    oscillator.type = "sine"
    oscillator.frequency.setValueAtTime(frequency, startAt)

    gain.gain.setValueAtTime(0.0001, startAt)
    gain.gain.exponentialRampToValueAtTime(0.18, startAt + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.16)

    oscillator.connect(gain)
    gain.connect(audioContext.destination)
    oscillator.start(startAt)
    oscillator.stop(startAt + 0.18)
  })
}

function mergeCompletedOrders(
  tenantSlug: string,
  liveReadyOrders: KitchenOrder[],
  cachedCompletedOrders: CompletedOrderRecord[],
) {
  const readyEntries = liveReadyOrders.map((order) => ({
    completedAt: order.createdAt,
    order,
  }))

  const byId = new Map<string, CompletedOrderRecord>()

  for (const entry of [...cachedCompletedOrders, ...readyEntries]) {
    if (!isWithinWindow(entry.completedAt, FOUR_HOURS_MS)) {
      continue
    }

    const existing = byId.get(entry.order.id)
    if (!existing || parseOrderTimestamp(existing.completedAt) < parseOrderTimestamp(entry.completedAt)) {
      byId.set(entry.order.id, entry)
    }
  }

  const merged = Array.from(byId.values()).sort(
    (left, right) => parseOrderTimestamp(right.completedAt) - parseOrderTimestamp(left.completedAt),
  )

  writeCompletedOrders(tenantSlug, merged)
  return merged
}

function EmptyState({
  eyebrow,
  title,
}: {
  eyebrow: string
  title: string
}) {
  return (
    <section
      style={{
        borderRadius: "20px",
        background: "#1f2937",
        padding: "36px 28px",
        textAlign: "center",
        color: "#d1d5db",
      }}
    >
      <div
        style={{
          fontSize: "18px",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "#9ca3af",
        }}
      >
        {eyebrow}
      </div>
      <div style={{ marginTop: "12px", fontSize: "28px", color: "#ffffff" }}>
        {title}
      </div>
    </section>
  )
}

function TabButton({
  active,
  count,
  label,
  onClick,
}: {
  active: boolean
  count: number
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "10px",
        minHeight: "48px",
        borderRadius: "999px",
        border: active ? "1px solid rgba(255,255,255,0.16)" : "1px solid rgba(255,255,255,0.08)",
        background: active ? "#f9fafb" : "rgba(255,255,255,0.04)",
        color: active ? "#111827" : "#e5e7eb",
        padding: "0 16px",
        fontSize: "15px",
        fontWeight: 700,
        cursor: "pointer",
      }}
    >
      <span>{label}</span>
      <span
        style={{
          minWidth: "28px",
          borderRadius: "999px",
          padding: "4px 8px",
          background: active ? "rgba(17,24,39,0.08)" : "rgba(255,255,255,0.08)",
          color: active ? "#111827" : "#f9fafb",
          fontSize: "13px",
          fontWeight: 700,
          textAlign: "center",
        }}
      >
        {count}
      </span>
    </button>
  )
}

function OrderCard({
  onAdvance,
  onPrint,
  onSendEta,
  order,
  printMessage,
  printMessageTone,
  updating,
  printing,
}: {
  onAdvance: (order: KitchenOrder) => void
  onPrint: (order: KitchenOrder) => void
  onSendEta?: (etaMinutes: number) => Promise<void>
  order: KitchenOrder
  printMessage?: string | null
  printMessageTone?: "info" | "success" | "error"
  updating: boolean
  printing: boolean
}) {
  const action = statusAction[order.status]
  const colors = statusStyles(order.status)
  const specialInstructions = order.notes?.trim() ?? ""
  const isDelivery = order.fulfillmentType === "DELIVERY"
  const deliveryAddress =
    typeof order.deliveryAddressSnapshot === "string"
      ? order.deliveryAddressSnapshot.trim()
      : null

  const [etaInput, setEtaInput] = useState("")
  const [etaSending, setEtaSending] = useState(false)
  const [etaSent, setEtaSent] = useState(false)
  const [etaError, setEtaError] = useState<string | null>(null)

  async function handleSendEta() {
    const minutes = parseInt(etaInput, 10)
    if (!minutes || minutes <= 0 || !onSendEta) {
      setEtaError("Enter a valid number of minutes")
      return
    }
    setEtaSending(true)
    setEtaError(null)
    try {
      await onSendEta(minutes)
      setEtaSent(true)
      setEtaInput("")
    } catch (error) {
      setEtaError(error instanceof Error ? error.message : "Failed to send ETA")
    } finally {
      setEtaSending(false)
    }
  }

  return (
    <section
      style={{
        display: "grid",
        gap: "18px",
        borderRadius: "22px",
        border: colors.border,
        background: colors.cardBackground,
        padding: "22px",
        boxShadow: "0 20px 40px rgba(0,0,0,0.22)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "16px",
          alignItems: "start",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "grid", gap: "8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <div
              style={{
                fontSize: "36px",
                fontWeight: 800,
                lineHeight: 1,
                letterSpacing: "-0.04em",
              }}
            >
              #{order.orderNumber}
            </div>
            {isDelivery ? (
              <div
                style={{
                  borderRadius: "999px",
                  padding: "4px 12px",
                  background: "rgba(251,146,60,0.2)",
                  color: "#fed7aa",
                  border: "1px solid rgba(251,146,60,0.3)",
                  fontSize: "13px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                Delivery
              </div>
            ) : null}
          </div>
          <div style={{ fontSize: "26px", fontWeight: 700, lineHeight: 1.1 }}>
            {order.customerNameSnapshot || "Guest"}
          </div>
          {isDelivery && deliveryAddress ? (
            <div
              style={{
                borderRadius: "12px",
                background: "rgba(251,146,60,0.12)",
                border: "1px solid rgba(251,146,60,0.25)",
                color: "#fed7aa",
                padding: "10px 14px",
                fontSize: "15px",
                fontWeight: 600,
                lineHeight: 1.4,
              }}
            >
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  marginBottom: "4px",
                  opacity: 0.7,
                }}
              >
                Delivery address
              </div>
              {deliveryAddress}
            </div>
          ) : null}
          <div style={{ display: "grid", gap: "4px", color: "#d1d5db" }}>
            <div style={{ fontSize: "18px", fontWeight: 700 }}>
              {formatElapsedTime(order.createdAt)}
            </div>
            <div style={{ fontSize: "14px", color: "#9ca3af" }}>
              Placed at {formatPlacedTime(order.createdAt)}
            </div>
          </div>
        </div>

        <div
          style={{
            borderRadius: "999px",
            padding: "8px 14px",
            background: colors.badgeBackground,
            color: colors.badgeColor,
            fontSize: "14px",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          {orderStatusLabel(order.status)}
        </div>
      </div>

      {specialInstructions ? (
        <div
          style={{
            borderRadius: "16px",
            background: "#fef3c7",
            border: "1px solid rgba(245,158,11,0.34)",
            color: "#78350f",
            padding: "14px 16px",
            display: "grid",
            gap: "6px",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Special instructions
          </div>
          <div style={{ fontSize: "18px", fontWeight: 800, lineHeight: 1.35 }}>
            {specialInstructions}
          </div>
        </div>
      ) : null}

      <div style={{ display: "grid", gap: "12px" }}>
        {order.items.map((item) => {
          const detailLines = [
            item.variantName?.trim() || null,
            ...(item.modifierSelections ?? []).map((modifier) => modifierLine(modifier)),
            item.notes?.trim() ? `Item note: ${item.notes.trim()}` : null,
          ].filter((value): value is string => Boolean(value))

          return (
            <div
              key={item.id}
              style={{
                display: "grid",
                gap: "8px",
                borderRadius: "16px",
                background: "rgba(255,255,255,0.05)",
                padding: "14px 16px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "16px",
                  alignItems: "start",
                  fontSize: "20px",
                }}
              >
                <div style={{ color: "#ffffff", fontWeight: 700 }}>
                  {item.quantity} × {item.name}
                </div>
              </div>

              {detailLines.length > 0 ? (
                <div style={{ display: "grid", gap: "4px" }}>
                  {detailLines.map((line, index) => (
                    <div
                      key={`${item.id}-${index}`}
                      style={{
                        fontSize: "15px",
                        color: "#d1d5db",
                        lineHeight: 1.4,
                      }}
                    >
                      {line}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>

      {isDelivery && onSendEta ? (
        <div
          style={{
            borderRadius: "16px",
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(251,146,60,0.2)",
            padding: "14px 16px",
            display: "grid",
            gap: "10px",
          }}
        >
          <div
            style={{
              fontSize: "13px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "#fed7aa",
            }}
          >
            Send delivery ETA
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <input
              type="number"
              min={1}
              value={etaInput}
              onChange={(event) => {
                setEtaInput(event.target.value)
                setEtaSent(false)
              }}
              placeholder="Minutes"
              disabled={etaSending}
              style={{
                flex: 1,
                minHeight: "44px",
                borderRadius: "10px",
                border: "1px solid rgba(255,255,255,0.15)",
                background: "rgba(255,255,255,0.08)",
                color: "#f9fafb",
                padding: "0 12px",
                fontSize: "16px",
                fontWeight: 600,
                outline: "none",
              }}
            />
            <button
              type="button"
              onClick={() => void handleSendEta()}
              disabled={etaSending || !etaInput}
              style={{
                minHeight: "44px",
                borderRadius: "10px",
                border: "none",
                background: etaSending ? "rgba(251,146,60,0.4)" : "#f97316",
                color: "#111827",
                padding: "0 16px",
                fontSize: "15px",
                fontWeight: 800,
                cursor: etaSending || !etaInput ? "not-allowed" : "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {etaSending ? "Sending…" : "Send ETA"}
            </button>
          </div>
          {etaSent ? (
            <div style={{ fontSize: "14px", color: "#86efac", fontWeight: 600 }}>
              SMS sent to customer
            </div>
          ) : null}
          {etaError ? (
            <div style={{ fontSize: "14px", color: "#fca5a5" }}>{etaError}</div>
          ) : null}
        </div>
      ) : null}

      {printMessage ? (
        <div
          style={{
            borderRadius: "12px",
            padding: "12px 14px",
            fontSize: "14px",
            fontWeight: 700,
            background:
              printMessageTone === "error"
                ? "rgba(127,29,29,0.55)"
                : printMessageTone === "success"
                  ? "rgba(21,128,61,0.28)"
                  : "rgba(255,255,255,0.08)",
            color:
              printMessageTone === "error"
                ? "#fecaca"
                : printMessageTone === "success"
                  ? "#bbf7d0"
                  : "#e5e7eb",
            border:
              printMessageTone === "error"
                ? "1px solid rgba(248,113,113,0.25)"
                : printMessageTone === "success"
                  ? "1px solid rgba(74,222,128,0.2)"
                  : "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {printMessage}
        </div>
      ) : null}

      <div style={{ display: "grid", gap: "10px" }}>
        {action ? (
          <button
            type="button"
            onClick={() => onAdvance(order)}
            disabled={updating || printing}
            style={{
              minHeight: "56px",
              border: "none",
              borderRadius: "16px",
              background:
                order.status === "READY"
                  ? "#22c55e"
                  : order.status === "PREPARING"
                    ? "#f59e0b"
                    : order.status === "CONFIRMED"
                      ? "#60a5fa"
                      : "#f9fafb",
              color:
                order.status === "READY" || order.status === "PREPARING"
                  ? "#111827"
                  : order.status === "CONFIRMED"
                    ? "#0f172a"
                    : "#111827",
              fontSize: order.status === "PENDING" ? "18px" : "20px",
              fontWeight: 800,
              cursor: updating || printing ? "wait" : "pointer",
            }}
          >
            {updating ? "Updating…" : action.label}
          </button>
        ) : null}

        <button
          type="button"
          onClick={() => onPrint(order)}
          disabled={printing || updating}
          style={{
            minHeight: "48px",
            borderRadius: "14px",
            border: "1px solid rgba(255,255,255,0.16)",
            background: "rgba(255,255,255,0.06)",
            color: "#f9fafb",
            fontSize: "16px",
            fontWeight: 700,
            cursor: printing || updating ? "wait" : "pointer",
          }}
        >
          {printing ? "Printing…" : "Print"}
        </button>
      </div>
    </section>
  )
}

const KitchenDashboard: React.FC<{
  getToken: ClerkTokenGetter
  onSignOut: () => Promise<void>
  tenantSlug: string
}> = ({
  getToken,
  onSignOut,
  tenantSlug,
}) => {
  const [orders, setOrders] = useState<KitchenOrder[]>([])
  const [completedOrders, setCompletedOrders] = useState<CompletedOrderRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null)
  const [printingOrderId, setPrintingOrderId] = useState<string | null>(null)
  const [printFeedbackByOrderId, setPrintFeedbackByOrderId] = useState<
    Record<string, { text: string; tone: "info" | "success" | "error" }>
  >({})
  const [soundEnabled, setSoundEnabled] = useState(readSoundPreference)
  const [activeTab, setActiveTab] = useState<KitchenTab>("active")
  const audioContextRef = useRef<AudioContext | null>(null)
  const seenOrderIdsRef = useRef<Set<string>>(new Set())
  const hasLoadedOnceRef = useRef(false)

  async function loadOrders() {
    try {
      const nextOrders = await fetchKitchenOrders(tenantSlug)
      const currentLiveIds = new Set(
        nextOrders
          .filter((order) => isWithinWindow(order.createdAt, EIGHT_HOURS_MS))
          .map((order) => order.id),
      )

      if (hasLoadedOnceRef.current && soundEnabled) {
        const hasNewOrders = Array.from(currentLiveIds).some(
          (orderId) => !seenOrderIdsRef.current.has(orderId),
        )

        if (hasNewOrders) {
          playAlertTone(audioContextRef)
        }
      }

      seenOrderIdsRef.current = currentLiveIds
      hasLoadedOnceRef.current = true

      const cachedCompletedOrders = readCompletedOrders(tenantSlug)
      const nextCompletedOrders = mergeCompletedOrders(
        tenantSlug,
        nextOrders.filter(
          (order) =>
            order.status === "READY" &&
            isWithinWindow(order.createdAt, FOUR_HOURS_MS),
        ),
        cachedCompletedOrders,
      )

      setOrders(nextOrders)
      setCompletedOrders(nextCompletedOrders)
      setError(null)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load kitchen orders")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadOrders()
    const intervalId = window.setInterval(() => {
      void loadOrders()
    }, POLL_INTERVAL_MS)

    return () => window.clearInterval(intervalId)
  }, [tenantSlug, soundEnabled])

  useEffect(() => {
    writeSoundPreference(soundEnabled)
  }, [soundEnabled])

  async function handleSendDeliveryEta(orderId: string, etaMinutes: number) {
    await sendKitchenDeliveryEta(getToken, tenantSlug, orderId, etaMinutes)
  }

  async function handleAdvance(order: KitchenOrder) {
    if (!tenantSlug) {
      return
    }

    const action = statusAction[order.status]
    if (!action) return

    setUpdatingOrderId(order.id)
    try {
      await transitionKitchenOrder(getToken, tenantSlug, order.id, action.nextStatus)

      if (order.status === "PENDING") {
        setActiveTab("active")
        setPrintingOrderId(order.id)
        setPrintFeedbackByOrderId((current) => ({
          ...current,
          [order.id]: { text: "Printing…", tone: "info" },
        }))
        await printKitchenOrder(getToken, tenantSlug, order.id)
        setPrintFeedbackByOrderId((current) => ({
          ...current,
          [order.id]: { text: "Receipt queued for printer", tone: "success" },
        }))
      }

      if (action.nextStatus === "COMPLETED") {
        const nextCompleted = mergeCompletedOrders(tenantSlug, [], [
          ...readCompletedOrders(tenantSlug),
          {
            completedAt: new Date().toISOString(),
            order: {
              ...order,
              status: "COMPLETED",
            },
          },
        ])
        setCompletedOrders(nextCompleted)
      }

      await loadOrders()
    } catch (updateError) {
      if (order.status === "PENDING") {
        setPrintFeedbackByOrderId((current) => ({
          ...current,
          [order.id]: {
            text:
              updateError instanceof Error
                ? updateError.message
                : "Failed to confirm and print order",
            tone: "error",
          },
        }))
      }
      setError(updateError instanceof Error ? updateError.message : "Failed to update order")
    } finally {
      setUpdatingOrderId(null)
      if (order.status === "PENDING") {
        setPrintingOrderId(null)
      }
    }
  }

  async function handlePrint(order: KitchenOrder) {
    if (!tenantSlug) {
      return
    }

    setPrintingOrderId(order.id)
    setPrintFeedbackByOrderId((current) => ({
      ...current,
      [order.id]: { text: "Printing…", tone: "info" },
    }))

    try {
      await printKitchenOrder(getToken, tenantSlug, order.id)
      setPrintFeedbackByOrderId((current) => ({
        ...current,
        [order.id]: { text: "Receipt queued for printer", tone: "success" },
      }))
    } catch (printError) {
      setPrintFeedbackByOrderId((current) => ({
        ...current,
        [order.id]: {
          text: printError instanceof Error ? printError.message : "Failed to queue print job",
          tone: "error",
        },
      }))
      setError(printError instanceof Error ? printError.message : "Failed to queue print job")
    } finally {
      setPrintingOrderId(null)
    }
  }

  useEffect(() => {
    const orderIds = Object.keys(printFeedbackByOrderId)
    if (orderIds.length === 0) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setPrintFeedbackByOrderId((current) => {
        const next = { ...current }
        for (const orderId of orderIds) {
          delete next[orderId]
        }
        return next
      })
    }, 3000)

    return () => window.clearTimeout(timeoutId)
  }, [printFeedbackByOrderId])

  const pendingOrders = useMemo(
    () =>
      orders.filter(
        (order) =>
          order.status === "PENDING" &&
          isWithinWindow(order.createdAt, EIGHT_HOURS_MS),
      ),
    [orders],
  )

  const activeOrders = useMemo(
    () =>
      orders.filter(
        (order) =>
          (order.status === "CONFIRMED" || order.status === "PREPARING") &&
          isWithinWindow(order.createdAt, EIGHT_HOURS_MS),
      ),
    [orders],
  )

  const visibleCompletedOrders = useMemo(
    () =>
      completedOrders.filter((entry) => isWithinWindow(entry.completedAt, FOUR_HOURS_MS)),
    [completedOrders],
  )

  const visibleOrders = useMemo(() => {
    switch (activeTab) {
      case "pending":
        return pendingOrders
      case "active":
        return activeOrders
      case "completed":
        return visibleCompletedOrders.map((entry) => entry.order)
    }
  }, [activeTab, activeOrders, pendingOrders, visibleCompletedOrders])

  return (
    <main
      style={{
        minHeight: "100vh",
        margin: 0,
        background: "#111827",
        color: "#ffffff",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      <div
        style={{
          margin: "0 auto",
          maxWidth: "1440px",
          padding: "24px",
          display: "grid",
          gap: "24px",
        }}
      >
        <header
          style={{
            display: "grid",
            gap: "16px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "start",
              gap: "16px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "14px",
                  color: "#9ca3af",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                Kitchen dashboard
              </div>
              <h1 style={{ margin: "8px 0 0", fontSize: "40px", lineHeight: 1.1 }}>
                Live pickup orders
              </h1>
            </div>

            <div
              style={{
                display: "grid",
                gap: "10px",
                justifyItems: "end",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gap: "6px",
                  justifyItems: "end",
                  fontSize: "15px",
                  color: "#d1d5db",
                }}
              >
                <div>Tenant: {tenantSlug}</div>
                <div>
                  {pendingOrders.length} pending • {activeOrders.length} active • {visibleCompletedOrders.length} completed
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSoundEnabled((current) => !current)}
                style={{
                  minHeight: "44px",
                  borderRadius: "999px",
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: soundEnabled ? "#f9fafb" : "rgba(255,255,255,0.05)",
                  color: soundEnabled ? "#111827" : "#f9fafb",
                  padding: "0 16px",
                  fontSize: "14px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Sound {soundEnabled ? "on" : "off"}
              </button>

              <button
                type="button"
                onClick={() => {
                  void onSignOut()
                }}
                style={{
                  minHeight: "44px",
                  borderRadius: "999px",
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.05)",
                  color: "#f9fafb",
                  padding: "0 16px",
                  fontSize: "14px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Sign out
              </button>
            </div>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
            <TabButton
              active={activeTab === "pending"}
              count={pendingOrders.length}
              label="Pending"
              onClick={() => setActiveTab("pending")}
            />
            <TabButton
              active={activeTab === "active"}
              count={activeOrders.length}
              label="Active"
              onClick={() => setActiveTab("active")}
            />
            <TabButton
              active={activeTab === "completed"}
              count={visibleCompletedOrders.length}
              label="Completed"
              onClick={() => setActiveTab("completed")}
            />
          </div>
        </header>

        {error ? (
          <section
            style={{
              border: "1px solid rgba(248,113,113,0.35)",
              background: "rgba(127,29,29,0.45)",
              color: "#fecaca",
              borderRadius: "16px",
              padding: "16px 20px",
              fontSize: "16px",
            }}
          >
            {error}
          </section>
        ) : null}

        {loading && orders.length === 0 ? (
          <section
            style={{
              borderRadius: "20px",
              background: "#1f2937",
              padding: "28px",
              fontSize: "20px",
              color: "#d1d5db",
            }}
          >
            Loading kitchen orders…
          </section>
        ) : null}

        {!loading && visibleOrders.length === 0 ? (
          <EmptyState
            eyebrow={
              activeTab === "pending"
                ? "No pending orders"
                : activeTab === "active"
                  ? "No active orders"
                  : "No recent completed orders"
            }
            title={
              activeTab === "pending"
                ? "Orders waiting for confirmation will appear here."
                : activeTab === "active"
                  ? "Confirmed and preparing orders will appear here."
                  : "Ready and picked-up orders from the last 4 hours will appear here."
            }
          />
        ) : null}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "20px",
            alignItems: "start",
          }}
        >
          {visibleOrders.map((order) => (
            <OrderCard
              key={`${activeTab}-${order.id}`}
              order={order}
              updating={updatingOrderId === order.id}
              printing={printingOrderId === order.id}
              onAdvance={handleAdvance}
              onPrint={handlePrint}
              onSendEta={
                order.fulfillmentType === "DELIVERY"
                  ? (etaMinutes) => handleSendDeliveryEta(order.id, etaMinutes)
                  : undefined
              }
              printMessage={printFeedbackByOrderId[order.id]?.text ?? null}
              printMessageTone={printFeedbackByOrderId[order.id]?.tone}
            />
          ))}
        </div>
      </div>
    </main>
  )
}

const ClerkProviderWithEnv = ClerkProvider as unknown as React.ComponentType<
  React.PropsWithChildren<{
    afterSignOutUrl?: string
    publishableKey: string
  }>
>

function SignedInKitchenApp({ subdomainTenant }: { subdomainTenant: string | null }) {
  const { signOut } = useClerk()
  const { getToken } = useAuth()
  const { user } = useUser()
  const tenantSlug =
    subdomainTenant ?? tenantSlugFromMetadata(user?.publicMetadata?.tenantSlug)

  if (!tenantSlug) {
    return (
      <main
        style={{
          minHeight: "100vh",
          margin: 0,
          background: "#111827",
          color: "#ffffff",
          fontFamily: "Inter, system-ui, sans-serif",
          display: "grid",
          placeItems: "center",
          padding: "24px",
        }}
      >
        <section
          style={{
            maxWidth: "640px",
            borderRadius: "24px",
            background: "#1f2937",
            border: "1px solid rgba(255,255,255,0.08)",
            padding: "32px",
            display: "grid",
            gap: "12px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: "14px",
              color: "#9ca3af",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Kitchen dashboard
          </div>
          <h1 style={{ margin: 0, fontSize: "34px", lineHeight: 1.05 }}>
            Account not linked
          </h1>
          <p style={{ margin: 0, color: "#d1d5db", fontSize: "18px", lineHeight: 1.6 }}>
            Your account is not linked to a restaurant. Please contact support.
          </p>
          <div>
            <button
              type="button"
              onClick={() => {
                void signOut()
              }}
              style={{
                minHeight: "44px",
                borderRadius: "999px",
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.05)",
                color: "#f9fafb",
                padding: "0 16px",
                fontSize: "14px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Sign out
            </button>
          </div>
        </section>
      </main>
    )
  }

  return (
    <KitchenDashboard
      getToken={getToken}
      tenantSlug={tenantSlug}
      onSignOut={() => signOut()}
    />
  )
}

function Root() {
  const subdomainTenant = getTenantSlugFromSubdomain()

  if (!CLERK_PUBLISHABLE_KEY) {
    return (
      <main
        style={{
          minHeight: "100vh",
          margin: 0,
          background: "#111827",
          color: "#ffffff",
          fontFamily: "Inter, system-ui, sans-serif",
          display: "grid",
          placeItems: "center",
          padding: "24px",
        }}
      >
        <section
          style={{
            maxWidth: "640px",
            borderRadius: "24px",
            background: "#1f2937",
            border: "1px solid rgba(255,255,255,0.08)",
            padding: "32px",
            display: "grid",
            gap: "12px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: "14px",
              color: "#9ca3af",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Kitchen dashboard
          </div>
          <h1 style={{ margin: 0, fontSize: "34px", lineHeight: 1.05 }}>
            Clerk is not configured
          </h1>
          <p style={{ margin: 0, color: "#d1d5db", fontSize: "18px", lineHeight: 1.6 }}>
            Add <code>VITE_CLERK_PUBLISHABLE_KEY</code> to the kiosk environment.
          </p>
        </section>
      </main>
    )
  }

  return (
    <ClerkProviderWithEnv publishableKey={CLERK_PUBLISHABLE_KEY} afterSignOutUrl="/">
      <SignedOut>
        <main
          style={{
            minHeight: "100vh",
            margin: 0,
            background: "#111827",
            color: "#ffffff",
            fontFamily: "Inter, system-ui, sans-serif",
            display: "grid",
            placeItems: "center",
            padding: "24px",
          }}
        >
          <SignIn />
        </main>
      </SignedOut>
      <SignedIn>
        <SignedInKitchenApp subdomainTenant={subdomainTenant} />
      </SignedIn>
    </ClerkProviderWithEnv>
  )
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
)
