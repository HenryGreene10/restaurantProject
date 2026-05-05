import { AsyncLocalStorage } from 'node:async_hooks'
import { randomUUID } from 'node:crypto'

type RequestContext = {
  requestId: string
  method?: string
  path?: string
}

const requestContext = new AsyncLocalStorage<RequestContext>()

export function getRequestId(): string | undefined {
  return requestContext.getStore()?.requestId
}

export function runWithRequestContext<T>(ctx: RequestContext, fn: () => T): T {
  return requestContext.run(ctx, fn)
}

function buildEntry(
  level: 'info' | 'warn' | 'error',
  message: string,
  meta?: Record<string, unknown>
): string {
  const ctx = requestContext.getStore()
  return JSON.stringify({
    level,
    message,
    requestId: ctx?.requestId,
    ...(meta ?? {}),
    time: new Date().toISOString(),
  })
}

export const logger = {
  info(message: string, meta?: Record<string, unknown>) {
    console.log(buildEntry('info', message, meta))
  },
  warn(message: string, meta?: Record<string, unknown>) {
    console.warn(buildEntry('warn', message, meta))
  },
  error(message: string, meta?: Record<string, unknown>) {
    console.error(buildEntry('error', message, meta))
  },
}

export function requestIdMiddleware(
  req: { method: string; path: string },
  _res: unknown,
  next: () => void
) {
  const ctx: RequestContext = {
    requestId: randomUUID(),
    method: req.method,
    path: req.path,
  }
  runWithRequestContext(ctx, next)
}
