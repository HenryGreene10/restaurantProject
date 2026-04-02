import { z } from 'zod'

const EnvSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default('development'),
    PORT: z.string().default('4000'),
    DATABASE_URL: z.string(),
    JWT_SECRET: z.string().optional(),
    JWT_ACCESS_SECRET: z.string(),
    JWT_REFRESH_SECRET: z.string(),
    JWT_ISSUER: z.string().default('restaurant-platform'),
    JWT_AUDIENCE: z.string().default('restaurant-platform-customers'),
    CUSTOMER_ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(900),
    CUSTOMER_REFRESH_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(2592000),
    BASE_DOMAIN: z.string().optional(),
    TENANT_DOMAIN_SUFFIX: z.string().optional(),
    ANTHROPIC_API_KEY: z.string(),
    TWILIO_ACCOUNT_SID: z.string(),
    TWILIO_AUTH_TOKEN: z.string(),
    TWILIO_VERIFY_SERVICE_SID: z.string(),
  })
  .transform((input) => ({
    ...input,
    BASE_DOMAIN: input.BASE_DOMAIN ?? input.TENANT_DOMAIN_SUFFIX,
  }))
  .refine((input) => Boolean(input.BASE_DOMAIN), {
    message: 'BASE_DOMAIN or TENANT_DOMAIN_SUFFIX is required',
    path: ['BASE_DOMAIN'],
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
