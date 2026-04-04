import type { NextFunction, Request, Response } from 'express'
import { verifyToken } from '@clerk/backend'
import { env } from '../config/env.js'

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

export async function requireClerkAuth(req: Request, res: Response, next: NextFunction) {
  const token = readBearerToken(req)
  if (!token) {
    return res.status(401).json({ error: 'Missing Clerk bearer token' })
  }

  try {
    await verifyToken(token, {
      secretKey: env().CLERK_SECRET_KEY,
    })
    return next()
  } catch (error) {
    console.error('Clerk token verification failed', error)
    return res.status(401).json({ error: 'Invalid Clerk token' })
  }
}
