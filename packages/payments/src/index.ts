import type { Request, Response } from 'express'
import { z } from 'zod'

export type OnboardingLink = { url: string }

export async function createOnboardingLink(restaurantId: string): Promise<OnboardingLink> {
  // Stub: you would call Stripe Connect accounts.createLink here
  return { url: `https://connect.stripe.com/onboarding/${restaurantId}` }
}

export const WebhookSchema = z.object({ id: z.string(), type: z.string(), data: z.any() })

export async function stripeWebhookHandler(req: Request, res: Response) {
  // Verify signature with STRIPE_WEBHOOK_SECRET then handle event types
  const payload = req.body
  const parsed = WebhookSchema.safeParse(payload)
  if (!parsed.success) return res.status(400).end()
  // handle events as needed
  return res.status(200).json({ received: true })
}
