import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'

export async function hashPassword(pw: string): Promise<string> {
  return bcrypt.hash(pw, 10)
}

export async function verifyPassword(pw: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pw, hash)
}

const TokenPayload = z.object({ sub: z.string(), restaurantId: z.string(), role: z.enum(['admin', 'staff']) })
export type TokenPayload = z.infer<typeof TokenPayload>

export function signToken(payload: TokenPayload, secret: string, ttl = '7d'): string {
  return jwt.sign(payload, secret, { expiresIn: ttl })
}

export function verifyToken(token: string, secret: string): TokenPayload {
  const decoded = jwt.verify(token, secret)
  const res = TokenPayload.safeParse(decoded)
  if (!res.success) throw new Error('Invalid token')
  return res.data
}
