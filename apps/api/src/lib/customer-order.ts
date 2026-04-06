import {
  verifyCustomerAccessToken,
  type CustomerAccessTokenPayload,
} from '@repo/auth'
import type { TenantRequest } from '../middleware/tenant.js'
import { env } from '../config/env.js'

export function normalizeCustomerPhone(value: string) {
  const digits = value.replace(/\D/g, '')

  if (digits.length === 10) {
    return `+1${digits}`
  }

  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`
  }

  return null
}

export function readBearerToken(req: TenantRequest): string | null {
  const header = req.headers.authorization
  if (!header) return null

  const [scheme, token] = header.split(' ')
  if (scheme !== 'Bearer' || !token) return null
  return token
}

export function verifyCustomer(req: TenantRequest): CustomerAccessTokenPayload {
  const token = readBearerToken(req)
  if (!token) {
    throw new Error('Missing customer access token')
  }

  const payload = verifyCustomerAccessToken(token, {
    accessSecret: env().JWT_ACCESS_SECRET,
    issuer: env().JWT_ISSUER,
    audience: env().JWT_AUDIENCE,
  })

  if (!req.tenant) {
    throw new Error('No tenant in request')
  }

  if (payload.restaurantId !== req.tenant.id) {
    throw new Error('Customer access token tenant mismatch')
  }

  return payload
}
