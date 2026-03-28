import { z } from 'zod'

const EnvSchema = z.object({
  DATABASE_URL: z.string(),
  TWILIO_ACCOUNT_SID: z.string(),
  TWILIO_AUTH_TOKEN: z.string(),
  TWILIO_MESSAGING_SERVICE_SID: z.string(),
  NOTIFICATION_WORKER_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(10000),
  NOTIFICATION_WORKER_BATCH_SIZE: z.coerce.number().int().positive().default(10),
})

type WorkerEnv = z.infer<typeof EnvSchema>

let cached: WorkerEnv | null = null

export function env() {
  if (cached) {
    return cached
  }

  const parsed = EnvSchema.safeParse(process.env)
  if (!parsed.success) {
    console.error(parsed.error.flatten().fieldErrors)
    throw new Error('Invalid worker env vars')
  }

  cached = parsed.data
  return cached
}
