import 'dotenv/config'
import express from 'express'
import morgan from 'morgan'
import cors from 'cors'
import { env } from './config/env'
import { tenantMiddleware } from './middleware/tenant'
import { registerHealthRoutes } from './routes/health'
import { registerMenuRoutes } from './routes/menu'
import { registerOrderRoutes } from './routes/orders'
import { registerAssistantRoutes } from './routes/assistant'
import { registerKitchenRoutes } from './routes/kitchen'

const app = express()
app.use(cors())
app.use(express.json({ limit: '1mb' }))
app.use(morgan('dev'))

registerHealthRoutes(app)
app.use(tenantMiddleware) // everything below here is tenant-scoped
registerMenuRoutes(app)
registerOrderRoutes(app)
registerAssistantRoutes(app)
registerKitchenRoutes(app)

const port = Number(env().PORT)
app.listen(port, () => {
  console.log(`API listening on :${port}`)
})
