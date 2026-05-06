import { beforeEach, describe, expect, it, vi } from "vitest"
import request from "supertest"

const mockFindTenantByHost = vi.fn()
const mockFindTenantBySlug = vi.fn()
const mockFindAdminAccessByClerkUserId = vi.fn()
const mockClaimLegacyAdminAccessByEmail = vi.fn()
const mockUpdateAdminAccessEmail = vi.fn()
const mockVerifyToken = vi.fn()
const mockGetClerkPrimaryEmail = vi.fn()

vi.mock("@clerk/backend", () => ({
  verifyToken: mockVerifyToken,
}))

vi.mock("../lib/clerk.js", () => ({
  getClerkPrimaryEmail: mockGetClerkPrimaryEmail,
}))

vi.mock("@repo/data-access", () => ({
  createTenantScope: (restaurantId: string) => ({ restaurantId }),
  createPlatformDataAccess: () => ({
    findTenantByHost: mockFindTenantByHost,
    findTenantBySlug: mockFindTenantBySlug,
    findAdminAccessByClerkUserId: mockFindAdminAccessByClerkUserId,
    claimLegacyAdminAccessByEmail: mockClaimLegacyAdminAccessByEmail,
    updateAdminAccessEmail: mockUpdateAdminAccessEmail,
  }),
  createTenantDataAccess: () => ({
    brand: {},
    menu: {},
    customers: {},
    orders: {},
    payments: {},
    printing: {},
    loyalty: {},
  }),
}))

describe("admin access integration", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockVerifyToken.mockResolvedValue({ sub: "user_1" })
    mockFindTenantByHost.mockResolvedValue({
      id: "rest_1",
      slug: "demo",
    })
    mockFindTenantBySlug.mockResolvedValue({
      id: "rest_1",
      slug: "demo",
    })
    mockFindAdminAccessByClerkUserId.mockResolvedValue({
      adminUserId: "admin_1",
      clerkUserId: "user_1",
      email: "owner@demo.test",
      role: "owner",
      restaurantId: "rest_1",
      tenantSlug: "demo",
      restaurantName: "Demo Restaurant",
    })
    mockClaimLegacyAdminAccessByEmail.mockResolvedValue(null)
    mockUpdateAdminAccessEmail.mockResolvedValue({
      adminUserId: "admin_1",
      clerkUserId: "user_1",
      email: "pilot@demo.com",
      role: "owner",
      restaurantId: "rest_1",
      tenantSlug: "demo",
      restaurantName: "Demo Restaurant",
    })
    mockGetClerkPrimaryEmail.mockResolvedValue("owner@demo.test")
  })

  it("returns the current owner access record", async () => {
    await import("./setup")
    const { createApp } = await import("../app")

    const response = await request(createApp())
      .get("/admin/restaurant/access")
      .set("Authorization", "Bearer clerk_token")
      .set("x-tenant-slug", "demo")

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      ownerEmail: "owner@demo.test",
      role: "owner",
      transferPending: false,
    })
  })

  it("updates the owner email for a handoff", async () => {
    await import("./setup")
    const { createApp } = await import("../app")

    const response = await request(createApp())
      .patch("/admin/restaurant/access")
      .set("Authorization", "Bearer clerk_token")
      .set("x-tenant-slug", "demo")
      .send({ ownerEmail: "pilot@demo.com" })

    expect(response.status).toBe(200)
    expect(mockUpdateAdminAccessEmail).toHaveBeenCalledWith({
      adminUserId: "admin_1",
      restaurantId: "rest_1",
      email: "pilot@demo.com",
    })
    expect(response.body.ownerEmail).toBe("pilot@demo.com")
    expect(response.body.transferPending).toBe(true)
  })

  it("rejects handoff updates from non-owner admins", async () => {
    await import("./setup")
    const { createApp } = await import("../app")

    mockFindAdminAccessByClerkUserId.mockResolvedValueOnce({
      adminUserId: "admin_2",
      clerkUserId: "user_1",
      email: "manager@demo.test",
      role: "manager",
      restaurantId: "rest_1",
      tenantSlug: "demo",
      restaurantName: "Demo Restaurant",
    })

    const response = await request(createApp())
      .patch("/admin/restaurant/access")
      .set("Authorization", "Bearer clerk_token")
      .set("x-tenant-slug", "demo")
      .send({ ownerEmail: "pilot@demo.com" })

    expect(response.status).toBe(403)
    expect(mockUpdateAdminAccessEmail).not.toHaveBeenCalled()
  })
})
