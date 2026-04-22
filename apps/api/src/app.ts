import express from 'express'
import morgan from 'morgan'
import cors, { type CorsOptions } from 'cors'
import * as Sentry from '@sentry/node'
import { requireClerkAuth } from './middleware/clerk-auth.js'
import { tenantMiddleware } from './middleware/tenant.js'
import { registerHealthRoutes } from './routes/health.js'
import { registerMenuRoutes } from './routes/menu.js'
import { registerAdminBrandRoutes } from './routes/admin-brand.js'
import { registerAdminInsightsRoutes } from './routes/admin-insights.js'
import { registerAdminMenuRoutes } from './routes/admin-menu.js'
import { registerAdminPaymentsRoutes } from './routes/admin-payments.js'
import { registerOrderRoutes } from './routes/orders.js'
import { registerCheckoutRoutes } from './routes/checkouts.js'
import { registerAssistantRoutes } from './routes/assistant.js'
import { registerKitchenRoutes } from './routes/kitchen.js'
import { registerCustomerAuthRoutes } from './routes/customer-auth.js'
import { registerOnboardingRoutes } from './routes/onboarding.js'
import { registerStripeWebhookRoute } from './routes/stripe-webhook.js'
import { registerAdminOrderRoutes } from './routes/admin-orders.js'
import { registerCloudPrntRoutes } from './routes/cloudprnt.js'
import { registerAdminPrintingRoutes } from './routes/admin-printing.js'
import { registerAdminLoyaltyRoutes } from './routes/admin-loyalty.js'
import { registerLoyaltyRoutes } from './routes/loyalty.js'
import { env } from './config/env.js'

function isAllowedCorsOrigin(origin: string) {
  let url: URL
  try {
    url = new URL(origin)
  } catch {
    return false
  }

  const hostname = url.hostname.toLowerCase()
  const protocol = url.protocol.toLowerCase()
  const baseDomain = (env().BASE_DOMAIN ?? '').toLowerCase()

  if (protocol !== 'https:' && protocol !== 'http:') {
    return false
  }

  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0') {
    return true
  }

  return hostname === baseDomain || hostname.endsWith(`.${baseDomain}`)
}

function createCorsOptions(): CorsOptions {
  return {
    origin(origin, callback) {
      if (!origin || isAllowedCorsOrigin(origin)) {
        callback(null, true)
        return
      }

      callback(new Error(`CORS origin not allowed: ${origin}`))
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-slug', 'sentry-trace', 'baggage'],
    optionsSuccessStatus: 204,
  }
}

export function createApp() {
  const app = express()
  const corsOptions = createCorsOptions()

  registerStripeWebhookRoute(app)
  app.use(cors(corsOptions))
  app.options('*', cors(corsOptions))
  app.use(express.json({ limit: '1mb' }))
  app.use(morgan('dev'))

  registerHealthRoutes(app)
  registerOnboardingRoutes(app)
  registerCloudPrntRoutes(app)
  app.use('/admin', requireClerkAuth)
  app.use('/v1/assistant/command', requireClerkAuth)
  app.use(tenantMiddleware)
  registerCustomerAuthRoutes(app)
  registerMenuRoutes(app)
  registerCheckoutRoutes(app)
  registerAdminBrandRoutes(app)
  registerAdminInsightsRoutes(app)
  registerAdminPaymentsRoutes(app)
  registerAdminPrintingRoutes(app)
  registerAdminLoyaltyRoutes(app)
  registerLoyaltyRoutes(app)
  registerAdminMenuRoutes(app)
  registerOrderRoutes(app)
  registerAdminOrderRoutes(app)
  registerAssistantRoutes(app)
  registerKitchenRoutes(app)

  Sentry.setupExpressErrorHandler(app)

  return app
}
