import type { NextFunction, Request, Response } from 'express'

export function requireActiveSubscription(req: Request, res: Response, next: NextFunction) {
  if (!req.adminUser) {
    // requireClerkAuth runs before this and would have already rejected the request.
    return res.status(403).json({ error: 'Admin user is not onboarded' })
  }

  if (req.adminUser.subscriptionStatus === 'ACTIVE') {
    return next()
  }

  const code =
    req.adminUser.subscriptionStatus === 'CANCELLED'
      ? 'SUBSCRIPTION_CANCELLED'
      : 'SUBSCRIPTION_PENDING'

  return res.status(402).json({
    error: 'Subscription required',
    code,
  })
}
