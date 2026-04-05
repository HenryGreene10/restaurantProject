import 'dotenv/config'
import * as Sentry from '@sentry/node'
import { env } from './config/env.js'
import { createApp } from './app.js'

const runtimeEnv = env()

if (runtimeEnv.SENTRY_DSN) {
  Sentry.init({
    dsn: runtimeEnv.SENTRY_DSN,
    environment: runtimeEnv.NODE_ENV,
  })
}

const port = Number(runtimeEnv.PORT)
const app = createApp()

app.listen(port, () => {
  console.log(`API listening on :${port}`)
})
