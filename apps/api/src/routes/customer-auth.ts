import type { Request, Response, Router } from 'express'
import {
  issueCustomerTokens,
  requestCustomerOtp,
  verifyCustomerOtp,
  verifyCustomerRefreshToken
} from '@repo/auth'
import { createTenantDataAccess, createTenantScope } from '@repo/data-access'
import { z } from 'zod'
import { env } from '../config/env.js'
import type { TenantRequest } from '../middleware/tenant.js'

const RequestOtpSchema = z.object({
  phone: z.string().min(8)
})

const VerifyOtpSchema = z.object({
  phone: z.string().min(8),
  code: z.string().min(4).max(10)
})

function customerTokenConfig() {
  const config = env()
  return {
    accessSecret: config.JWT_ACCESS_SECRET,
    refreshSecret: config.JWT_REFRESH_SECRET,
    issuer: config.JWT_ISSUER,
    audience: config.JWT_AUDIENCE,
    accessTtlSeconds: config.CUSTOMER_ACCESS_TOKEN_TTL_SECONDS,
    refreshTtlSeconds: config.CUSTOMER_REFRESH_TOKEN_TTL_SECONDS
  }
}

function twilioVerifyConfig() {
  const config = env()
  return {
    accountSid: config.TWILIO_ACCOUNT_SID,
    authToken: config.TWILIO_AUTH_TOKEN,
    verifyServiceSid: config.TWILIO_VERIFY_SERVICE_SID
  }
}

function setRefreshCookie(res: Response, refreshToken: string) {
  res.cookie('customer_refresh_token', refreshToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env().NODE_ENV === 'production',
    path: '/auth/customer',
    maxAge: env().CUSTOMER_REFRESH_TOKEN_TTL_SECONDS * 1000
  })
}

function readRefreshCookie(req: Request): string | null {
  const header = req.headers.cookie
  if (!header) return null

  for (const part of header.split(';')) {
    const [rawKey, ...rawValue] = part.trim().split('=')
    if (rawKey === 'customer_refresh_token') {
      return decodeURIComponent(rawValue.join('='))
    }
  }

  return null
}

export function registerCustomerAuthRoutes(r: Router) {
  r.post('/auth/customer/request-otp', async (req: TenantRequest, res) => {
    try {
      if (!req.tenant) return res.status(500).json({ error: 'No tenant in request' })

      const parsed = RequestOtpSchema.safeParse(req.body)
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid phone payload' })
      }

      await requestCustomerOtp(twilioVerifyConfig(), {
        phone: parsed.data.phone
      })

      return res.status(202).json({ sent: true })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to request OTP'
      return res.status(502).json({ error: message })
    }
  })

  r.post('/auth/customer/verify-otp', async (req: TenantRequest, res) => {
    try {
      if (!req.tenant) return res.status(500).json({ error: 'No tenant in request' })

      const parsed = VerifyOtpSchema.safeParse(req.body)
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid verification payload' })
      }

      const approved = await verifyCustomerOtp(twilioVerifyConfig(), {
        phone: parsed.data.phone,
        code: parsed.data.code
      })

      if (!approved) {
        return res.status(401).json({ error: 'Verification code was not approved' })
      }

      const tenantDataAccess = createTenantDataAccess(
        createTenantScope(req.tenant.id)
      )
      const customer = await tenantDataAccess.customers.upsertByPhone({
        phone: parsed.data.phone
      })

      const tokens = issueCustomerTokens(customerTokenConfig(), {
        customerId: customer.id,
        restaurantId: req.tenant.id,
        phone: parsed.data.phone
      })

      setRefreshCookie(res, tokens.refreshToken)
      return res.status(200).json({ accessToken: tokens.accessToken })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to verify OTP'
      return res.status(502).json({ error: message })
    }
  })

  r.post('/auth/customer/refresh', async (req: TenantRequest, res) => {
    try {
      if (!req.tenant) return res.status(500).json({ error: 'No tenant in request' })

      const refreshToken = readRefreshCookie(req)
      if (!refreshToken) {
        return res.status(401).json({ error: 'Missing refresh token cookie' })
      }

      const payload = verifyCustomerRefreshToken(refreshToken, {
        refreshSecret: env().JWT_REFRESH_SECRET,
        issuer: env().JWT_ISSUER,
        audience: env().JWT_AUDIENCE
      })

      if (payload.restaurantId !== req.tenant.id) {
        return res.status(403).json({ error: 'Refresh token tenant mismatch' })
      }

      const tenantDataAccess = createTenantDataAccess(
        createTenantScope(req.tenant.id)
      )
      const customer = await tenantDataAccess.customers.findById(
        payload.customerId
      )
      if (!customer || customer.phone !== payload.phone) {
        return res.status(401).json({ error: 'Customer session is no longer valid' })
      }

      const tokens = issueCustomerTokens(customerTokenConfig(), {
        customerId: customer.id,
        restaurantId: payload.restaurantId,
        phone: payload.phone
      })

      setRefreshCookie(res, tokens.refreshToken)
      return res.status(200).json({ accessToken: tokens.accessToken })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to refresh session'
      return res.status(401).json({ error: message })
    }
  })
}
