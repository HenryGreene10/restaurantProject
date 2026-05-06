import { AsyncLocalStorage } from 'node:async_hooks'
import { randomUUID } from 'node:crypto'
import pino from 'pino'
import pinoHttp from 'pino-http'

type RequestContext = {
  requestId: string
}

const requestContext = new AsyncLocalStorage<RequestContext>()

export function getRequestId(): string | undefined {
  return requestContext.getStore()?.requestId
}

export function runWithRequestContext<T>(ctx: RequestContext, fn: () => T): T {
  return requestContext.run(ctx, fn)
}

const pinoInstance = pino({
  level: process.env.NODE_ENV === 'test' ? 'silent' : 'info',
})

export const logger = {
  info(message: string, meta?: Record<string, unknown>) {
    pinoInstance.info({ requestId: requestContext.getStore()?.requestId, ...meta }, message)
  },
  warn(message: string, meta?: Record<string, unknown>) {
    pinoInstance.warn({ requestId: requestContext.getStore()?.requestId, ...meta }, message)
  },
  error(message: string, meta?: Record<string, unknown>) {
    pinoInstance.error({ requestId: requestContext.getStore()?.requestId, ...meta }, message)
  },
}

export const httpLogger = pinoHttp({
  logger: pinoInstance,
  autoLogging: process.env.NODE_ENV !== 'test',
  genReqId: () => randomUUID(),
})

export function requestIdMiddleware(
  req: { id?: unknown; method: string; path: string },
  _res: unknown,
  next: () => void
) {
  const requestId = typeof req.id === 'string' ? req.id : randomUUID()
  requestContext.run({ requestId }, next)
}
