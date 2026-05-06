import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import type { Express } from 'express'

const mockFindTenantByHost = vi.fn()
const mockFindTenantBySlug = vi.fn()
const mockFindAdminAccessByClerkUserId = vi.fn()
const mockFindTenantByStripeAccountId = vi.fn()
const mockUpdateTenantStripeCapabilities = vi.fn()
const mockActivateRestaurantSubscription = vi.fn()

const mockGetStripeConnection = vi.fn()
const mockIsNewMemberByPhone = vi.fn()
const mockGetLoyaltyConfig = vi.fn()
const mockGetOrCreateLoyaltyAccount = vi.fn()
const mockAwardPoints = vi.fn()
const mockMarkAccountNotNew = vi.fn()

const mockComputeCartTotal = vi.fn()
const mockCreateCheckoutSession = vi.fn()
const mockAttachPaymentIntent = vi.fn()
const mockFindCheckoutById = vi.fn()
const mockFindByPaymentIntentId = vi.fn()
const mockMarkPaymentSucceededByIntent = vi.fn()
const mockCreateOrderFromCheckoutSession = vi.fn()
const mockMarkPaymentFailedByIntent = vi.fn()
const mockMarkOrderRefundedByPaymentIntentId = vi.fn()

const mockCreateDirectChargePaymentIntent = vi.fn()
const mockVerifyStripeWebhookEvent = vi.fn()
const mockRetrieveDirectChargePaymentIntent = vi.fn()

vi.mock('@clerk/backend', () => ({
  verifyToken: vi.fn().mockRejectedValue(new Error('Clerk not used in checkout tests')),
}))

vi.mock('@repo/payments', () => ({
  createDirectChargePaymentIntent: mockCreateDirectChargePaymentIntent,
  verifyStripeWebhookEvent: mockVerifyStripeWebhookEvent,
  retrieveDirectChargePaymentIntent: mockRetrieveDirectChargePaymentIntent,
}))

vi.mock('@repo/data-access', () => ({
  createTenantScope: (restaurantId: string) => ({ restaurantId }),
  createPlatformDataAccess: () => ({
    findTenantByHost: mockFindTenantByHost,
    findTenantBySlug: mockFindTenantBySlug,
    findAdminAccessByClerkUserId: mockFindAdminAccessByClerkUserId,
    findTenantByStripeAccountId: mockFindTenantByStripeAccountId,
    updateTenantStripeCapabilities: mockUpdateTenantStripeCapabilities,
    activateRestaurantSubscription: mockActivateRestaurantSubscription,
  }),
  createTenantDataAccess: () => ({
    payments: {
      getStripeConnection: mockGetStripeConnection,
    },
    loyalty: {
      isNewMemberByPhone: mockIsNewMemberByPhone,
      getConfig: mockGetLoyaltyConfig,
      getOrCreateAccount: mockGetOrCreateLoyaltyAccount,
      awardPoints: mockAwardPoints,
      markAccountNotNew: mockMarkAccountNotNew,
    },
    checkouts: {
      computeCartTotal: mockComputeCartTotal,
      createCheckoutSession: mockCreateCheckoutSession,
      attachPaymentIntent: mockAttachPaymentIntent,
      findById: mockFindCheckoutById,
      findByPaymentIntentId: mockFindByPaymentIntentId,
      markPaymentSucceededByIntent: mockMarkPaymentSucceededByIntent,
      createOrderFromCheckoutSession: mockCreateOrderFromCheckoutSession,
      markPaymentFailedByIntent: mockMarkPaymentFailedByIntent,
      markOrderRefundedByPaymentIntentId: mockMarkOrderRefundedByPaymentIntentId,
    },
    menu: {},
    orders: {},
    customers: {},
  }),
}))

const ACTIVE_STRIPE = {
  stripeAccountId: 'acct_test',
  stripeChargesEnabled: true,
  stripePayoutsEnabled: true,
}

