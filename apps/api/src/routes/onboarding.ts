import type { Router } from 'express'
import { z } from 'zod'
import { createPlatformDataAccess } from '@repo/data-access'
import {
  createPreSignupSetupCheckoutSession,
  createSetupCheckoutSession,
  retrieveSetupCheckoutSession,
} from '@repo/payments'
import { getClerkPrimaryEmail, mergeClerkPublicMetadata } from '../lib/clerk.js'
import {
  requireClerkIdentity,
  resolveAdminAccessFromClerkIdentity,
} from '../middleware/clerk-auth.js'
import { env } from '../config/env.js'

const RESERVED_SLUGS = new Set(['www', 'admin', 'api', 'app', 'kiosk'])
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const RegisterOnboardingSchema = z.object({
  clerkUserId: z.string().trim().min(1),
  email: z.string().trim().email(),
  restaurantName: z.string().trim().min(1).max(120),
  slug: z.string().trim().min(3).max(63),
  setupSessionId: z.string().trim().min(1),
})

function normalizeSlug(value: string) {
  return value.trim().toLowerCase()
}

function validateTenantSlug(value: string) {
  const slug = normalizeSlug(value)
  if (!slugPattern.test(slug)) {
    return {
      valid: false,
      slug,
      message: 'Slug must use lowercase letters, numbers, and hyphens only',
    } as const
  }

  if (RESERVED_SLUGS.has(slug)) {
    return {
      valid: false,
      slug,
      message: 'Slug is reserved',
    } as const
  }

  return {
    valid: true,
    slug,
  } as const
}

