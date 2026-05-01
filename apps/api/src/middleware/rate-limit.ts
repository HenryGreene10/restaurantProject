import { ipKeyGenerator, rateLimit } from 'express-rate-limit'

function normalizedIp(req: { ip?: string; socket?: { remoteAddress?: string } }) {
  return ipKeyGenerator(req.ip ?? req.socket?.remoteAddress ?? '127.0.0.1')
}

// 5 OTP requests per phone number per 15 minutes.
// Keyed by phone so a single number can't trigger spam
// regardless of which IP it comes from.
export const otpPhoneRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => {
    const phone = req.body?.phone
    return typeof phone === 'string' && phone.length > 0
      ? `otp:phone:${phone}`
      : `otp:ip:${normalizedIp(req)}`
  },
  message: { error: 'Too many OTP requests. Please try again later.' },
})

// 5 OTP requests per IP per 15 minutes (separate from phone limit —
// both must pass).
export const otpIpRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => `otp:ip:${normalizedIp(req)}`,
  message: { error: 'Too many OTP requests from this IP. Please try again later.' },
})

// 20 checkout attempts per IP per minute. Generous enough for real users,
// tight enough to prevent Stripe API hammering.
export const checkoutRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => `checkout:ip:${normalizedIp(req)}`,
  message: { error: 'Too many checkout requests. Please slow down.' },
})
