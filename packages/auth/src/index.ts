import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'

export async function hashPassword(pw: string): Promise<string> {
  return bcrypt.hash(pw, 10)
}

export async function verifyPassword(pw: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pw, hash)
}

const TokenPayload = z.object({ sub: z.string(), restaurantId: z.string(), role: z.enum(['admin', 'staff']) })
export type TokenPayload = z.infer<typeof TokenPayload>

export function signToken(payload: TokenPayload, secret: string, ttl = '7d'): string {
  return jwt.sign(payload, secret, { expiresIn: ttl })
}

export function verifyToken(token: string, secret: string): TokenPayload {
  const decoded = jwt.verify(token, secret)
  const res = TokenPayload.safeParse(decoded)
  if (!res.success) throw new Error('Invalid token')
  return res.data
}

const CustomerAccessTokenPayload = z.object({
  sub: z.string(),
  restaurantId: z.string(),
  phone: z.string(),
  type: z.literal('customer-access')
})

const CustomerRefreshTokenPayload = z.object({
  sub: z.string(),
  restaurantId: z.string(),
  phone: z.string(),
  type: z.literal('customer-refresh')
})

export type CustomerAccessTokenPayload = z.infer<typeof CustomerAccessTokenPayload>
export type CustomerRefreshTokenPayload = z.infer<typeof CustomerRefreshTokenPayload>

type RequestOtpInput = {
  phone: string
  channel?: 'sms'
}

type VerifyOtpInput = {
  phone: string
  code: string
}

type TwilioVerifyConfig = {
  accountSid: string
  authToken: string
  verifyServiceSid: string
}

function createTwilioAuthHeader(config: TwilioVerifyConfig): string {
  const credentials = Buffer.from(
    `${config.accountSid}:${config.authToken}`,
    'utf8'
  ).toString('base64')
  return `Basic ${credentials}`
}

async function callTwilioVerify(
  config: TwilioVerifyConfig,
  path: string,
  body: Record<string, string>
): Promise<Record<string, unknown>> {
  const response = await fetch(
    `https://verify.twilio.com/v2/Services/${config.verifyServiceSid}${path}`,
    {
      method: 'POST',
      headers: {
        Authorization: createTwilioAuthHeader(config),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams(body)
    }
  )

  const payload = (await response.json()) as Record<string, unknown>
  if (!response.ok) {
    const message =
      typeof payload.message === 'string'
        ? payload.message
        : 'Twilio Verify request failed'
    throw new Error(message)
  }

  return payload
}

export async function requestCustomerOtp(
  config: TwilioVerifyConfig,
  input: RequestOtpInput
): Promise<void> {
  await callTwilioVerify(config, '/Verifications', {
    To: input.phone,
    Channel: input.channel ?? 'sms'
  })
}

export async function verifyCustomerOtp(
  config: TwilioVerifyConfig,
  input: VerifyOtpInput
): Promise<boolean> {
  const payload = await callTwilioVerify(config, '/VerificationCheck', {
    To: input.phone,
    Code: input.code
  })

  return payload.status === 'approved'
}

type CustomerTokenConfig = {
  accessSecret: string
  refreshSecret: string
  issuer: string
  audience: string
  accessTtlSeconds: number
  refreshTtlSeconds: number
}

type CustomerIdentity = {
  restaurantId: string
  phone: string
}

export function issueCustomerTokens(
  config: CustomerTokenConfig,
  identity: CustomerIdentity
): { accessToken: string; refreshToken: string } {
  const sub = `${identity.restaurantId}:${identity.phone}`

  const accessToken = jwt.sign(
    {
      sub,
      restaurantId: identity.restaurantId,
      phone: identity.phone,
      type: 'customer-access'
    },
    config.accessSecret,
    {
      issuer: config.issuer,
      audience: config.audience,
      expiresIn: config.accessTtlSeconds
    }
  )

  const refreshToken = jwt.sign(
    {
      sub,
      restaurantId: identity.restaurantId,
      phone: identity.phone,
      type: 'customer-refresh'
    },
    config.refreshSecret,
    {
      issuer: config.issuer,
      audience: config.audience,
      expiresIn: config.refreshTtlSeconds
    }
  )

  return { accessToken, refreshToken }
}

export function verifyCustomerAccessToken(
  token: string,
  config: Pick<CustomerTokenConfig, 'accessSecret' | 'issuer' | 'audience'>
): CustomerAccessTokenPayload {
  const decoded = jwt.verify(token, config.accessSecret, {
    issuer: config.issuer,
    audience: config.audience
  })
  const result = CustomerAccessTokenPayload.safeParse(decoded)
  if (!result.success) throw new Error('Invalid customer access token')
  return result.data
}

export function verifyCustomerRefreshToken(
  token: string,
  config: Pick<CustomerTokenConfig, 'refreshSecret' | 'issuer' | 'audience'>
): CustomerRefreshTokenPayload {
  const decoded = jwt.verify(token, config.refreshSecret, {
    issuer: config.issuer,
    audience: config.audience
  })
  const result = CustomerRefreshTokenPayload.safeParse(decoded)
  if (!result.success) throw new Error('Invalid customer refresh token')
  return result.data
}
