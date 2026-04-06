const RESERVED_SUBDOMAINS = new Set(["www", "admin", "api", "app", "kiosk"])

function queryParamTenantSlug() {
  if (typeof window === "undefined") {
    return null
  }

  const queryTenant = new URLSearchParams(window.location.search).get("tenant")?.trim()
  return queryTenant ? queryTenant : null
}

function localHostname(hostname: string) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0"
  )
}

export function getTenantSlug() {
  if (typeof window === "undefined") {
    return null
  }

  const hostname = window.location.hostname.toLowerCase()
  const domainSuffix = (import.meta.env.VITE_TENANT_DOMAIN_SUFFIX ?? "").trim().toLowerCase()

  if (domainSuffix && hostname.endsWith(`.${domainSuffix}`)) {
    const subdomain = hostname.slice(0, -1 * (`.${domainSuffix}`.length)).trim()
    if (subdomain && !RESERVED_SUBDOMAINS.has(subdomain)) {
      return subdomain
    }
  }

  if (import.meta.env.DEV || localHostname(hostname)) {
    return queryParamTenantSlug()
  }

  return null
}
