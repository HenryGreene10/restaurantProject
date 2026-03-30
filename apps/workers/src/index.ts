import 'dotenv/config'
import { createWorkerDataAccess } from '@repo/data-access'
import { env } from './env.js'
import { processNotificationBatch } from './notification-worker.js'

async function main() {
  const config = env()
  const dataAccess = createWorkerDataAccess()

  const runOnce = async () => {
    try {
      await processNotificationBatch(
        {
          dataAccess,
          smsConfig: {
            accountSid: config.TWILIO_ACCOUNT_SID,
            authToken: config.TWILIO_AUTH_TOKEN,
            messagingServiceSid: config.TWILIO_MESSAGING_SERVICE_SID,
          },
          logger: console,
        },
        config.NOTIFICATION_WORKER_BATCH_SIZE
      )
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Notification worker cycle failed'
      console.error(message)
    }
  }

  await runOnce()
  setInterval(runOnce, config.NOTIFICATION_WORKER_POLL_INTERVAL_MS)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
