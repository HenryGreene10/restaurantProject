import { z } from 'zod'

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default('development'),
  PORT: z.string().default('4000'),
  DATABASE_URL: z.string(),
  JWT_SECRET: z.string(),
  BASE_DOMAIN: z.string(),
})

type Env = z.infer<typeof EnvSchema>

let cached: Env | null = null
export function env(): Env {
  if (cached) return cached
  const parsed = EnvSchema.safeParse(process.env)
  if (!parsed.success) {
    console.error(parsed.error.flatten().fieldErrors)
    throw new Error('Invalid env vars')
  }
  cached = parsed.data
  return cached
}
