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
        <div className="max-w-lg rounded-[var(--radius)] border border-border bg-card px-6 py-6 text-center shadow-sm">
          <h1 className="font-heading text-3xl">Missing tenant</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            This storefront URL is not linked to a restaurant. Use a restaurant subdomain or, in
            local development, add <code>?tenant=joes-pizza</code> to the URL.
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
