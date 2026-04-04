import React, { useEffect, useMemo, useState } from "react"
import { createRoot } from "react-dom/client"

type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PREPARING"
  | "READY"
  | "COMPLETED"
  | "CANCELLED"

type KitchenOrder = {
  id: string
  orderNumber: number
  customerNameSnapshot: string | null
  createdAt: string
  status: OrderStatus
  items: Array<{
    id: string
    name: string
    quantity: number
    variantName: string | null
  }>
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api"
const DEFAULT_TENANT = "joes-pizza"
const POLL_INTERVAL_MS = 10_000

const statusAction: Record<
  OrderStatus,
  | {
      label: string
      nextStatus: OrderStatus
    }
  | null
> = {
  PENDING: { label: "Confirm order", nextStatus: "CONFIRMED" },
  CONFIRMED: { label: "Start preparing", nextStatus: "PREPARING" },
  PREPARING: { label: "Mark ready", nextStatus: "READY" },
  READY: { label: "Picked up", nextStatus: "COMPLETED" },
  COMPLETED: null,
  CANCELLED: null,
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value))
}

function resolveTenantSlug() {
  const params = new URLSearchParams(window.location.search)
  return params.get("tenant")?.trim() || DEFAULT_TENANT
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
    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  })
}

async function transitionKitchenOrder(
  tenantSlug: string,
  orderId: string,
  nextStatus: OrderStatus,
) {
  const response = await fetch(`${API_BASE_URL}/admin/orders/${orderId}/status`, {
    method: "PATCH",
    headers: {
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

const App: React.FC = () => {
  const [tenantSlug] = useState(resolveTenantSlug)
  const [orders, setOrders] = useState<KitchenOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null)

  async function loadOrders() {
    try {
      const nextOrders = await fetchKitchenOrders(tenantSlug)
      setOrders(nextOrders)
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
  }, [tenantSlug])

  async function handleAdvance(order: KitchenOrder) {
    const action = statusAction[order.status]
    if (!action) return

    setUpdatingOrderId(order.id)
    try {
      await transitionKitchenOrder(tenantSlug, order.id, action.nextStatus)
      await loadOrders()
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Failed to update order")
    } finally {
      setUpdatingOrderId(null)
    }
  }

  const activeOrders = useMemo(
    () => orders.filter((order) => order.status !== "COMPLETED" && order.status !== "CANCELLED"),
    [orders],
  )

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
          maxWidth: "1400px",
          padding: "24px",
          display: "grid",
          gap: "24px",
        }}
      >
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "16px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={{ fontSize: "14px", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Kitchen dashboard
            </div>
            <h1 style={{ margin: "8px 0 0", fontSize: "40px", lineHeight: 1.1 }}>
              Live pickup orders
            </h1>
          </div>
          <div
            style={{
              display: "grid",
              gap: "6px",
              justifyItems: "end",
              fontSize: "16px",
              color: "#d1d5db",
            }}
          >
            <div>Tenant: {tenantSlug}</div>
            <div>{activeOrders.length} active orders</div>
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

        {!loading && activeOrders.length === 0 ? (
          <section
            style={{
              borderRadius: "20px",
              background: "#1f2937",
              padding: "36px 28px",
              textAlign: "center",
              color: "#d1d5db",
            }}
          >
            <div style={{ fontSize: "18px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#9ca3af" }}>
              No active orders
            </div>
            <div style={{ marginTop: "12px", fontSize: "28px", color: "#ffffff" }}>
              New pickup orders will appear here automatically.
            </div>
          </section>
        ) : null}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "20px",
            alignItems: "start",
          }}
        >
          {activeOrders.map((order) => {
            const action = statusAction[order.status]
            const isUpdating = updatingOrderId === order.id

            return (
              <section
                key={order.id}
                style={{
                  display: "grid",
                  gap: "20px",
                  borderRadius: "20px",
                  background: "#1f2937",
                  padding: "24px",
                  boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", alignItems: "start" }}>
                  <div style={{ display: "grid", gap: "8px" }}>
                    <div style={{ fontSize: "14px", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      Order #{order.orderNumber}
                    </div>
                    <div style={{ fontSize: "30px", fontWeight: 700, lineHeight: 1.1 }}>
                      {order.customerNameSnapshot || "Guest"}
                    </div>
                    <div style={{ fontSize: "18px", color: "#d1d5db" }}>
                      {formatTime(order.createdAt)}
                    </div>
                  </div>

                  <div
                    style={{
                      borderRadius: "999px",
                      padding: "8px 14px",
                      background: "rgba(255,255,255,0.08)",
                      color: "#f9fafb",
                      fontSize: "14px",
                      fontWeight: 600,
                      textTransform: "capitalize",
                    }}
                  >
                    {order.status.toLowerCase()}
                  </div>
                </div>

                <div style={{ display: "grid", gap: "12px" }}>
                  {order.items.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "16px",
                        borderRadius: "14px",
                        background: "rgba(255,255,255,0.05)",
                        padding: "14px 16px",
                        fontSize: "18px",
                      }}
                    >
                      <div style={{ color: "#ffffff", fontWeight: 600 }}>
                        {item.quantity} × {item.name}
                      </div>
                      <div style={{ color: "#d1d5db" }}>{item.variantName ?? "Standard"}</div>
                    </div>
                  ))}
                </div>

                {action ? (
                  <button
                    type="button"
                    onClick={() => void handleAdvance(order)}
                    disabled={isUpdating}
                    style={{
                      minHeight: "56px",
                      border: "none",
                      borderRadius: "16px",
                      background: isUpdating ? "#9ca3af" : "#f59e0b",
                      color: "#111827",
                      fontSize: "20px",
                      fontWeight: 700,
                      cursor: isUpdating ? "wait" : "pointer",
                    }}
                  >
                    {isUpdating ? "Updating…" : action.label}
                  </button>
                ) : null}
              </section>
            )
          })}
        </div>
      </div>
    </main>
  )
}

createRoot(document.getElementById("root")!).render(<App />)
