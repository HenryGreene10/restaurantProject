import StripeConstructor, { type Stripe as StripeClient } from 'stripe'

export type StripeRuntimeConfig = {
  secretKey: string
  webhookSecret: string
}

export type StripeOnboardingConfig = {
  secretKey: string
  refreshUrl: string
  returnUrl: string
}

export type DirectChargePaymentIntentConfig = {
  secretKey: string
  stripeAccountId: string
}

export type StripeConnectionState = {
  stripeAccountId: string | null
  chargesEnabled: boolean
  payoutsEnabled: boolean
  status: 'not_connected' | 'onboarding_required' | 'active'
}

function createStripeClient(secretKey: string) {
  const Stripe = StripeConstructor as unknown as new (
    key: string,
    config?: Record<string, unknown>,
  ) => StripeClient

  return new Stripe(secretKey)
}

export function deriveStripeConnectionState(input: {
  stripeAccountId: string | null
  chargesEnabled: boolean
  payoutsEnabled: boolean
}): StripeConnectionState {
  if (!input.stripeAccountId) {
    return {
      stripeAccountId: null,
      chargesEnabled: false,
      payoutsEnabled: false,
      status: 'not_connected',
    }
  }

  if (input.chargesEnabled && input.payoutsEnabled) {
    return {
      stripeAccountId: input.stripeAccountId,
      chargesEnabled: true,
      payoutsEnabled: true,
      status: 'active',
    }
  }

  return {
    stripeAccountId: input.stripeAccountId,
    chargesEnabled: input.chargesEnabled,
    payoutsEnabled: input.payoutsEnabled,
    status: 'onboarding_required',
  }
}

export async function createStandardConnectedAccount(input: {
  secretKey: string
  email?: string | null
  businessName: string
  metadata?: Record<string, string>
}) {
  const stripe = createStripeClient(input.secretKey)
  return stripe.accounts.create({
    type: 'standard',
    email: input.email ?? undefined,
    business_profile: {
      name: input.businessName,
    },
    metadata: input.metadata,
  })
}

export async function createOnboardingLink(input: {
  config: StripeOnboardingConfig
  stripeAccountId: string
}) {
  const stripe = createStripeClient(input.config.secretKey)
  return stripe.accountLinks.create({
    account: input.stripeAccountId,
    refresh_url: input.config.refreshUrl,
    return_url: input.config.returnUrl,
    type: 'account_onboarding',
  })
}

export async function createDirectChargePaymentIntent(input: {
  config: DirectChargePaymentIntentConfig
  amount: number
  currency: string
  metadata?: Record<string, string>
  idempotencyKey?: string
}) {
  const stripe = createStripeClient(input.config.secretKey)
  return stripe.paymentIntents.create(
    {
      amount: input.amount,
      currency: input.currency,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: input.metadata,
    },
    {
      stripeAccount: input.config.stripeAccountId,
      idempotencyKey: input.idempotencyKey,
    },
  )
}

export async function retrieveDirectChargePaymentIntent(input: {
  config: DirectChargePaymentIntentConfig
  paymentIntentId: string
}) {
  const stripe = createStripeClient(input.config.secretKey)
  return stripe.paymentIntents.retrieve(
    input.paymentIntentId,
    undefined,
    {
      stripeAccount: input.config.stripeAccountId,
    },
  )
}

export async function verifyStripeWebhookEvent(input: {
  config: StripeRuntimeConfig
  body: Buffer | string
  signature: string
}) {
  const stripe = createStripeClient(input.config.secretKey)
  return stripe.webhooks.constructEvent(
    input.body,
    input.signature,
    input.config.webhookSecret,
  )
}
