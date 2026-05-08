import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import type { Express } from 'express'

const mockFindTenantBySlug = vi.fn()
const mockFindAdminAccessByClerkUserId = vi.fn()
const mockVerifyToken = vi.fn()
const mockGetConfig = vi.fn()
const mockUpdateConfig = vi.fn()
const mockUploadImage = vi.fn()

vi.mock('@clerk/backend', () => ({ verifyToken: mockVerifyToken }))

vi.mock('../lib/r2.js', () => ({
  uploadImage: mockUploadImage,
}))

vi.mock('@repo/data-access', () => ({
  createTenantScope: (restaurantId: string) => ({ restaurantId }),
  createPlatformDataAccess: () => ({
    findTenantBySlug: mockFindTenantBySlug,
    findAdminAccessByClerkUserId: mockFindAdminAccessByClerkUserId,
  }),
  createTenantDataAccess: () => ({
    brand: {
      getConfig: mockGetConfig,
      updateConfig: mockUpdateConfig,
    },
    menu: {},
    customers: {},
    orders: {},
    payments: {},
    printing: {},
    loyalty: {},
  }),
}))

const ADMIN_ACCESS = {
  adminUserId: 'admin_1',
  clerkUserId: 'user_1',
  email: 'owner@demo.test',
  role: 'owner',
  restaurantId: 'rest_1',
  tenantSlug: 'demo',
  restaurantName: 'Demo Restaurant',
  subscriptionStatus: 'ACTIVE',
}

const BRAND_CONFIG = {
  appTitle: "Joe's Pizza",
  primaryColor: '#c25325',
}

describe('admin brand integration', () => {
  let createApp!: () => Express

  beforeAll(async () => {
    await import('./setup')
    ;({ createApp } = await import('../app'))
  })

  beforeEach(() => {
    vi.resetAllMocks()
    mockVerifyToken.mockResolvedValue({ sub: 'user_1' })
    mockFindTenantBySlug.mockResolvedValue({ id: 'rest_1', slug: 'demo' })
    mockFindAdminAccessByClerkUserId.mockResolvedValue(ADMIN_ACCESS)
    mockGetConfig.mockResolvedValue(BRAND_CONFIG)
    mockUpdateConfig.mockResolvedValue(BRAND_CONFIG)
  })

  describe('GET /admin/brand-config', () => {
    it('returns the brand config', async () => {
      const response = await request(createApp())
        .get('/admin/brand-config')
        .set('Authorization', 'Bearer clerk_token')
        .set('x-tenant-slug', 'demo')

      expect(response.status).toBe(200)
      expect(response.body.brandConfig.appTitle).toBe("Joe's Pizza")
    })

    it('returns 401 without auth', async () => {
      const response = await request(createApp())
        .get('/admin/brand-config')
        .set('x-tenant-slug', 'demo')

      expect(response.status).toBe(401)
    })
  })

  describe('PATCH /admin/brand-config', () => {
    it('updates and returns the brand config', async () => {
      const updated = { ...BRAND_CONFIG, appTitle: 'New Name' }
      mockUpdateConfig.mockResolvedValue(updated)

      const response = await request(createApp())
        .patch('/admin/brand-config')
        .set('Authorization', 'Bearer clerk_token')
        .set('x-tenant-slug', 'demo')
        .send({ appTitle: 'New Name' })

      expect(response.status).toBe(200)
      expect(mockUpdateConfig).toHaveBeenCalledWith(
        expect.objectContaining({ appTitle: 'New Name' })
      )
    })
  })

  describe('POST /admin/branding/upload-image', () => {
    it('uploads an image and returns the URL', async () => {
      mockUploadImage.mockResolvedValue('https://cdn.example.com/image.jpg')

      const response = await request(createApp())
        .post('/admin/branding/upload-image')
        .set('Authorization', 'Bearer clerk_token')
        .set('x-tenant-slug', 'demo')
        .attach('image', Buffer.from('fake-image-data'), {
          filename: 'logo.jpg',
          contentType: 'image/jpeg',
        })

      expect(response.status).toBe(200)
      expect(response.body.url).toBe('https://cdn.example.com/image.jpg')
    })

    it('returns 400 when no file is attached', async () => {
      const response = await request(createApp())
        .post('/admin/branding/upload-image')
        .set('Authorization', 'Bearer clerk_token')
        .set('x-tenant-slug', 'demo')

      expect(response.status).toBe(400)
    })

    it('returns 400 for a disallowed file type', async () => {
      const response = await request(createApp())
        .post('/admin/branding/upload-image')
        .set('Authorization', 'Bearer clerk_token')
        .set('x-tenant-slug', 'demo')
        .attach('image', Buffer.from('fake-gif-data'), {
          filename: 'logo.gif',
          contentType: 'image/gif',
        })

      expect(response.status).toBe(400)
    })
  })
})
