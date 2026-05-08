import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import type { Express } from 'express'

const mockFindTenantBySlug = vi.fn()
const mockFindAdminAccessByClerkUserId = vi.fn()
const mockVerifyToken = vi.fn()
const mockGetStripeConnection = vi.fn()
const mockSetStripeAccountId = vi.fn()
const mockCreateStandardConnectedAccount = vi.fn()
const mockCreateOnboardingLink = vi.fn()
const mockRegisterApplePayDomains = vi.fn()
const mockDeriveStripeConnectionState = vi.fn()

vi.mock('@clerk/backend', () => ({ verifyToken: mockVerifyToken }))

vi.mock('@repo/payments', () => ({
  createStandardConnectedAccount: mockCreateStandardConnectedAccount,
  createOnboardingLink: mockCreateOnboardingLink,
  registerApplePayDomains: mockRegisterApplePayDomains,
  deriveStripeConnectionState: mockDeriveStripeConnectionState,
}))

vi.mock('@repo/data-access', () => ({
  createTenantScope: (restaurantId: string) => ({ restaurantId }),
  createPlatformDataAccess: () => ({
    findTenantBySlug: mockFindTenantBySlug,
    findAdminAccessByClerkUserId: mockFindAdminAccessByClerkUserId,
  }),
  createTenantDataAccess: () => ({
    brand: {},
    menu: {},
    customers: {},
    orders: {},
    payments: {
      getStripeConnection: mockGetStripeConnection,
      setStripeAccountId: mockSetStripeAccountId,
    },
    printing: {},
    loyalty: {},
  }),
}))

const ADMIN_ACCESS = {
  adminUserId: 'admin_1',
  clerkUserId: 'user_1',
  email: 'owner@demo.test',
  role: 'owner',
  restaurantId: 'rest_1',
  tenantSlug: 'demo',
  restaurantName: 'Demo Restaurant',
  subscriptionStatus: 'ACTIVE',
}

const STRIPE_CONNECTION = {
  restaurantId: 'rest_1',
  slug: 'demo',
  displayName: 'Demo Restaurant',
  stripeAccountId: 'acct_demo',
  stripeChargesEnabled: true,
  stripePayoutsEnabled: true,
}

describe('admin payments integration', () => {
  let createApp!: () => Express

  beforeAll(async () => {
    await import('./setup')
    ;({ createApp } = await import('../app'))
  })

  beforeEach(() => {
    vi.resetAllMocks()
    mockVerifyToken.mockResolvedValue({ sub: 'user_1' })
    mockFindTenantBySlug.mockResolvedValue({ id: 'rest_1', slug: 'demo' })
    mockFindAdminAccessByClerkUserId.mockResolvedValue(ADMIN_ACCESS)
    mockGetStripeConnection.mockResolvedValue(STRIPE_CONNECTION)
    mockDeriveStripeConnectionState.mockReturnValue({
      stripeAccountId: 'acct_demo',
      chargesEnabled: true,
      payoutsEnabled: true,
      status: 'active',
    })
  })

  describe('GET /admin/payments/stripe/status', () => {
    it('returns stripe connection status', async () => {
      const response = await request(createApp())
        .get('/admin/payments/stripe/status')
        .set('Authorization', 'Bearer clerk_token')
        .set('x-tenant-slug', 'demo')

      expect(response.status).toBe(200)
      expect(response.body.status).toBe('active')
      expect(response.body.displayName).toBe('Demo Restaurant')
    })

    it('returns 401 without auth', async () => {
      const response = await request(createApp())
        .get('/admin/payments/stripe/status')
        .set('x-tenant-slug', 'demo')
      expect(response.status).toBe(401)
    })
  })

  describe('POST /admin/payments/stripe/onboarding-link', () => {
    it('returns an onboarding URL when Stripe is configured and account exists', async () => {
      // Stripe env vars are populated in setup.ts so stripeConfigured() returns true.
      // STRIPE_CONNECTION already has a stripeAccountId so no account creation needed.
      mockRegisterApplePayDomains.mockResolvedValue(undefined)
      mockCreateOnboardingLink.mockResolvedValue({
        url: 'https://connect.stripe.com/onboarding/123',
      })

      const response = await request(createApp())
        .post('/admin/payments/stripe/onboarding-link')
        .set('Authorization', 'Bearer clerk_token')
        .set('x-tenant-slug', 'demo')

      expect(response.status).toBe(200)
      expect(response.body.url).toBe('https://connect.stripe.com/onboarding/123')
      expect(mockCreateStandardConnectedAccount).not.toHaveBeenCalled()
    })

    it('creates a new Stripe account when none exists yet', async () => {
      mockGetStripeConnection.mockResolvedValue({ ...STRIPE_CONNECTION, stripeAccountId: null })
      mockCreateStandardConnectedAccount.mockResolvedValue({ id: 'acct_new' })
      mockSetStripeAccountId.mockResolvedValue(undefined)
      mockRegisterApplePayDomains.mockResolvedValue(undefined)
      mockCreateOnboardingLink.mockResolvedValue({
        url: 'https://connect.stripe.com/onboarding/new',
      })

      const response = await request(createApp())
        .post('/admin/payments/stripe/onboarding-link')
        .set('Authorization', 'Bearer clerk_token')
        .set('x-tenant-slug', 'demo')

      expect(response.status).toBe(200)
      expect(mockCreateStandardConnectedAccount).toHaveBeenCalledTimes(1)
      expect(mockSetStripeAccountId).toHaveBeenCalledWith('acct_new')
    })

    it('returns 401 without auth', async () => {
      const response = await request(createApp())
        .post('/admin/payments/stripe/onboarding-link')
        .set('x-tenant-slug', 'demo')
      expect(response.status).toBe(401)
    })
  })
})
