import 'dotenv/config'
import { env } from './config/env.js'
import { createApp } from './app.js'

const port = Number(env().PORT)
const app = createApp()

app.listen(port, () => {
  console.log(`API listening on :${port}`)
})
