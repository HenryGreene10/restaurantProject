import { registerApplePayDomains } from '@repo/payments'
import { env } from './config/env.js'

const APPLE_PAY_BASE_DOMAIN = 'easymenu.website'
const JOES_PIZZA_TENANT_SLUG = 'joes-pizza'
const JOES_PIZZA_STRIPE_ACCOUNT_ID = 'acct_1TJ1kTEJMFSgPRIO'

function applePayDomainsForTenant(tenantSlug: string) {
  return [APPLE_PAY_BASE_DOMAIN, `${tenantSlug}.${APPLE_PAY_BASE_DOMAIN}`]
}

async function main() {
  const runtime = env()
  if (!runtime.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }

  const createdDomains = await registerApplePayDomains({
    secretKey: runtime.STRIPE_SECRET_KEY,
    stripeAccountId: JOES_PIZZA_STRIPE_ACCOUNT_ID,
    domains: applePayDomainsForTenant(JOES_PIZZA_TENANT_SLUG),
  })

  if (createdDomains.length === 0) {
    console.log('Apple Pay domains already registered for joes-pizza')
    return
  }

  console.log(`Registered Apple Pay domains for joes-pizza: ${createdDomains.join(', ')}`)
}

void main().catch((error) => {
  console.error('Failed to register Apple Pay domains for joes-pizza', error)
  process.exitCode = 1
})
