import express from 'express'
import morgan from 'morgan'
import cors from 'cors'
import { tenantMiddleware } from './middleware/tenant'
import { registerHealthRoutes } from './routes/health'
import { registerMenuRoutes } from './routes/menu'
import { registerAdminMenuRoutes } from './routes/admin-menu'
import { registerOrderRoutes } from './routes/orders'
import { registerAssistantRoutes } from './routes/assistant'
import { registerKitchenRoutes } from './routes/kitchen'
import { registerCustomerAuthRoutes } from './routes/customer-auth'

export function createApp() {
  const app = express()

  app.use(cors())
  app.use(express.json({ limit: '1mb' }))
  app.use(morgan('dev'))

  registerHealthRoutes(app)
  app.use(tenantMiddleware)
  registerCustomerAuthRoutes(app)
  registerMenuRoutes(app)
  registerAdminMenuRoutes(app)
  registerOrderRoutes(app)
  registerAssistantRoutes(app)
  registerKitchenRoutes(app)

  return app
}
