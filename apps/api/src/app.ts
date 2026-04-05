import express from 'express'
import morgan from 'morgan'
import cors from 'cors'
import * as Sentry from '@sentry/node'
import { requireClerkAuth } from './middleware/clerk-auth.js'
import { tenantMiddleware } from './middleware/tenant.js'
import { registerHealthRoutes } from './routes/health.js'
import { registerMenuRoutes } from './routes/menu.js'
import { registerAdminBrandRoutes } from './routes/admin-brand.js'
import { registerAdminMenuRoutes } from './routes/admin-menu.js'
import { registerOrderRoutes } from './routes/orders.js'
import { registerAssistantRoutes } from './routes/assistant.js'
import { registerKitchenRoutes } from './routes/kitchen.js'
import { registerCustomerAuthRoutes } from './routes/customer-auth.js'

export function createApp() {
  const app = express()

  app.use(cors())
  app.use(express.json({ limit: '1mb' }))
  app.use(morgan('dev'))

  registerHealthRoutes(app)
  app.use(tenantMiddleware)
  registerCustomerAuthRoutes(app)
  registerMenuRoutes(app)
  app.use('/admin', requireClerkAuth)
  app.use('/v1/assistant/command', requireClerkAuth)
  registerAdminBrandRoutes(app)
  registerAdminMenuRoutes(app)
  registerOrderRoutes(app)
  registerAssistantRoutes(app)
  registerKitchenRoutes(app)

  Sentry.setupExpressErrorHandler(app)

  return app
}
