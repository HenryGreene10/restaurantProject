import type { Router } from 'express'
import type { BrandConfig } from '@repo/brand-config'
import { createTenantDataAccess, createTenantScope } from '@repo/data-access'
import type { TenantRequest } from '../middleware/tenant.js'

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

function parseBrandConfig(body: unknown): BrandConfig {
  const payload =
    typeof body === 'object' && body !== null
      ? (body as Record<string, unknown>)
      : {}

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
    fontFamily: pickString(payload.fontFamily),
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
    heroImageUrl: pickString(payload.heroImageUrl),
    showFeaturedBadges: pickBoolean(payload.showFeaturedBadges),
    showCategoryChips: pickBoolean(payload.showCategoryChips),
  }
}

export function registerAdminBrandRoutes(r: Router) {
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
