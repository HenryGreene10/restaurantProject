import express from 'express'
import type { Express, Request, Response } from 'express'
import {
  createPlatformDataAccess,
  createTenantDataAccess,
  createTenantScope,
} from '@repo/data-access'
import { retrieveDirectChargePaymentIntent, verifyStripeWebhookEvent } from '@repo/payments'
import { env } from '../config/env.js'
import { logger } from '../lib/logger.js'

async function awardLoyaltyPoints(
  tenantDataAccess: ReturnType<typeof createTenantDataAccess>,
  order: { id: string; customerId: string | null; totalCents: number }
) {
  if (!order.customerId) return
  try {
    const cfg = await tenantDataAccess.loyalty.getConfig()
    if (!cfg.active) return

    const account = await tenantDataAccess.loyalty.getOrCreateAccount(order.customerId)
    const isFirstOrder = account.isNew

    // Award earned points (based on amount paid)
    const amountPaidDollars = order.totalCents / 100
    const earned = Math.floor(amountPaidDollars * cfg.earnRate)
    if (earned > 0) {
      await tenantDataAccess.loyalty.awardPoints(
        account.id,
        earned,
        'EARN',
        order.id,
        `Earned on order`
      )
    }

    // Award welcome bonus on first order
    if (isFirstOrder && cfg.welcomeBonus > 0) {
      await tenantDataAccess.loyalty.awardPoints(
        account.id,
        cfg.welcomeBonus,
        'WELCOME_BONUS',
        order.id,
        'Welcome bonus'
      )
    }

    // Mark account as no longer new after first order
    if (isFirstOrder) {
      await tenantDataAccess.loyalty.markAccountNotNew(account.id)
    }
  } catch (error) {
    // Loyalty is non-critical — don't fail the webhook
    logger.error('Failed to award loyalty points after payment success', {
      error: String(error),
      orderId: order.id,
      customerId: order.customerId,
    })
  }
}

export function registerStripeWebhookRoute(app: Express) {
  app.post(
    '/webhooks/stripe',
    express.raw({ type: 'application/json' }),
    async (req: Request, res: Response) => {
      const runtime = env()
      if (!runtime.STRIPE_SECRET_KEY || !runtime.STRIPE_WEBHOOK_SECRET) {
        return res.status(500).json({ error: 'Stripe webhook is not configured' })
      }

      const signature = req.header('stripe-signature')
      if (!signature) {
        return res.status(400).json({ error: 'Missing Stripe signature' })
      }

      try {
        const event = await verifyStripeWebhookEvent({
          config: {
            secretKey: runtime.STRIPE_SECRET_KEY,
            webhookSecret: runtime.STRIPE_WEBHOOK_SECRET,
          },
          body: req.body as Buffer,
          signature,
        })

        if (event.type === 'account.updated') {
          const account = event.data.object
          const platformDataAccess = createPlatformDataAccess()
          const tenant = await platformDataAccess.findTenantByStripeAccountId(account.id)

          if (tenant) {
            await platformDataAccess.updateTenantStripeCapabilities(account.id, {
              chargesEnabled: Boolean(account.charges_enabled),
              payoutsEnabled: Boolean(account.payouts_enabled),
            })
          }
        }

        if (event.type === 'payment_intent.succeeded') {
          const stripeAccountId = event.account
          if (!stripeAccountId) {
            return res.status(400).json({ error: 'Missing connected Stripe account' })
          }

          const platformDataAccess = createPlatformDataAccess()
          const tenant = await platformDataAccess.findTenantByStripeAccountId(stripeAccountId)

          if (!tenant) {
            return res.status(200).json({ received: true })
          }

          const paymentIntent = event.data.object
          const tenantDataAccess = createTenantDataAccess(createTenantScope(tenant.id))

          const checkoutSession = await tenantDataAccess.checkouts.findByPaymentIntentId(
            paymentIntent.id
          )

          if (!checkoutSession) {
            return res.status(200).json({ received: true })
          }

          // Idempotency guard: Stripe may re-deliver on timeout/error; skip if
          // the order was already created from this checkout session.
          if (checkoutSession.status === 'ORDER_CREATED') {
            return res.status(200).json({ received: true })
          }

          const freshPaymentIntent = await retrieveDirectChargePaymentIntent({
            config: {
              secretKey: runtime.STRIPE_SECRET_KEY,
              stripeAccountId,
            },
            paymentIntentId: paymentIntent.id,
          })

          if (freshPaymentIntent.amount !== checkoutSession.totalCents) {
            return res.status(400).json({ error: 'Payment amount does not match checkout session' })
          }

          if (checkoutSession.stripeAccountId !== stripeAccountId) {
            return res.status(400).json({ error: 'Stripe account does not match checkout session' })
          }

          await tenantDataAccess.checkouts.markPaymentSucceededByIntent(paymentIntent.id)
          const orderResult = await tenantDataAccess.checkouts.createOrderFromCheckoutSession(
            checkoutSession.id
          )

          if (orderResult.kind === 'created') {
            await awardLoyaltyPoints(tenantDataAccess, orderResult.order)
          }
        }

        if (event.type === 'payment_intent.payment_failed') {
          const stripeAccountId = event.account
          if (!stripeAccountId) {
            return res.status(400).json({ error: 'Missing connected Stripe account' })
          }

          const platformDataAccess = createPlatformDataAccess()
          const tenant = await platformDataAccess.findTenantByStripeAccountId(stripeAccountId)

          if (!tenant) {
            return res.status(200).json({ received: true })
          }

          const paymentIntent = event.data.object
          const tenantDataAccess = createTenantDataAccess(createTenantScope(tenant.id))
          await tenantDataAccess.checkouts.markPaymentFailedByIntent(paymentIntent.id)
        }

        if (event.type === 'charge.refunded') {
          const stripeAccountId = event.account
          if (!stripeAccountId) {
            return res.status(400).json({ error: 'Missing connected Stripe account' })
          }

          const charge = event.data.object
          const paymentIntentId =
            typeof charge.payment_intent === 'string' ? charge.payment_intent : null

          if (paymentIntentId) {
            const platformDataAccess = createPlatformDataAccess()
            const tenant = await platformDataAccess.findTenantByStripeAccountId(stripeAccountId)

            if (tenant) {
              const tenantDataAccess = createTenantDataAccess(createTenantScope(tenant.id))
              await tenantDataAccess.checkouts.markOrderRefundedByPaymentIntentId(paymentIntentId)
            }
          }
        }

        if (event.type === 'checkout.session.completed') {
          const session = event.data.object as {
            metadata?: Record<string, string> | null
            client_reference_id?: string | null
          }
          const restaurantId = session.metadata?.restaurantId ?? session.client_reference_id ?? null

          if (session.metadata?.type === 'restaurant_setup' && restaurantId) {
            const platformDataAccess = createPlatformDataAccess()
            await platformDataAccess.activateRestaurantSubscription(restaurantId)
          }
        }

        return res.status(200).json({ received: true })
      } catch (error) {
        logger.error('Stripe webhook handling failed', { error: String(error) })
        return res.status(400).json({ error: 'Invalid Stripe webhook' })
      }
    }
  )
}
