import { vi } from 'vitest'

// Prevent @sentry/node from making network calls or starting background workers
// when imported in test environments.
vi.mock('@sentry/node', () => ({
  init: vi.fn(),
  setupExpressErrorHandler: vi.fn((_app: unknown, _options?: unknown) => undefined),
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  withScope: vi.fn(),
  configureScope: vi.fn(),
  startTransaction: vi.fn(),
  getCurrentHub: vi.fn(() => ({ configureScope: vi.fn(), setUser: vi.fn() })),
}))

// Prevent groq-sdk from making network connections at import time.
// The assistant integration test stubs global fetch for Anthropic calls.
vi.mock('groq-sdk', () => ({
  default: class Groq {
    chat = {
      completions: {
        create: vi.fn().mockRejectedValue(new Error('groq-sdk not configured in tests')),
      },
    }
  },
}))
