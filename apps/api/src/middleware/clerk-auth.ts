import type { NextFunction, Request, Response } from 'express'
import { verifyToken } from '@clerk/backend'
import { createPlatformDataAccess } from '@repo/data-access'
import { env } from '../config/env.js'
import { getClerkPrimaryEmail } from '../lib/clerk.js'

type ClerkIdentity = {
  clerkUserId: string
}

type AdminIdentity = {
  id: string
  clerkUserId: string
  email: string
  role: string
  restaurantId: string
  tenantSlug: string
  restaurantName: string
}

declare module 'express-serve-static-core' {
  interface Request {
    clerkIdentity?: ClerkIdentity
    adminUser?: AdminIdentity
  }
}

function readBearerToken(req: Request) {
  const header = req.header('authorization')
  if (!header) {
    return null
  }

  const [scheme, token] = header.split(' ')
  if (scheme !== 'Bearer' || !token) {
    return null
  }

  return token
}

async function resolveClerkIdentity(req: Request) {
  const token = readBearerToken(req)
  if (!token) {
    return { error: 'Missing Clerk bearer token' as const }
  }

  const payload = await verifyToken(token, {
    secretKey: env().CLERK_SECRET_KEY,
  })

  if (!payload?.sub || typeof payload.sub !== 'string') {
    return { error: 'Invalid Clerk token' as const }
  }

  const identity = {
    clerkUserId: payload.sub,
  }

  req.clerkIdentity = identity
  return { identity }
}

export async function resolveAdminAccessFromClerkIdentity(clerkUserId: string) {
  const platformDataAccess = createPlatformDataAccess()
  let adminAccess = await platformDataAccess.findAdminAccessByClerkUserId(clerkUserId)

  // TODO(auth-migration): Remove this legacy email bridge after existing admins have been
  // backfilled with real clerkUserId links and tenantSlug metadata in Clerk.
  if (!adminAccess) {
    const primaryEmailAddress = await getClerkPrimaryEmail(clerkUserId)
    if (primaryEmailAddress) {
      adminAccess = await platformDataAccess.claimLegacyAdminAccessByEmail({
        clerkUserId,
        email: primaryEmailAddress,
      })
    }
  }

  return adminAccess
}

export async function requireClerkIdentity(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const result = await resolveClerkIdentity(req)
    if ('error' in result) {
      return res.status(401).json({ error: result.error })
    }

    return next()
  } catch (error) {
    console.error('Clerk token verification failed', error)
    return res.status(401).json({ error: 'Invalid Clerk token' })
  }
}

export async function requireClerkAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await resolveClerkIdentity(req)
    if ('error' in result) {
      return res.status(401).json({ error: result.error })
    }

    const adminAccess = await resolveAdminAccessFromClerkIdentity(
      result.identity.clerkUserId,
    )

    if (!adminAccess) {
      return res.status(403).json({ error: 'Admin user is not onboarded' })
    }

    req.adminUser = {
      id: adminAccess.adminUserId,
      clerkUserId: adminAccess.clerkUserId,
      email: adminAccess.email,
      role: adminAccess.role,
      restaurantId: adminAccess.restaurantId,
      tenantSlug: adminAccess.tenantSlug,
      restaurantName: adminAccess.restaurantName,
    }

    return next()
  } catch (error) {
    console.error('Clerk token verification failed', error)
    return res.status(401).json({ error: 'Invalid Clerk token' })
  }
}
