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
