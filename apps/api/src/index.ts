import 'dotenv/config'
import { env } from './config/env'
import { createApp } from './app'

const port = Number(env().PORT)
const app = createApp()

app.listen(port, () => {
  console.log(`API listening on :${port}`)
})
