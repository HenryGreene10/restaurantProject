import type { Router } from 'express'
import { z } from 'zod'
import { createPlatformDataAccess } from '@repo/data-access'
import { getClerkPrimaryEmail, mergeClerkPublicMetadata } from '../lib/clerk.js'
import {
  requireClerkIdentity,
  resolveAdminAccessFromClerkIdentity,
} from '../middleware/clerk-auth.js'

const RESERVED_SLUGS = new Set(['www', 'admin', 'api', 'app', 'kiosk'])
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const RegisterOnboardingSchema = z.object({
  clerkUserId: z.string().trim().min(1),
  email: z.string().trim().email(),
  restaurantName: z.string().trim().min(1).max(120),
  slug: z.string().trim().min(3).max(63),
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

export function registerOnboardingRoutes(r: Router) {
  r.get(
    '/v1/onboarding/me',
    requireClerkIdentity,
    async (req, res) => {
      try {
        if (!req.clerkIdentity) {
          return res.status(401).json({ error: 'Missing Clerk identity' })
        }

        const adminAccess = await resolveAdminAccessFromClerkIdentity(
          req.clerkIdentity.clerkUserId,
        )

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
    },
  )

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

  r.post(
    '/v1/onboarding/register',
    requireClerkIdentity,
    async (req, res) => {
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
          parsed.data.clerkUserId,
        )
        if (existingAdmin) {
          return res.status(409).json({ error: 'Clerk user is already onboarded' })
        }

        const available = await platformDataAccess.isTenantSlugAvailable(validation.slug)
        if (!available) {
          return res.status(409).json({ error: 'Slug is already taken' })
        }

        const created = await platformDataAccess.createRestaurantOnboarding({
          clerkUserId: parsed.data.clerkUserId,
          email: primaryEmail ?? parsed.data.email,
          restaurantName: parsed.data.restaurantName,
          slug: validation.slug,
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
            : error instanceof Error
              ? error.message
              : 'Failed to register restaurant'

        return res.status(message === 'Slug is already taken' ? 409 : 400).json({
          error: message,
        })
      }
    },
  )
}
