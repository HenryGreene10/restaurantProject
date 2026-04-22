import { useEffect, useState } from "react"

import { LandingPage } from "../landing/LandingPage"
import { OrderStatusPage } from "../storefront/OrderStatusPage"
import { RewardsWalletPage } from "../storefront/RewardsWalletPage"
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

function parseRewardsPath(pathname: string) {
  return pathname === "/rewards"
}

export function App() {
  const { tenantSlug } = useThemePlaygroundStore()
  const customerSession = useCustomerSession(tenantSlug)
  const [pathname, setPathname] = useState(currentPath)
  const orderId = parseOrderPath(pathname)
  const isRewards = parseRewardsPath(pathname)

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
    return <LandingPage />
  }

  if (orderId) {
    return (
      <OrderStatusPage
        orderId={orderId}
        tenantSlug={tenantSlug}
        customerSession={customerSession}
        onBackToMenu={() => navigate("/")}
        onViewRewardsWallet={() => navigate("/rewards")}
      />
    )
  }

  if (isRewards) {
    return (
      <RewardsWalletPage
        tenantSlug={tenantSlug}
        customerSession={customerSession}
        onBackToMenu={() => navigate("/")}
      />
    )
  }

  return (
    <StorefrontPage
      customerSession={customerSession}
      onViewOrder={(nextOrderId) => navigate(`/orders/${nextOrderId}`)}
      onViewRewardsWallet={() => navigate("/rewards")}
    />
  )
}