function appendCheckoutSessionPlaceholder(url: string) {
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}setup_session_id={CHECKOUT_SESSION_ID}`
}

function setupPaymentSuccessUrl(origin: string | undefined, configuredUrl: string) {
  if (configuredUrl.trim()) {
    return configuredUrl.includes('{CHECKOUT_SESSION_ID}')
      ? configuredUrl
      : appendCheckoutSessionPlaceholder(configuredUrl)
  }

  if (!origin) {
    throw new Error('Missing request origin for setup payment redirect')
  }

  return appendCheckoutSessionPlaceholder(`${origin}/signup`)
}

function setupPaymentCancelUrl(origin: string | undefined, configuredUrl: string) {
  if (configuredUrl.trim()) {
    return configuredUrl
  }

  if (!origin) {
    throw new Error('Missing request origin for setup payment redirect')
  }

  return `${origin}/signup`
}

async function validatePaidPreSignupSetupSession(sessionId: string) {
  const runtime = env()
  if (
    !runtime.STRIPE_SETUP_FEE_PRICE_ID ||
    !runtime.STRIPE_MONTHLY_PRICE_ID ||
    !runtime.STRIPE_SECRET_KEY
  ) {
    throw new Error('Setup payments are not configured')
  }

  const session = await retrieveSetupCheckoutSession({
    secretKey: runtime.STRIPE_SECRET_KEY,
    sessionId,
  })

  if (session.mode !== 'subscription') {
    throw new Error('Invalid setup payment session')
  }

  if (session.metadata?.type !== 'pre_signup_restaurant_setup') {
    throw new Error('Invalid setup payment session')
  }

  if (session.status !== 'complete' || session.payment_status !== 'paid') {
    throw new Error('Setup payment is not complete')
  }
}

export function registerOnboardingRoutes(r: Router) {
  r.get('/v1/onboarding/me', requireClerkIdentity, async (req, res) => {
    try {
      if (!req.clerkIdentity) {
        return res.status(401).json({ error: 'Missing Clerk identity' })
      }

      const adminAccess = await resolveAdminAccessFromClerkIdentity(req.clerkIdentity.clerkUserId)

      if (!adminAccess) {
        return res.json({
          matched: false,
          tenantSlug: null,
        })
      }

      await mergeClerkPublicMetadata(req.clerkIdentity.clerkUserId, {
        tenantSlug: adminAccess.tenantSlug,
      })

      return res.json({
        matched: true,
        tenantSlug: adminAccess.tenantSlug,
        subscriptionStatus: adminAccess.subscriptionStatus,
        restaurant: {
          id: adminAccess.restaurantId,
          name: adminAccess.restaurantName,
          slug: adminAccess.tenantSlug,
        },
      })
    } catch (error) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to load onboarding state',
      })
    }
  })

  r.get('/v1/onboarding/check-slug/:slug', async (req, res) => {
    const validation = validateTenantSlug(req.params.slug ?? '')
    if (!validation.valid) {
      return res.json({
        slug: validation.slug,
        available: false,
        error: validation.message,
      })
    }

    const platformDataAccess = createPlatformDataAccess()
    const available = await platformDataAccess.isTenantSlugAvailable(validation.slug)
    return res.json({
      slug: validation.slug,
      available,
      error: available ? null : 'Slug is already taken',
    })
  })

  r.post('/v1/onboarding/create-signup-payment-session', async (req, res) => {
    try {
      const runtime = env()
      if (
        !runtime.STRIPE_SETUP_FEE_PRICE_ID ||
        !runtime.STRIPE_MONTHLY_PRICE_ID ||
        !runtime.STRIPE_SECRET_KEY
      ) {
        return res.status(503).json({ error: 'Setup payments are not configured' })
      }

      const session = await createPreSignupSetupCheckoutSession({
        secretKey: runtime.STRIPE_SECRET_KEY,
        setupFeePriceId: runtime.STRIPE_SETUP_FEE_PRICE_ID,
        monthlyPriceId: runtime.STRIPE_MONTHLY_PRICE_ID,
        successUrl: setupPaymentSuccessUrl(req.headers.origin, runtime.STRIPE_SETUP_SUCCESS_URL),
        cancelUrl: setupPaymentCancelUrl(req.headers.origin, runtime.STRIPE_SETUP_CANCEL_URL),
      })

      return res.status(201).json({ url: session.url })
    } catch (error) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to create setup payment session',
      })
    }
  })

  r.post('/v1/onboarding/register', requireClerkIdentity, async (req, res) => {
    try {
      const parsed = RegisterOnboardingSchema.safeParse(req.body)
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid onboarding payload' })
      }

      if (!req.clerkIdentity || req.clerkIdentity.clerkUserId !== parsed.data.clerkUserId) {
        return res.status(401).json({ error: 'Clerk token does not match request user' })
      }

      const primaryEmail = await getClerkPrimaryEmail(parsed.data.clerkUserId)
      if (
        primaryEmail &&
        primaryEmail.trim().toLowerCase() !== parsed.data.email.trim().toLowerCase()
      ) {
        return res.status(400).json({ error: 'Email does not match Clerk account' })
      }

      const validation = validateTenantSlug(parsed.data.slug)
      if (!validation.valid) {
        return res.status(400).json({ error: validation.message })
      }

      const platformDataAccess = createPlatformDataAccess()
      const existingAdmin = await platformDataAccess.findAdminAccessByClerkUserId(
        parsed.data.clerkUserId
      )
      if (existingAdmin) {
        return res.status(409).json({ error: 'Clerk user is already onboarded' })
      }

      const available = await platformDataAccess.isTenantSlugAvailable(validation.slug)
      if (!available) {
        return res.status(409).json({ error: 'Slug is already taken' })
      }

      await validatePaidPreSignupSetupSession(parsed.data.setupSessionId)

      const existingSetupSession = await platformDataAccess.findRestaurantBySetupCheckoutSessionId(
        parsed.data.setupSessionId
      )
      if (existingSetupSession) {
        return res.status(409).json({ error: 'Setup payment session has already been used' })
      }

      const created = await platformDataAccess.createRestaurantOnboarding({
        clerkUserId: parsed.data.clerkUserId,
        email: primaryEmail ?? parsed.data.email,
        restaurantName: parsed.data.restaurantName,
        slug: validation.slug,
        setupCheckoutSessionId: parsed.data.setupSessionId,
      })

      try {
        await mergeClerkPublicMetadata(parsed.data.clerkUserId, {
          tenantSlug: created.tenantSlug,
        })
      } catch (error) {
        await platformDataAccess.deleteRestaurantOnboarding(created.restaurantId)
        throw error
      }

      return res.status(201).json({
        restaurant: {
          id: created.restaurantId,
          name: created.restaurantName,
          slug: created.tenantSlug,
        },
        tenantSlug: created.tenantSlug,
      })
    } catch (error) {
      const message =
        error instanceof Error && error.message === 'SLUG_TAKEN'
          ? 'Slug is already taken'
          : error instanceof Error && error.message === 'SETUP_SESSION_USED'
            ? 'Setup payment session has already been used'
            : error instanceof Error
              ? error.message
              : 'Failed to register restaurant'

      return res
        .status(
          message === 'Slug is already taken' || message.includes('already been used') ? 409 : 400
        )
        .json({
          error: message,
        })
    }
  })

  r.post('/v1/onboarding/create-setup-session', requireClerkIdentity, async (req, res) => {
    try {
      if (!req.clerkIdentity) {
        return res.status(401).json({ error: 'Missing Clerk identity' })
      }

      const adminAccess = await resolveAdminAccessFromClerkIdentity(req.clerkIdentity.clerkUserId)

      if (!adminAccess) {
        return res.status(404).json({ error: 'Restaurant not found for this account' })
      }

      if (adminAccess.subscriptionStatus === 'ACTIVE') {
        return res.status(409).json({ error: 'Subscription is already active' })
      }

      const runtime = env()
      if (
        !runtime.STRIPE_SETUP_FEE_PRICE_ID ||
        !runtime.STRIPE_MONTHLY_PRICE_ID ||
        !runtime.STRIPE_SECRET_KEY
      ) {
        return res.status(503).json({ error: 'Setup payments are not configured' })
      }

      const session = await createSetupCheckoutSession({
        secretKey: runtime.STRIPE_SECRET_KEY,
        setupFeePriceId: runtime.STRIPE_SETUP_FEE_PRICE_ID,
        monthlyPriceId: runtime.STRIPE_MONTHLY_PRICE_ID,
        restaurantId: adminAccess.restaurantId,
        successUrl: runtime.STRIPE_SETUP_SUCCESS_URL || `${req.headers.origin ?? ''}/`,
        cancelUrl: runtime.STRIPE_SETUP_CANCEL_URL || `${req.headers.origin ?? ''}/signup`,
      })

      return res.status(201).json({ url: session.url })
    } catch (error) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to create setup session',
      })
    }
  })
}
