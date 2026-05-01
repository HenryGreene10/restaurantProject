import { beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'

const mockFindTenantByHost = vi.fn()
const mockRequestCustomerOtp = vi.fn()
const mockVerifyCustomerOtp = vi.fn()
const mockIssueCustomerTokens = vi.fn()
const mockVerifyCustomerRefreshToken = vi.fn()
const mockUpsertByPhone = vi.fn()
const mockFindCustomerById = vi.fn()

// customer auth routes don't use Clerk, but clerk-auth.ts is imported
// transitively — mock it to prevent JWKS network calls at module load time.
vi.mock('@clerk/backend', () => ({
  verifyToken: vi.fn().mockRejectedValue(new Error('Clerk not used in customer auth tests')),
}))

vi.mock('@repo/auth', async () => {
  const actual = await vi.importActual<typeof import('@repo/auth')>('@repo/auth')
  return {
    ...actual,
    requestCustomerOtp: mockRequestCustomerOtp,
    verifyCustomerOtp: mockVerifyCustomerOtp,
    issueCustomerTokens: mockIssueCustomerTokens,
    verifyCustomerRefreshToken: mockVerifyCustomerRefreshToken
  }
})

vi.mock('@repo/data-access', () => ({
  createTenantScope: (restaurantId: string) => ({ restaurantId }),
  createPlatformDataAccess: () => ({
    findTenantByHost: mockFindTenantByHost
  }),
  createTenantDataAccess: () => ({
    customers: {
      upsertByPhone: mockUpsertByPhone,
      findById: mockFindCustomerById
    },
    menu: {},
    orders: {}
  })
}))

describe('customer auth integration', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockFindTenantByHost.mockResolvedValue({
      id: 'rest_1',
      slug: 'demo'
    })
  })

  it('requests an OTP for the tenant', async () => {
    await import('./setup')
    const { createApp } = await import('../app')

    mockRequestCustomerOtp.mockResolvedValue(undefined)

    const response = await request(createApp())
      .post('/auth/customer/request-otp')
      .set('Host', 'demo.example.com')
      .send({ phone: '+15555550123' })

    expect(response.status).toBe(202)
    expect(mockRequestCustomerOtp).toHaveBeenCalledTimes(1)
  })

  it('verifies an OTP, persists the customer, and returns tokens', async () => {
    await import('./setup')
    const { createApp } = await import('../app')

    mockVerifyCustomerOtp.mockResolvedValue(true)
    mockUpsertByPhone.mockResolvedValue({
      id: 'cust_1',
      phone: '+15555550123'
    })
    mockIssueCustomerTokens.mockReturnValue({
      accessToken: 'access_123',
      refreshToken: 'refresh_123'
    })

    const response = await request(createApp())
      .post('/auth/customer/verify-otp')
      .set('Host', 'demo.example.com')
      .send({ phone: '+15555550123', code: '123456' })

    expect(response.status).toBe(200)
    expect(mockUpsertByPhone).toHaveBeenCalledWith({
      phone: '+15555550123'
    })
    expect(mockIssueCustomerTokens).toHaveBeenCalledWith(
      expect.any(Object),
      {
        customerId: 'cust_1',
        restaurantId: 'rest_1',
        phone: '+15555550123'
      }
    )
    expect(response.body.accessToken).toBe('access_123')
    expect(response.headers['set-cookie']).toBeDefined()
  })

  it('refreshes only when the tenant-scoped customer still exists', async () => {
    await import('./setup')
    const { createApp } = await import('../app')

    mockVerifyCustomerRefreshToken.mockReturnValue({
      sub: 'cust_1',
      customerId: 'cust_1',
      restaurantId: 'rest_1',
      phone: '+15555550123',
      type: 'customer-refresh'
    })
    mockFindCustomerById.mockResolvedValue({
      id: 'cust_1',
      phone: '+15555550123'
    })
    mockIssueCustomerTokens.mockReturnValue({
      accessToken: 'access_456',
      refreshToken: 'refresh_456'
    })

    const response = await request(createApp())
      .post('/auth/customer/refresh')
      .set('Host', 'demo.example.com')
      .set('Cookie', 'customer_refresh_token=refresh_123')

    expect(response.status).toBe(200)
    expect(mockFindCustomerById).toHaveBeenCalledWith('cust_1')
    expect(response.body.accessToken).toBe('access_456')
  })
})
