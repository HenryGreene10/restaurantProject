const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api"

export type ClerkTokenGetter = () => Promise<string | null>

type AdminFetchOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE"
  tenantSlug: string
  getToken: ClerkTokenGetter
  body?: unknown
}

function serializeBody(body: unknown) {
  if (body === undefined) {
    return undefined
  }

  return JSON.stringify(body)
}

export async function adminFetch(path: string, options: AdminFetchOptions) {
  const token = await options.getToken()
  if (!token) {
    throw new Error("Unable to authenticate your admin session.")
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "x-tenant-slug": options.tenantSlug,
  }

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json"
  }

  return fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: serializeBody(options.body),
  })
}

export async function adminFetchJson<T>(path: string, options: AdminFetchOptions) {
  const response = await adminFetch(path, options)

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(payload?.error ?? `Request failed (${response.status})`)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}
