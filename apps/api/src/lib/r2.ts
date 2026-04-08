import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { env } from '../config/env.js'

type R2Config = {
  accountId: string
  accessKeyId: string
  secretAccessKey: string
  bucketName: string
  publicUrl: URL
}

let cachedClient: S3Client | null = null
let cachedConfigKey: string | null = null

function requireValue(value: string, envVarName: string) {
  const trimmed = value.trim()
  if (!trimmed) {
    throw new Error(`${envVarName} is not configured`)
  }

  return trimmed
}

function parsePublicUrl(rawValue: string) {
  let parsed: URL

  try {
    parsed = new URL(rawValue)
  } catch {
    throw new Error('CLOUDFLARE_R2_PUBLIC_URL must be a valid absolute URL')
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error('CLOUDFLARE_R2_PUBLIC_URL must use http or https')
  }

  if (parsed.hostname.endsWith('.r2.cloudflarestorage.com')) {
    throw new Error(
      'CLOUDFLARE_R2_PUBLIC_URL must be the public bucket URL or custom domain, not the internal R2 API endpoint',
    )
  }

  return parsed
}

function r2Config(): R2Config {
  const runtime = env()

  return {
    accountId: requireValue(runtime.CLOUDFLARE_R2_ACCOUNT_ID, 'CLOUDFLARE_R2_ACCOUNT_ID'),
    accessKeyId: requireValue(
      runtime.CLOUDFLARE_R2_ACCESS_KEY_ID,
      'CLOUDFLARE_R2_ACCESS_KEY_ID',
    ),
    secretAccessKey: requireValue(
      runtime.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
      'CLOUDFLARE_R2_SECRET_ACCESS_KEY',
    ),
    bucketName: requireValue(runtime.CLOUDFLARE_R2_BUCKET_NAME, 'CLOUDFLARE_R2_BUCKET_NAME'),
    publicUrl: parsePublicUrl(
      requireValue(runtime.CLOUDFLARE_R2_PUBLIC_URL, 'CLOUDFLARE_R2_PUBLIC_URL'),
    ),
  }
}

function getR2Client(config: R2Config) {
  const cacheKey = `${config.accountId}:${config.accessKeyId}:${config.bucketName}`

  if (cachedClient && cachedConfigKey === cacheKey) {
    return cachedClient
  }

  cachedClient = new S3Client({
    region: 'auto',
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  })
  cachedConfigKey = cacheKey

  return cachedClient
}

export async function uploadImage(
  file: Buffer,
  key: string,
  contentType: string,
): Promise<string> {
  const config = r2Config()
  const client = getR2Client(config)

  await client.send(
    new PutObjectCommand({
      Bucket: config.bucketName,
      Key: key,
      Body: file,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  )

  return new URL(key, `${config.publicUrl.toString().replace(/\/+$/, '')}/`).toString()
}
