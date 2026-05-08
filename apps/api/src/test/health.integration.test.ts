import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import type { Express } from 'express'

const mockCheckDatabaseConnection = vi.fn()

vi.mock('@clerk/backend', () => ({
  verifyToken: vi.fn().mockRejectedValue(new Error('Clerk not used in health tests')),
}))

vi.mock('@repo/data-access', () => ({
  createTenantScope: (restaurantId: string) => ({ restaurantId }),
  createPlatformDataAccess: () => ({
    findTenantByHost: vi.fn().mockResolvedValue(null),
  }),
  createTenantDataAccess: () => ({}),
  checkDatabaseConnection: mockCheckDatabaseConnection,
}))

describe('health endpoint', () => {
  let createApp!: () => Express

  beforeAll(async () => {
    await import('./setup')
    ;({ createApp } = await import('../app'))
  })

  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('returns 200 with db:true when the database is reachable', async () => {
    mockCheckDatabaseConnection.mockResolvedValue(true)

    const response = await request(createApp()).get('/health')

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({ ok: true, db: true })
    expect(response.body.time).toBeDefined()
  })

  it('returns 503 with db:false when the database is unreachable', async () => {
    mockCheckDatabaseConnection.mockResolvedValue(false)

    const response = await request(createApp()).get('/health')

    expect(response.status).toBe(503)
    expect(response.body).toMatchObject({ ok: false, db: false })
    expect(response.body.time).toBeDefined()
  })
})
