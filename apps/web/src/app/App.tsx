import { useEffect, useState } from "react"

import { OrderStatusPage } from "../storefront/OrderStatusPage"
import { StorefrontPage } from "../storefront/StorefrontPage"
import { useCustomerSession } from "../storefront/useCustomerSession"
import { useThemePlaygroundStore } from "../theme/store"

function currentPath() {
  return window.location.pathname
}

function parseOrderPath(pathname: string) {
  const match = pathname.match(/^\/orders\/([^/]+)$/)
  return match?.[1] ?? null
}

function adminSignupUrl() {
  const hostname = window.location.hostname.toLowerCase()
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0"
  ) {
    return "http://localhost:5174/signup"
  }

  return "https://admin.easymenu.website/signup"
}

export function App() {
  const { tenantSlug } = useThemePlaygroundStore()
  const customerSession = useCustomerSession(tenantSlug)
  const [pathname, setPathname] = useState(currentPath)
  const orderId = parseOrderPath(pathname)

  useEffect(() => {
    function handlePopState() {
      setPathname(currentPath())
    }

    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [])

  function navigate(nextPath: string) {
    if (nextPath === pathname) {
      return
    }

    window.history.pushState({}, "", nextPath)
    window.scrollTo({ top: 0, behavior: "auto" })
    setPathname(nextPath)
  }

  if (!tenantSlug) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6 py-10 text-foreground">
        <div className="max-w-2xl rounded-[var(--radius)] border border-border bg-card px-8 py-8 shadow-sm">
          <div className="inline-flex rounded-full border border-border bg-background px-3 py-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
            EasyMenu
          </div>
          <h1 className="mt-5 font-heading text-4xl leading-tight sm:text-5xl">
            Direct online ordering for independent restaurants
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
            Launch a branded ordering experience, manage your menu from one admin, and route paid
            orders straight to your kitchen without marketplace commission.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href={adminSignupUrl()}
              className="inline-flex items-center justify-center rounded-[var(--radius)] bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-95"
            >
              Get started
            </a>
            <a
              href={adminSignupUrl()}
              className="inline-flex items-center justify-center rounded-[var(--radius)] border border-border px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-accent hover:text-accent-foreground"
            >
              Open admin
            </a>
          </div>
          <p className="mt-6 text-sm leading-6 text-muted-foreground">
            In local development, you can still preview a storefront with <code>?tenant=joes-pizza</code>.
          </p>
        </div>
      </main>
    )
  }

  if (orderId) {
    return (
      <OrderStatusPage
        orderId={orderId}
        tenantSlug={tenantSlug}
        onBackToMenu={() => navigate("/")}
      />
    )
  }

  return (
    <StorefrontPage
      customerSession={customerSession}
      onViewOrder={(nextOrderId) => navigate(`/orders/${nextOrderId}`)}
    />
  )
}