describe('checkout integration', () => {
  let createApp!: () => Express

  beforeAll(async () => {
    await import('./setup')
    ;({ createApp } = await import('../app'))
  })

  beforeEach(() => {
    vi.resetAllMocks()
    mockFindTenantByHost.mockResolvedValue({ id: 'rest_1', slug: 'demo' })
    mockFindTenantBySlug.mockResolvedValue({ id: 'rest_1', slug: 'demo' })
    mockGetStripeConnection.mockResolvedValue(ACTIVE_STRIPE)
    mockIsNewMemberByPhone.mockResolvedValue(false)
    mockGetLoyaltyConfig.mockResolvedValue({ active: false })
    mockComputeCartTotal.mockResolvedValue({ subtotalCents: 1200 })
  })

  describe('POST /v1/checkouts/create-payment-intent', () => {
    it('creates a checkout session and returns a client secret', async () => {
      mockCreateCheckoutSession.mockResolvedValue({
        id: 'cs_1',
        totalCents: 1200,
        tipCents: 0,
        discountCents: 0,
      })
      mockCreateDirectChargePaymentIntent.mockResolvedValue({
        id: 'pi_test',
        client_secret: 'pi_test_secret_123',
      })
      mockAttachPaymentIntent.mockResolvedValue(undefined)

      const response = await request(createApp())
        .post('/v1/checkouts/create-payment-intent')
        .set('Host', 'demo.example.com')
        .send({
          items: [{ menuItemId: 'item_1', quantity: 1 }],
          customerPhone: '5555550123',
          customerName: 'Alex',
          type: 'PICKUP',
        })

      expect(response.status).toBe(201)
      expect(response.body.checkoutSessionId).toBe('cs_1')
      expect(response.body.clientSecret).toBe('pi_test_secret_123')
      expect(response.body.stripeAccountId).toBe('acct_test')
      expect(mockCreateCheckoutSession).toHaveBeenCalledTimes(1)
      expect(mockCreateDirectChargePaymentIntent).toHaveBeenCalledTimes(1)
      expect(mockAttachPaymentIntent).toHaveBeenCalledWith('cs_1', 'pi_test')
    })

    it('returns 400 when no items are provided', async () => {
      const response = await request(createApp())
        .post('/v1/checkouts/create-payment-intent')
        .set('Host', 'demo.example.com')
        .send({ items: [], customerPhone: '5555550123', type: 'PICKUP' })

      expect(response.status).toBe(400)
      expect(response.body.error).toBe('No items')
    })

    it('returns 400 when phone is missing or unparseable', async () => {
      const response = await request(createApp())
        .post('/v1/checkouts/create-payment-intent')
        .set('Host', 'demo.example.com')
        .send({
          items: [{ menuItemId: 'item_1', quantity: 1 }],
          customerPhone: 'not-a-phone',
          type: 'PICKUP',
        })

      expect(response.status).toBe(400)
      expect(response.body.error).toBe('Invalid customer phone number')
    })

    it('returns 409 when Stripe is not active for the restaurant', async () => {
      mockGetStripeConnection.mockResolvedValue({
        stripeAccountId: null,
        stripeChargesEnabled: false,
        stripePayoutsEnabled: false,
      })

      const response = await request(createApp())
        .post('/v1/checkouts/create-payment-intent')
        .set('Host', 'demo.example.com')
        .send({
          items: [{ menuItemId: 'item_1', quantity: 1 }],
          customerPhone: '5555550123',
          type: 'PICKUP',
        })

      expect(response.status).toBe(409)
      expect(response.body.error).toMatch(/Stripe payments are not active/)
    })

    it('returns 400 when the item count exceeds the cap', async () => {
      const items = Array.from({ length: 51 }, (_, i) => ({ menuItemId: `item_${i}`, quantity: 1 }))

      const response = await request(createApp())
        .post('/v1/checkouts/create-payment-intent')
        .set('Host', 'demo.example.com')
        .send({ items, customerPhone: '5555550123', type: 'PICKUP' })

      expect(response.status).toBe(400)
      expect(response.body.error).toMatch(/50 items/)
    })
  })

  describe('GET /v1/checkouts/:checkoutSessionId', () => {
    it('returns the checkout session status and linked order id', async () => {
      mockFindCheckoutById.mockResolvedValue({
        id: 'cs_1',
        status: 'PAYMENT_SUCCEEDED',
        createdOrderId: 'order_1',
        stripePaymentIntentId: 'pi_test',
      })

      const response = await request(createApp())
        .get('/v1/checkouts/cs_1')
        .set('x-tenant-slug', 'demo')

      expect(response.status).toBe(200)
      expect(response.body).toMatchObject({
        id: 'cs_1',
        status: 'PAYMENT_SUCCEEDED',
        orderId: 'order_1',
        paymentIntentId: 'pi_test',
        error: null,
      })
    })

    it('surfaces an error field when payment failed', async () => {
      mockFindCheckoutById.mockResolvedValue({
        id: 'cs_2',
        status: 'PAYMENT_FAILED',
        createdOrderId: null,
        stripePaymentIntentId: 'pi_fail',
      })

      const response = await request(createApp())
        .get('/v1/checkouts/cs_2')
        .set('x-tenant-slug', 'demo')

      expect(response.status).toBe(200)
      expect(response.body.error).toBe('Payment failed')
    })

    it('returns 404 for an unknown checkout session', async () => {
      mockFindCheckoutById.mockResolvedValue(null)

      const response = await request(createApp())
        .get('/v1/checkouts/nonexistent')
        .set('x-tenant-slug', 'demo')

      expect(response.status).toBe(404)
      expect(response.body.error).toBe('Checkout session not found')
    })
  })

  describe('POST /webhooks/stripe', () => {
    it('creates an order on payment_intent.succeeded', async () => {
      const event = {
        type: 'payment_intent.succeeded',
        account: 'acct_test',
        data: { object: { id: 'pi_test' } },
      }
      mockVerifyStripeWebhookEvent.mockResolvedValue(event)
      mockFindTenantByStripeAccountId.mockResolvedValue({ id: 'rest_1', slug: 'demo' })
      mockFindByPaymentIntentId.mockResolvedValue({
        id: 'cs_1',
        status: 'PENDING',
        totalCents: 1200,
        stripeAccountId: 'acct_test',
      })
      mockRetrieveDirectChargePaymentIntent.mockResolvedValue({ amount: 1200 })
      mockMarkPaymentSucceededByIntent.mockResolvedValue(undefined)
      mockCreateOrderFromCheckoutSession.mockResolvedValue({
        kind: 'created',
        order: { id: 'order_1', customerId: null, totalCents: 1200 },
      })

      const response = await request(createApp())
        .post('/webhooks/stripe')
        .set('stripe-signature', 'sig_test')
        .set('Content-Type', 'application/json')
        .send(Buffer.from(JSON.stringify(event)))

      expect(response.status).toBe(200)
      expect(response.body).toEqual({ received: true })
      expect(mockMarkPaymentSucceededByIntent).toHaveBeenCalledWith('pi_test')
      expect(mockCreateOrderFromCheckoutSession).toHaveBeenCalledWith('cs_1')
    })

    it('skips order creation when the checkout is already ORDER_CREATED (idempotency)', async () => {
      const event = {
        type: 'payment_intent.succeeded',
        account: 'acct_test',
        data: { object: { id: 'pi_test' } },
      }
      mockVerifyStripeWebhookEvent.mockResolvedValue(event)
      mockFindTenantByStripeAccountId.mockResolvedValue({ id: 'rest_1', slug: 'demo' })
      mockFindByPaymentIntentId.mockResolvedValue({
        id: 'cs_1',
        status: 'ORDER_CREATED',
        totalCents: 1200,
        stripeAccountId: 'acct_test',
      })

      const response = await request(createApp())
        .post('/webhooks/stripe')
        .set('stripe-signature', 'sig_test')
        .set('Content-Type', 'application/json')
        .send(Buffer.from(JSON.stringify(event)))

      expect(response.status).toBe(200)
      expect(mockCreateOrderFromCheckoutSession).not.toHaveBeenCalled()
    })

    it('marks checkout as failed on payment_intent.payment_failed', async () => {
      const event = {
        type: 'payment_intent.payment_failed',
        account: 'acct_test',
        data: { object: { id: 'pi_fail' } },
      }
      mockVerifyStripeWebhookEvent.mockResolvedValue(event)
      mockFindTenantByStripeAccountId.mockResolvedValue({ id: 'rest_1', slug: 'demo' })
      mockMarkPaymentFailedByIntent.mockResolvedValue(undefined)

      const response = await request(createApp())
        .post('/webhooks/stripe')
        .set('stripe-signature', 'sig_test')
        .set('Content-Type', 'application/json')
        .send(Buffer.from(JSON.stringify(event)))

      expect(response.status).toBe(200)
      expect(mockMarkPaymentFailedByIntent).toHaveBeenCalledWith('pi_fail')
    })

    it('marks order as refunded on charge.refunded', async () => {
      const event = {
        type: 'charge.refunded',
        account: 'acct_test',
        data: { object: { id: 'ch_test', payment_intent: 'pi_test' } },
      }
      mockVerifyStripeWebhookEvent.mockResolvedValue(event)
      mockFindTenantByStripeAccountId.mockResolvedValue({ id: 'rest_1', slug: 'demo' })
      mockMarkOrderRefundedByPaymentIntentId.mockResolvedValue(undefined)

      const response = await request(createApp())
        .post('/webhooks/stripe')
        .set('stripe-signature', 'sig_test')
        .set('Content-Type', 'application/json')
        .send(Buffer.from(JSON.stringify(event)))

      expect(response.status).toBe(200)
      expect(mockMarkOrderRefundedByPaymentIntentId).toHaveBeenCalledWith('pi_test')
    })

    it('returns 400 when the Stripe signature header is missing', async () => {
      const response = await request(createApp())
        .post('/webhooks/stripe')
        .set('Content-Type', 'application/json')
        .send(Buffer.from('{}'))

      expect(response.status).toBe(400)
      expect(response.body.error).toBe('Missing Stripe signature')
    })
  })
})
