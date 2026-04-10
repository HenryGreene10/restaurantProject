import { randomUUID } from 'node:crypto'
import type { NextFunction, Response, Router } from 'express'
import type { BrandConfig } from '@repo/brand-config'
import { createTenantDataAccess, createTenantScope } from '@repo/data-access'
import type { TenantRequest } from '../middleware/tenant.js'
import multer from 'multer'
import { uploadImage } from '../lib/r2.js'

const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const allowedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])

const brandImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_IMAGE_BYTES,
  },
  fileFilter(_req, file, callback) {
    if (!allowedImageTypes.has(file.mimetype)) {
      callback(new Error('Only JPEG, PNG, and WebP images are allowed.'))
      return
    }

    callback(null, true)
  },
})

function tenantDataAccessFor(req: TenantRequest) {
  if (!req.tenant) {
    throw new Error('No tenant in request')
  }

  return createTenantDataAccess(createTenantScope(req.tenant.id))
}

function pickString(value: unknown) {
  return typeof value === 'string' ? value : undefined
}

function pickNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function pickBoolean(value: unknown) {
  return typeof value === 'boolean' ? value : undefined
}

function imageExtensionFor(contentType: string) {
  switch (contentType) {
    case 'image/jpeg':
      return 'jpg'
    case 'image/png':
      return 'png'
    case 'image/webp':
      return 'webp'
    default:
      throw new Error('Unsupported image type')
  }
}

function handleBrandImageUpload(
  req: TenantRequest,
  res: Response,
  next: NextFunction,
) {
  brandImageUpload.single('image')(req, res, (error: unknown) => {
    if (!error) {
      next()
      return
    }

    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({ error: 'Images must be 5MB or smaller.' })
      return
    }

    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to process image upload',
    })
  })
}

function parseBrandConfig(body: unknown): BrandConfig {
  const payload =
    typeof body === 'object' && body !== null
      ? (body as Record<string, unknown>)
      : {}

  const fontFamily = pickString(payload.fontFamily) ?? pickString(payload.bodyFont)
  const heroImageUrl =
    pickString(payload.heroImageUrl) ?? pickString(payload.bannerImageUrl)

  return {
    appTitle: pickString(payload.appTitle),
    tagline: pickString(payload.tagline),
    heroHeadline: pickString(payload.heroHeadline),
    heroSubheadline: pickString(payload.heroSubheadline),
    heroBadgeText: pickString(payload.heroBadgeText),
    promoBannerText: pickString(payload.promoBannerText),
    primaryColor: pickString(payload.primaryColor),
    accentColor: pickString(payload.accentColor),
    backgroundColor: pickString(payload.backgroundColor),
    surfaceColor: pickString(payload.surfaceColor),
    textColor: pickString(payload.textColor),
    mutedColor: pickString(payload.mutedColor),
    borderColor: pickString(payload.borderColor),
    onPrimary: pickString(payload.onPrimary),
    logoUrl: pickString(payload.logoUrl),
    fontFamily,
    headingFont: pickString(payload.headingFont),
    radius: pickNumber(payload.radius),
    buttonStyle:
      payload.buttonStyle === 'rounded' || payload.buttonStyle === 'square'
        ? payload.buttonStyle
        : undefined,
    heroLayout:
      payload.heroLayout === 'immersive' || payload.heroLayout === 'minimal'
        ? payload.heroLayout
        : undefined,
    menuCardLayout:
      payload.menuCardLayout === 'classic' ||
      payload.menuCardLayout === 'compact' ||
      payload.menuCardLayout === 'photo-first'
        ? payload.menuCardLayout
        : undefined,
    heroImageUrl,
    showFeaturedBadges: pickBoolean(payload.showFeaturedBadges),
    showCategoryChips: pickBoolean(payload.showCategoryChips),
  }
}

export function registerAdminBrandRoutes(r: Router) {
  r.post('/admin/branding/upload-image', handleBrandImageUpload, async (req: TenantRequest, res) => {
    try {
      if (!req.tenant) {
        throw new Error('No tenant in request')
      }

      const file = req.file
      if (!file) {
        return res.status(400).json({ error: 'Image file is required.' })
      }

      const extension = imageExtensionFor(file.mimetype)
      const key = `tenants/${req.tenant.slug}/${randomUUID()}.${extension}`
      const url = await uploadImage(file.buffer, key, file.mimetype)

      return res.json({ url })
    } catch (error) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to upload image',
      })
    }
  })

  r.get('/admin/brand-config', async (req: TenantRequest, res) => {
    try {
      const tenantDataAccess = tenantDataAccessFor(req)
      const brandConfig = await tenantDataAccess.brand.getConfig()
      return res.json({ brandConfig })
    } catch (error) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to load brand config',
      })
    }
  })

  r.patch('/admin/brand-config', async (req: TenantRequest, res) => {
    try {
      const tenantDataAccess = tenantDataAccessFor(req)
      const brandConfig = await tenantDataAccess.brand.updateConfig(
        parseBrandConfig(req.body),
      )
      return res.json({ brandConfig })
    } catch (error) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to update brand config',
      })
    }
  })
}
