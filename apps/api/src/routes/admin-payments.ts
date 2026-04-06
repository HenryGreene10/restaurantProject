import type { Router } from 'express'
import { createOnboardingLink, createStandardConnectedAccount, deriveStripeConnectionState } from '@repo/payments'
import { createTenantDataAccess, createTenantScope } from '@repo/data-access'
import type { TenantRequest } from '../middleware/tenant.js'
import { env } from '../config/env.js'

function tenantDataAccessFor(req: TenantRequest) {
  if (!req.tenant) {
    throw new Error('No tenant in request')
  }

  return createTenantDataAccess(createTenantScope(req.tenant.id))
}

function stripeConfigured() {
  const runtime = env()
  return Boolean(
    runtime.STRIPE_SECRET_KEY &&
      runtime.STRIPE_CONNECT_RETURN_URL &&
      runtime.STRIPE_CONNECT_REFRESH_URL,
  )
}

export function registerAdminPaymentsRoutes(r: Router) {
  r.get('/admin/payments/stripe/status', async (req: TenantRequest, res) => {
    try {
      const tenantDataAccess = tenantDataAccessFor(req)
      const connection = await tenantDataAccess.payments.getStripeConnection()
      return res.json({
        configured: stripeConfigured(),
        displayName: connection.displayName,
        ...deriveStripeConnectionState({
          stripeAccountId: connection.stripeAccountId,
          chargesEnabled: connection.stripeChargesEnabled,
          payoutsEnabled: connection.stripePayoutsEnabled,
        }),
      })
    } catch (error) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to load Stripe status',
      })
    }
  })

  r.post('/admin/payments/stripe/onboarding-link', async (req: TenantRequest, res) => {
    try {
      const runtime = env()
      if (!stripeConfigured()) {
        return res.status(500).json({ error: 'Stripe onboarding is not configured' })
      }

      const tenantDataAccess = tenantDataAccessFor(req)
      const connection = await tenantDataAccess.payments.getStripeConnection()

      let stripeAccountId = connection.stripeAccountId
      if (!stripeAccountId) {
        const account = await createStandardConnectedAccount({
          secretKey: runtime.STRIPE_SECRET_KEY,
          businessName: connection.displayName,
          metadata: {
            restaurantId: connection.restaurantId,
            tenantSlug: connection.slug,
          },
        })
        stripeAccountId = account.id
        await tenantDataAccess.payments.setStripeAccountId(account.id)
      }

      const onboardingLink = await createOnboardingLink({
        config: {
          secretKey: runtime.STRIPE_SECRET_KEY,
          refreshUrl: runtime.STRIPE_CONNECT_REFRESH_URL,
          returnUrl: runtime.STRIPE_CONNECT_RETURN_URL,
        },
        stripeAccountId,
      })

      return res.json({ url: onboardingLink.url })
    } catch (error) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to create Stripe onboarding link',
      })
    }
  })
}
