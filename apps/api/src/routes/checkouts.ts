import type { Router } from 'express'
import { createTenantDataAccess, createTenantScope } from '@repo/data-access'
import { createDirectChargePaymentIntent } from '@repo/payments'
import type { TenantRequest } from '../middleware/tenant.js'
import { checkoutRateLimit } from '../middleware/rate-limit.js'
import { normalizeCustomerPhone, readBearerToken, verifyCustomer } from '../lib/customer-order.js'
import { env } from '../config/env.js'

async function resolveNewMemberDiscount(
  tenantDataAccess: ReturnType<typeof createTenantDataAccess>,
  phone: string,
  subtotalCents: number
): Promise<number> {
  try {
    const [isNew, cfg] = await Promise.all([
      tenantDataAccess.loyalty.isNewMemberByPhone(phone),
      tenantDataAccess.loyalty.getConfig(),
    ])
    if (!cfg.active || !isNew || !cfg.newMemberDiscountEnabled) return 0
    if (cfg.newMemberDiscountType === 'PERCENTAGE') {
      return Math.round((subtotalCents * cfg.newMemberDiscountValue) / 100)
    }
    return cfg.newMemberDiscountValue * 100 // fixed amount stored as dollars
  } catch {
    return 0
  }
}

function checkoutDataAccessFor(req: TenantRequest) {
  if (!req.tenant) {
    throw new Error('No tenant in request')
  }

  return createTenantDataAccess(createTenantScope(req.tenant.id))
}

function routeParam(req: TenantRequest, key: string) {
  const value = req.params[key]
  return Array.isArray(value) ? value[0] : value
}

export function registerCheckoutRoutes(r: Router) {
  r.post(
    '/v1/checkouts/create-payment-intent',
    checkoutRateLimit,
    async (req: TenantRequest, res) => {
      try {
        if (!req.tenant) {
          return res.status(500).json({ error: 'No tenant in request' })
        }

        const {
          items,
          type,
          pickupTime,
          deliveryAddress,
          tipCents,
          notes,
          customerId,
          customerName,
          customerPhone,
        } = req.body ?? {}

        if (!Array.isArray(items) || items.length === 0) {
          return res.status(400).json({ error: 'No items' })
        }

        const customerAuth = readBearerToken(req) ? verifyCustomer(req) : null
        const normalizedCustomerPhone =
          customerAuth?.phone ??
          (typeof customerPhone === 'string' ? normalizeCustomerPhone(customerPhone) : null)

        if (!normalizedCustomerPhone) {
          return res.status(400).json({ error: 'Invalid customer phone number' })
        }

        const tenantDataAccess = checkoutDataAccessFor(req)
        const stripeConnection = await tenantDataAccess.payments.getStripeConnection()
        if (
          type === 'DELIVERY' &&
          tipCents !== undefined &&
          (!Number.isInteger(tipCents) || tipCents < 0)
        ) {
          return res.status(400).json({ error: 'Tip must be a non-negative whole number of cents' })
        }

        const normalizedTipCents = type === 'DELIVERY' ? tipCents ?? 0 : 0

        if (
          !stripeConnection.stripeAccountId ||
          !stripeConnection.stripeChargesEnabled ||
          !stripeConnection.stripePayoutsEnabled
        ) {
          return res.status(409).json({
            error: 'Stripe payments are not active for this restaurant',
          })
        }

        // Compute subtotal to apply new-member % discount before session creation
        const tempSubtotal = items.reduce(
          (sum: number, item: { unitPriceCents?: number; quantity?: number }) => {
            return sum + (item.unitPriceCents ?? 0) * (item.quantity ?? 1)
          },
          0
        )
        const discountCents = await resolveNewMemberDiscount(
          tenantDataAccess,
          normalizedCustomerPhone,
          tempSubtotal
        )

        const checkoutSession = await tenantDataAccess.checkouts.createCheckoutSession({
          customerId:
            customerAuth?.customerId ?? (typeof customerId === 'string' ? customerId : undefined),
          customerNameSnapshot: typeof customerName === 'string' ? customerName : null,
          customerPhoneSnapshot: normalizedCustomerPhone,
          fulfillmentType: type === 'DELIVERY' ? 'DELIVERY' : 'PICKUP',
          notes,
          pickupTime: pickupTime ? new Date(pickupTime) : null,
          deliveryAddressSnapshot: deliveryAddress ?? null,
          tipCents: normalizedTipCents,
          items,
          stripeAccountId: stripeConnection.stripeAccountId,
          discountCents,
        })

        const paymentIntent = await createDirectChargePaymentIntent({
          config: {
            secretKey: env().STRIPE_SECRET_KEY,
            stripeAccountId: stripeConnection.stripeAccountId,
          },
          amount: checkoutSession.totalCents,
          currency: 'usd',
          metadata: {
            restaurantId: req.tenant.id,
            tenantSlug: req.tenant.slug,
            checkoutSessionId: checkoutSession.id,
          },
          idempotencyKey: `checkout-session:${checkoutSession.id}`,
        })

        if (!paymentIntent.client_secret) {
          return res.status(500).json({ error: 'Stripe client secret was not returned' })
        }

        await tenantDataAccess.checkouts.attachPaymentIntent(checkoutSession.id, paymentIntent.id)

        return res.status(201).json({
          checkoutSessionId: checkoutSession.id,
          clientSecret: paymentIntent.client_secret,
          stripeAccountId: stripeConnection.stripeAccountId,
          tipCents: checkoutSession.tipCents,
          discountCents: checkoutSession?.discountCents ?? 0,
          isNewMember: discountCents > 0,
        })
      } catch (error) {
        return res.status(400).json({
          error: error instanceof Error ? error.message : 'Failed to create payment intent',
        })
      }
    }
  )

  r.get('/v1/checkouts/:checkoutSessionId', async (req: TenantRequest, res) => {
    try {
      if (!req.tenant) {
        return res.status(500).json({ error: 'No tenant in request' })
      }

      const tenantDataAccess = checkoutDataAccessFor(req)
      const checkoutSession = await tenantDataAccess.checkouts.findById(
        routeParam(req, 'checkoutSessionId')
      )

      if (!checkoutSession) {
        return res.status(404).json({ error: 'Checkout session not found' })
      }

      return res.json({
        id: checkoutSession.id,
        status: checkoutSession.status,
        orderId: checkoutSession.createdOrderId ?? null,
        paymentIntentId: checkoutSession.stripePaymentIntentId ?? null,
        error: checkoutSession.status === 'PAYMENT_FAILED' ? 'Payment failed' : null,
      })
    } catch (error) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to load checkout status',
      })
    }
  })
}
