import express from 'express'
import type { Express, Request, Response } from 'express'
import {
  createPlatformDataAccess,
  createTenantDataAccess,
  createTenantScope,
} from '@repo/data-access'
import { buildKitchenTicket } from '@repo/notifications'
import {
  retrieveDirectChargePaymentIntent,
  verifyStripeWebhookEvent,
} from '@repo/payments'
import { env } from '../config/env.js'

async function awardLoyaltyPoints(
  tenantDataAccess: ReturnType<typeof createTenantDataAccess>,
  order: { id: string; customerId: string | null; totalCents: number },
  checkoutSession: { customerPhoneSnapshot: string | null; discountCents: number },
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
      await tenantDataAccess.loyalty.awardPoints(account.id, earned, 'EARN', order.id, `Earned on order`)
    }

    // Award welcome bonus on first order
    if (isFirstOrder && cfg.welcomeBonus > 0) {
      await tenantDataAccess.loyalty.awardPoints(account.id, cfg.welcomeBonus, 'WELCOME_BONUS', order.id, 'Welcome bonus')
    }

    // Mark account as no longer new after first order
    if (isFirstOrder) {
      await tenantDataAccess.loyalty.markAccountNotNew(account.id)
    }
  } catch (error) {
    // Loyalty is non-critical — don't fail the webhook
    console.error('Failed to award loyalty points after payment success', {
      error,
      orderId: order.id,
      customerId: order.customerId,
      customerPhone: checkoutSession.customerPhoneSnapshot,
    })
  }
}

async function enqueuePrintJob(
  order: Parameters<typeof buildKitchenTicket>[0],
  restaurantId: string,
) {
  const platformDataAccess = createPlatformDataAccess()
  const restaurant = await platformDataAccess.getRestaurantById(restaurantId)
  if (!restaurant?.cloudPrntEnabled || !restaurant.cloudPrntMacAddress) {
    return
  }

  const ticket = buildKitchenTicket(order)
  await platformDataAccess.updateRestaurantPendingPrintJob(restaurantId, ticket)
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

          const checkoutSession =
            await tenantDataAccess.checkouts.findByPaymentIntentId(paymentIntent.id)

          if (!checkoutSession) {
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
          const orderResult =
            await tenantDataAccess.checkouts.createOrderFromCheckoutSession(checkoutSession.id)

          if (orderResult.kind === 'created') {
            await enqueuePrintJob(orderResult.order, tenant.id)
            await awardLoyaltyPoints(tenantDataAccess, orderResult.order, checkoutSession)
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

        return res.status(200).json({ received: true })
      } catch (error) {
        console.error('Stripe webhook handling failed', error)
        return res.status(400).json({ error: 'Invalid Stripe webhook' })
      }
    },
  )
}
