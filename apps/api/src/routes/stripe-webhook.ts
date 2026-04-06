import express from 'express'
import type { Express, Request, Response } from 'express'
import { createPlatformDataAccess } from '@repo/data-access'
import { verifyStripeWebhookEvent } from '@repo/payments'
import { env } from '../config/env.js'

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

        return res.status(200).json({ received: true })
      } catch (error) {
        console.error('Stripe webhook handling failed', error)
        return res.status(400).json({ error: 'Invalid Stripe webhook' })
      }
    },
  )
}
