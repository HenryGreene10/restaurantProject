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
    ANTHROPIC_API_KEY: z.string().optional(),
    GROQ_API_KEY: z.string().optional(),
    CLERK_SECRET_KEY: z.string(),
    SENTRY_DSN: z.string().default(''),
    STRIPE_SECRET_KEY: z.string().default(''),
    STRIPE_WEBHOOK_SECRET: z.string().default(''),
    STRIPE_CONNECT_RETURN_URL: z.string().default(''),
    STRIPE_CONNECT_REFRESH_URL: z.string().default(''),
    TWILIO_ACCOUNT_SID: z.string(),
    TWILIO_AUTH_TOKEN: z.string(),
    TWILIO_VERIFY_SERVICE_SID: z.string(),
    CLOUDFLARE_R2_ACCOUNT_ID: z.string().default(''),
    CLOUDFLARE_R2_ACCESS_KEY_ID: z.string().default(''),
    CLOUDFLARE_R2_SECRET_ACCESS_KEY: z.string().default(''),
    CLOUDFLARE_R2_BUCKET_NAME: z.string().default(''),
    CLOUDFLARE_R2_PUBLIC_URL: z.string().default(''),
  })
  .transform((input) => ({
    ...input,
    BASE_DOMAIN: input.BASE_DOMAIN ?? input.TENANT_DOMAIN_SUFFIX,
  }))
  .refine((input) => Boolean(input.BASE_DOMAIN), {
    message: 'BASE_DOMAIN or TENANT_DOMAIN_SUFFIX is required',
    path: ['BASE_DOMAIN'],
  })
  .refine((input) => Boolean(input.GROQ_API_KEY || input.ANTHROPIC_API_KEY), {
    message: 'GROQ_API_KEY or ANTHROPIC_API_KEY is required',
    path: ['GROQ_API_KEY'],
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
