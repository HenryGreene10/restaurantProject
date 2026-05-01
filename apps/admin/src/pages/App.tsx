import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { UserButton, useAuth, useClerk, useUser } from '@clerk/react'
import {
  DndContext,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Search,
  BarChart3,
  Bot,
  CheckCircle2,
  Clock3,
  CreditCard,
  ExternalLink,
  Eye,
  EyeOff,
  ImageIcon,
  LayoutDashboard,
  LogOut,
  Palette,
  Printer,
  ShoppingCart,
  Sparkles,
  Star,
  Store,
  Trash2,
} from 'lucide-react'

import { AssistantPanel } from '../assistant/AssistantPanel'
import {
  fetchTenantMenu,
  isCategoryAvailableNow,
  type MenuCategory,
  type MenuResponse,
} from '../lib/menu'
import { adminFetchJson, adminUploadFileJson } from '../lib/api'
import { OnboardingPage } from './OnboardingPage'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

type ThemeDraft = {
  appTitle: string
  tagline: string
  logoUrl: string
  heroHeadline: string
  heroSubheadline: string
  heroBadgeText: string
  promoBannerText: string
  heroImageUrl: string
  primaryColor: string
  accentColor: string
  backgroundColor: string
  surfaceColor: string
  textColor: string
  mutedColor: string
  borderColor: string
  onPrimary: string
  bodyFont: string
  headingFont: string
  radius: number
  buttonStyle: 'rounded' | 'square'
  heroLayout: 'immersive' | 'minimal'
  menuCardLayout: 'classic' | 'compact' | 'photo-first'
  showFeaturedBadges: boolean
  showCategoryChips: boolean
}

type StripeStatus = {
  configured: boolean
  displayName: string
  stripeAccountId: string | null
  chargesEnabled: boolean
  payoutsEnabled: boolean
  status: 'not_connected' | 'onboarding_required' | 'active'
}

type PrintingSettings = {
  enabled: boolean
  macAddress: string | null
}

const defaultThemeDraft: ThemeDraft = {
  appTitle: 'Restaurant',
  tagline: 'Direct ordering, owned by the restaurant.',
  logoUrl: '',
  heroHeadline: 'Neighborhood favorites without marketplace markup.',
  heroSubheadline: 'Make repeat visits easier with direct ordering and better menu presentation.',
  heroBadgeText: 'Direct ordering',
  promoBannerText: 'Give loyal customers a direct-order reward funded by marketplace savings.',
  heroImageUrl: '',
  primaryColor: '#b42318',
  accentColor: '#eca934',
  backgroundColor: '#faf7f2',
  surfaceColor: '#fffcf7',
  textColor: '#271c17',
  mutedColor: '#745e54',
  borderColor: '#e8dcd1',
  onPrimary: '#fff7ed',
  bodyFont: 'Inter, sans-serif',
  headingFont: 'Georgia, serif',
  radius: 12,
  buttonStyle: 'rounded',
  heroLayout: 'minimal',
  menuCardLayout: 'photo-first',
  showFeaturedBadges: true,
  showCategoryChips: true,
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function getBrandConfig(menu: MenuResponse) {
  const nested = asRecord(menu.brand)
  return asRecord(menu.brandConfig?.config) ?? asRecord(nested?.config) ?? nested ?? {}
}

function getString(config: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = config[key]
    if (typeof value === 'string') {
      return value
    }
  }

  return undefined
}

function buildDraft(menu: MenuResponse): ThemeDraft {
  const config = getBrandConfig(menu)
  const primaryColor = getString(config, 'primaryColor') ?? defaultThemeDraft.primaryColor
  const backgroundColor = getString(config, 'backgroundColor') ?? defaultThemeDraft.backgroundColor
  const accentColor = getString(config, 'accentColor') ?? derivedAccentColor(primaryColor)
  const surfaceColor = getString(config, 'surfaceColor') ?? defaultThemeDraft.surfaceColor
  const textColor = getString(config, 'textColor') ?? defaultThemeDraft.textColor
  const mutedColor = getString(config, 'mutedColor') ?? defaultThemeDraft.mutedColor
  const borderColor =
    getString(config, 'borderColor') ?? derivedBorderColor(primaryColor, backgroundColor)

  return {
    ...defaultThemeDraft,
    appTitle: getString(config, 'appTitle') ?? defaultThemeDraft.appTitle,
    tagline: getString(config, 'tagline') ?? defaultThemeDraft.tagline,
    logoUrl: getString(config, 'logoUrl') ?? defaultThemeDraft.logoUrl,
    heroHeadline: getString(config, 'heroHeadline') ?? defaultThemeDraft.heroHeadline,
    heroSubheadline: getString(config, 'heroSubheadline') ?? defaultThemeDraft.heroSubheadline,
    heroBadgeText: getString(config, 'heroBadgeText') ?? defaultThemeDraft.heroBadgeText,
    promoBannerText: getString(config, 'promoBannerText') ?? defaultThemeDraft.promoBannerText,
    heroImageUrl: getString(config, 'heroImageUrl') ?? defaultThemeDraft.heroImageUrl,
    primaryColor,
    accentColor,
    backgroundColor,
    surfaceColor,
    textColor,
    mutedColor,
    borderColor,
    onPrimary: getString(config, 'onPrimary') ?? defaultThemeDraft.onPrimary,
    bodyFont: getString(config, 'fontFamily', 'bodyFont') ?? defaultThemeDraft.bodyFont,
    headingFont: getString(config, 'headingFont') ?? defaultThemeDraft.headingFont,
    radius: defaultThemeDraft.radius,
    buttonStyle: defaultThemeDraft.buttonStyle,
    heroLayout: defaultThemeDraft.heroLayout,
    menuCardLayout: defaultThemeDraft.menuCardLayout,
    showFeaturedBadges: defaultThemeDraft.showFeaturedBadges,
    showCategoryChips: defaultThemeDraft.showCategoryChips,
  }
}

type AdminSection =
  | 'overview'
  | 'branding'
  | 'menu'
  | 'loyalty'
  | 'insights'
  | 'payments'
  | 'assistant'
type ThemeChangeHandler = <K extends keyof ThemeDraft>(key: K, value: ThemeDraft[K]) => void
type CategoryItemEntry = MenuCategory['categoryItems'][number]
type BrandingImageField = 'logoUrl' | 'heroImageUrl'
type OverviewOrder = {
  id: string
  createdAt: string
}

type InsightsSummary = {
  ordersThisMonth: number
  revenueThisMonth: number
  averageOrderValue: number
  totalCustomers: number
  repeatCustomers: number
  ordersLastMonth: number
  revenueLastMonth: number
}

type InsightsOrdersOverTimePoint = {
  date: string
  orders: number
  revenue: number
}

type InsightsTopItem = {
  itemName: string
  orderCount: number
  revenue: number
}

type InsightsNeverOrderedItem = {
  itemName: string
  categoryName: string
  daysOnMenu: number
}

type InsightsPeakHour = {
  hour: number
  orders: number
}

type InsightsPeakDay = {
  day: string
  orders: number
}

type InsightsOrderComposition = {
  averageItemsPerOrder: number
  singleItemOrders: number
  multiItemOrders: number
}

type InsightsData = {
  summary: InsightsSummary
  ordersOverTime: InsightsOrdersOverTimePoint[]
  topItems: InsightsTopItem[]
  neverOrdered: InsightsNeverOrderedItem[]
  peakHours: InsightsPeakHour[]
  peakDays: InsightsPeakDay[]
  orderComposition: InsightsOrderComposition
}

function currentAdminPath() {
  return window.location.pathname
}

function localHostname(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0'
}

function storefrontUrlForTenant(tenantSlug: string) {
  if (typeof window === 'undefined') {
    return `https://${tenantSlug}.easymenu.website`
  }

  const hostname = window.location.hostname.toLowerCase()
  const protocol = window.location.protocol

  if (localHostname(hostname)) {
    return `http://localhost:5173/?tenant=${encodeURIComponent(tenantSlug)}`
  }

  if (hostname.endsWith('.easymenu.website')) {
    return `${protocol}//${tenantSlug}.easymenu.website`
  }

  return `https://${tenantSlug}.easymenu.website`
}

function kioskUrl(tenantSlug: string) {
  if (typeof window === 'undefined') {
    return `https://${tenantSlug}.kitchen.easymenu.website`
  }

  const hostname = window.location.hostname.toLowerCase()

  if (localHostname(hostname)) {
    return `http://localhost:5175/?tenant=${encodeURIComponent(tenantSlug)}`
  }

  return `https://${tenantSlug}.kitchen.easymenu.website`
}

function areThemesEqual(left: ThemeDraft, right: ThemeDraft) {
  return JSON.stringify(left) === JSON.stringify(right)
}

function themePayload(theme: ThemeDraft) {
  const backgroundColor = theme.backgroundColor
  const accentColor = theme.accentColor
  const borderColor = theme.borderColor

  return {
    appTitle: theme.appTitle,
    tagline: theme.tagline,
    logoUrl: theme.logoUrl,
    heroHeadline: theme.heroHeadline,
    heroSubheadline: theme.heroSubheadline,
    heroBadgeText: theme.heroBadgeText,
    promoBannerText: theme.promoBannerText,
    heroImageUrl: theme.heroImageUrl,
    primaryColor: theme.primaryColor,
    accentColor,
    backgroundColor,
    surfaceColor: theme.surfaceColor,
    textColor: theme.textColor,
    mutedColor: theme.mutedColor,
    borderColor,
    onPrimary: theme.onPrimary,
    fontFamily: theme.bodyFont,
    headingFont: theme.headingFont,
    radius: defaultThemeDraft.radius,
    buttonStyle: defaultThemeDraft.buttonStyle,
    heroLayout: defaultThemeDraft.heroLayout,
    menuCardLayout: defaultThemeDraft.menuCardLayout,
    showFeaturedBadges: defaultThemeDraft.showFeaturedBadges,
    showCategoryChips: defaultThemeDraft.showCategoryChips,
  }
}

const FONT_OPTIONS = [
  { label: 'Inter', value: '"Inter", sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Playfair Display', value: '"Playfair Display", serif' },
  { label: 'Lora', value: '"Lora", serif' },
  { label: 'Merriweather', value: '"Merriweather", serif' },
  { label: 'Raleway', value: '"Raleway", sans-serif' },
  { label: 'Montserrat', value: '"Montserrat", sans-serif' },
  { label: 'Nunito', value: '"Nunito", sans-serif' },
  { label: 'DM Sans', value: '"DM Sans", sans-serif' },
  { label: 'DM Serif Display', value: '"DM Serif Display", serif' },
  { label: 'Fraunces', value: '"Fraunces", serif' },
  { label: 'Cabinet Grotesk', value: '"Cabinet Grotesk", sans-serif' },
  { label: 'Plus Jakarta Sans', value: '"Plus Jakarta Sans", sans-serif' },
  { label: 'Libre Baskerville', value: '"Libre Baskerville", serif' },
  { label: 'Cormorant Garamond', value: '"Cormorant Garamond", serif' },
] as const

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace('#', '').trim()
  const expanded =
    normalized.length === 3
      ? normalized
          .split('')
          .map((char) => `${char}${char}`)
          .join('')
      : normalized

  const value = Number.parseInt(expanded, 16)
  const red = (value >> 16) & 255
  const green = (value >> 8) & 255
  const blue = value & 255

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`
}

function parseHexColor(hex: string) {
  const normalized = hex.replace('#', '').trim()
  const expanded =
    normalized.length === 3
      ? normalized
          .split('')
          .map((char) => `${char}${char}`)
          .join('')
      : normalized

  const value = Number.parseInt(expanded, 16)

  return {
    red: (value >> 16) & 255,
    green: (value >> 8) & 255,
    blue: value & 255,
  }
}

function toHexColor(red: number, green: number, blue: number) {
  return `#${[red, green, blue]
    .map((value) =>
      Math.max(0, Math.min(255, Math.round(value)))
        .toString(16)
        .padStart(2, '0')
    )
    .join('')}`
}

function mixHexColors(base: string, overlay: string, alpha: number) {
  const background = parseHexColor(base)
  const foreground = parseHexColor(overlay)

  return toHexColor(
    background.red * (1 - alpha) + foreground.red * alpha,
    background.green * (1 - alpha) + foreground.green * alpha,
    background.blue * (1 - alpha) + foreground.blue * alpha
  )
}

function derivedAccentColor(primaryColor: string) {
  return mixHexColors(defaultThemeDraft.backgroundColor, primaryColor, 0.18)
}

function derivedBorderColor(primaryColor: string, backgroundColor: string) {
  return mixHexColors(backgroundColor, primaryColor, 0.24)
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
        return
      }

      reject(new Error('Failed to read file'))
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

function formatPrice(priceCents: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(priceCents / 100)
}

function formatUsd(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

function formatSignedPercentChange(current: number, previous: number) {
  if (previous === 0) {
    if (current === 0) {
      return { label: '0%', tone: 'neutral' as const }
    }

    return { label: 'New', tone: 'positive' as const }
  }

  const delta = ((current - previous) / previous) * 100
  const prefix = delta > 0 ? '+' : ''

  return {
    label: `${prefix}${delta.toFixed(0)}%`,
    tone:
      delta > 0 ? ('positive' as const) : delta < 0 ? ('negative' as const) : ('neutral' as const),
  }
}

function shortDateLabel(value: string) {
  const date = new Date(`${value}T00:00:00`)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

function tenantSlugFromMetadata(value: unknown) {
  if (typeof value !== 'string') {
    return null
  }

  const nextValue = value.trim()
  return nextValue.length > 0 ? nextValue : null
}

function previewCategories(categories: MenuCategory[]) {
  return categories
    .filter((category) => category.visibility !== 'HIDDEN' && isCategoryAvailableNow(category))
    .map((category) => ({
      ...category,
      categoryItems: category.categoryItems.filter((entry) => entry.item.visibility !== 'HIDDEN'),
    }))
    .filter((category) => category.categoryItems.length > 0)
}

function previewStyle(theme: ThemeDraft): React.CSSProperties {
  const backgroundColor = theme.backgroundColor
  const accentColor = theme.accentColor
  const borderColor = theme.borderColor

  return {
    ['--preview-primary' as string]: theme.primaryColor,
    ['--preview-accent' as string]: accentColor,
    ['--preview-background' as string]: backgroundColor,
    ['--preview-surface' as string]: theme.surfaceColor,
    ['--preview-text' as string]: theme.textColor,
    ['--preview-muted' as string]: theme.mutedColor,
    ['--preview-border' as string]: borderColor,
    ['--preview-on-primary' as string]: theme.onPrimary,
    ['--preview-radius' as string]: `${defaultThemeDraft.radius}px`,
    ['--preview-body-font' as string]: theme.bodyFont,
    ['--preview-heading-font' as string]: theme.headingFont,
  } as React.CSSProperties
}

const scheduleDayOrder = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const

const scheduleDayLabels: Record<(typeof scheduleDayOrder)[number], string> = {
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
  saturday: 'Sat',
  sunday: 'Sun',
}

const scheduleTimeFormatter = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
  timeZone: 'UTC',
})

function parseUtcScheduleDate(value?: string | null) {
  if (!value) {
    return null
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  return parsed
}

function formatScheduleTime(value?: string | null) {
  const parsed = parseUtcScheduleDate(value)
  return parsed ? scheduleTimeFormatter.format(parsed) : null
}

function scheduleTimeInputValue(value?: string | null) {
  const parsed = parseUtcScheduleDate(value)
  if (!parsed) {
    return ''
  }

  const hours = String(parsed.getUTCHours()).padStart(2, '0')
  const minutes = String(parsed.getUTCMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

function scheduleTimeInputToIso(value: string) {
  if (!value) {
    return null
  }

  const [hoursString, minutesString] = value.split(':')
  const hours = Number(hoursString)
  const minutes = Number(minutesString)

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null
  }

  return new Date(Date.UTC(1970, 0, 1, hours, minutes, 0, 0)).toISOString()
}

function formatScheduleDays(days?: string[] | null) {
  const normalized = (days ?? [])
    .map((day) => day.trim().toLowerCase())
    .filter((day): day is (typeof scheduleDayOrder)[number] =>
      scheduleDayOrder.includes(day as (typeof scheduleDayOrder)[number])
    )

  if (normalized.length === 0 || normalized.length === scheduleDayOrder.length) {
    return 'Every day'
  }

  const indexes = [...new Set(normalized.map((day) => scheduleDayOrder.indexOf(day)))].sort(
    (left, right) => left - right
  )
  const ranges: string[] = []

  for (let index = 0; index < indexes.length; index += 1) {
    const start = indexes[index]
    let end = start

    while (index + 1 < indexes.length && indexes[index + 1] === end + 1) {
      end = indexes[index + 1]
      index += 1
    }

    ranges.push(
      start === end
        ? scheduleDayLabels[scheduleDayOrder[start]]
        : `${scheduleDayLabels[scheduleDayOrder[start]]}\u2013${scheduleDayLabels[scheduleDayOrder[end]]}`
    )
  }

  return ranges.join(', ')
}

function formatCategorySchedule(category: MenuCategory) {
  const from = formatScheduleTime(category.availableFrom)
  const until = formatScheduleTime(category.availableUntil)
  const days = formatScheduleDays(category.daysOfWeek)

  if (from && until) {
    return `${days} · ${from} – ${until}`
  }

  if (from) {
    return `${days} · From ${from}`
  }

  if (until) {
    return `${days} · Until ${until}`
  }

  return days
}

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <Card className="gap-0 border border-border/80 bg-card py-0 shadow-sm">
      <CardHeader className="gap-1 border-b border-border/70 px-6 py-5">
        <CardTitle>{title}</CardTitle>
        {subtitle ? <CardDescription>{subtitle}</CardDescription> : null}
      </CardHeader>
      <CardContent className="px-6 py-6">{children}</CardContent>
    </Card>
  )
}

function PreviewPane({ theme, categories }: { theme: ThemeDraft; categories: MenuCategory[] }) {
  const visible = previewCategories(categories)
  const featured = visible.flatMap((category) =>
    category.categoryItems.map((entry) => entry.item).filter((item) => item.isFeatured)
  )
  const totalItemCount = visible.reduce((sum, category) => sum + category.categoryItems.length, 0)
  const shellRadius = 24

  return (
    <div
      className="min-h-[860px] rounded-[calc(var(--radius)*1.2)] border border-border/70 bg-card p-5 shadow-sm"
      style={{
        ...previewStyle(theme),
        fontFamily: 'var(--preview-body-font)',
      }}
    >
      <div
        style={{
          minHeight: '100%',
          borderRadius: '28px',
          background: 'var(--preview-background)',
          color: 'var(--preview-text)',
          padding: 20,
          boxShadow: 'var(--shadow-brand)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            justifyContent: 'space-between',
            marginBottom: 16,
            padding: '2px 4px 0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
            {theme.logoUrl ? (
              <img
                src={theme.logoUrl}
                alt={theme.appTitle}
                style={{ height: 28, width: 'auto', maxWidth: 80, objectFit: 'contain' }}
              />
            ) : (
              <div
                style={{
                  color: 'var(--preview-primary)',
                  fontFamily: 'var(--preview-heading-font)',
                  fontWeight: 800,
                  fontSize: 24,
                  lineHeight: 1,
                }}
              >
                {theme.appTitle}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
              <span
                style={{
                  color: 'var(--preview-primary)',
                  fontSize: 12,
                  fontWeight: 700,
                  borderBottom: '2px solid var(--preview-primary)',
                  paddingBottom: 4,
                }}
              >
                Discover
              </span>
              <span style={{ color: 'var(--preview-muted)', fontSize: 12 }}>Orders</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                borderRadius: 9999,
                border: '1px solid var(--preview-border)',
                background: 'var(--preview-surface)',
                color: 'var(--preview-muted)',
                padding: '8px 12px',
                minWidth: 180,
              }}
            >
              <Search className="h-4 w-4" />
              <span style={{ fontSize: 12 }}>Search for dishes...</span>
            </div>
            <div style={{ color: 'var(--preview-primary)' }}>
              <ShoppingCart className="h-4 w-4" />
            </div>
          </div>
        </div>

        <div
          style={{
            borderRadius: shellRadius,
            padding: 0,
            background: theme.heroImageUrl
              ? `linear-gradient(to top, rgba(0,0,0,0.78), rgba(0,0,0,0.12)), url(${theme.heroImageUrl}) center/cover`
              : `linear-gradient(135deg, ${hexToRgba(theme.primaryColor, 0.4)}, ${hexToRgba(theme.accentColor, 0.26)}), var(--preview-surface)`,
            border: '1px solid var(--preview-border)',
            display: 'grid',
            minHeight: 260,
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 'auto 0 0 0',
              padding: 24,
              display: 'grid',
              gap: 12,
            }}
          >
            <h1
              style={{
                margin: 0,
                fontFamily: 'var(--preview-heading-font)',
                fontSize: 44,
                lineHeight: 0.95,
                fontWeight: 700,
                maxWidth: 540,
                color: '#fff7ed',
              }}
            >
              {theme.heroHeadline}
            </h1>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                flexWrap: 'wrap',
                color: '#fff7ed',
                fontSize: 13,
              }}
            >
              {theme.heroBadgeText.trim() ? (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    borderRadius: 9999,
                    padding: '7px 12px',
                    background: hexToRgba(theme.accentColor, 0.18),
                    border: `1px solid ${hexToRgba(theme.accentColor, 0.34)}`,
                  }}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  {theme.heroBadgeText}
                </span>
              ) : null}
              <span>{visible.length} categories</span>
              <span style={{ opacity: 0.6 }}>•</span>
              <span>{totalItemCount} dishes</span>
            </div>
          </div>
        </div>

        {theme.showCategoryChips ? (
          <div
            style={{
              marginTop: 16,
              display: 'flex',
              gap: 10,
              overflowX: 'auto',
              paddingBottom: 4,
            }}
          >
            {visible.map((category, index) => (
              <span
                key={category.id}
                style={{
                  whiteSpace: 'nowrap',
                  borderRadius: 9999,
                  padding: '10px 18px',
                  fontSize: 13,
                  fontWeight: 500,
                  background:
                    index === 0 ? 'var(--preview-primary)' : hexToRgba(theme.textColor, 0.06),
                  color: index === 0 ? 'var(--preview-on-primary)' : 'var(--preview-text)',
                  boxShadow:
                    index === 0 ? `0 10px 24px ${hexToRgba(theme.primaryColor, 0.24)}` : 'none',
                }}
              >
                {category.name}
              </span>
            ))}
          </div>
        ) : null}

        {theme.promoBannerText ? (
          <div
            style={{
              marginTop: 16,
              borderRadius: 18,
              background: `linear-gradient(135deg, ${theme.primaryColor}, ${hexToRgba(theme.primaryColor, 0.88)})`,
              color: theme.onPrimary,
              padding: '14px 16px',
              fontSize: 14,
              lineHeight: 1.55,
            }}
          >
            {theme.promoBannerText}
          </div>
        ) : null}

        {featured.length > 0 ? (
          <section style={{ display: 'grid', gap: 16, marginTop: 24 }}>
            <div style={{ display: 'grid', gap: 6 }}>
              <div
                style={{
                  color: 'var(--preview-muted)',
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                }}
              >
                Featured
              </div>
              <h2
                style={{
                  margin: 0,
                  fontFamily: 'var(--preview-heading-font)',
                  fontSize: 32,
                  fontWeight: 700,
                }}
              >
                Featured Items
              </h2>
            </div>

            <div style={{ display: 'grid', gap: 16 }}>
              {featured.slice(0, 2).map((item) => (
                <PreviewMenuCard
                  key={`featured-${item.id}`}
                  item={item}
                  theme={theme}
                  featured={theme.showFeaturedBadges}
                />
              ))}
            </div>
          </section>
        ) : null}

        <div style={{ display: 'grid', gap: 24, marginTop: 24 }}>
          {visible.map((category) => (
            <section key={category.id} style={{ display: 'grid', gap: 12 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 16,
                }}
              >
                <h2
                  style={{
                    margin: 0,
                    fontFamily: 'var(--preview-heading-font)',
                    fontSize: 28,
                    fontWeight: 700,
                  }}
                >
                  {category.name}
                </h2>
                <span style={{ color: 'var(--preview-muted)', fontSize: 13 }}>
                  {category.categoryItems.length} items
                </span>
              </div>

              <div style={{ display: 'grid', gap: 16 }}>
                {category.categoryItems.map(({ id, item }) => (
                  <PreviewMenuCard
                    key={id}
                    item={item}
                    theme={theme}
                    featured={theme.showFeaturedBadges && item.isFeatured}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}

function PreviewMenuCard({
  item,
  theme,
  featured,
}: {
  item: MenuCategory['categoryItems'][number]['item']
  theme: ThemeDraft
  featured: boolean
}) {
  return (
    <article
      style={{
        borderRadius: 24,
        padding: 16,
        border: '1px solid var(--preview-border)',
        background: 'var(--preview-surface)',
        display: 'grid',
        gap: 14,
        opacity: item.visibility === 'SOLD_OUT' ? 0.76 : 1,
        boxShadow: `0 8px 24px ${hexToRgba(theme.textColor, 0.06)}`,
      }}
    >
      <div
        style={{
          minHeight: 168,
          borderRadius: 18,
          border: '1px solid var(--preview-border)',
          background: item.photoUrl
            ? `url(${item.photoUrl}) center/cover`
            : `linear-gradient(135deg, ${hexToRgba(theme.primaryColor, 0.16)}, ${hexToRgba(theme.accentColor, 0.14)})`,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {featured ? (
          <span
            style={{
              position: 'absolute',
              top: 10,
              right: 10,
              borderRadius: 9999,
              background: 'var(--preview-primary)',
              color: 'var(--preview-on-primary)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              padding: '5px 9px',
            }}
          >
            Popular
          </span>
        ) : null}
      </div>

      <div style={{ display: 'grid', gap: 10 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 16,
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 600,
              fontFamily: 'var(--preview-heading-font)',
              lineHeight: 1.2,
            }}
          >
            {item.name}
          </h3>
          <strong style={{ color: 'var(--preview-primary)', whiteSpace: 'nowrap' }}>
            {formatPrice(item.variants[0]?.priceCents ?? item.basePriceCents)}
          </strong>
        </div>

        {item.description ? (
          <p
            style={{
              margin: 0,
              color: 'var(--preview-muted)',
              lineHeight: 1.6,
              fontSize: 13,
            }}
          >
            {item.description}
          </p>
        ) : null}

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {item.tags.slice(0, 1).map((tag) => (
              <span
                key={tag}
                style={{
                  borderRadius: 9999,
                  background: hexToRgba(theme.textColor, 0.05),
                  color: 'var(--preview-muted)',
                  fontSize: 12,
                  padding: '6px 10px',
                }}
              >
                {tag}
              </span>
            ))}
          </div>

          {item.visibility === 'SOLD_OUT' ? (
            <span style={{ color: 'var(--preview-muted)', fontSize: 13 }}>Sold out</span>
          ) : (
            <button
              type="button"
              style={{
                width: 40,
                height: 40,
                borderRadius: 9999,
                border: '1px solid transparent',
                background:
                  'linear-gradient(135deg, var(--preview-primary), var(--preview-accent))',
                color: 'var(--preview-on-primary)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: `0 10px 24px ${hexToRgba(theme.primaryColor, 0.24)}`,
              }}
            >
              <ShoppingCart className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </article>
  )
}

export const App: React.FC = () => {
  const { getToken } = useAuth()
  const { signOut } = useClerk()
  const { isLoaded, user } = useUser()
  const tenantSlug = tenantSlugFromMetadata(user?.publicMetadata?.tenantSlug)
  const linkedTenantSlug = tenantSlug ?? ''
  const [pathname, setPathname] = useState(currentAdminPath)
  const [menuData, setMenuData] = useState<MenuResponse | null>(null)
  const [savedTheme, setSavedTheme] = useState<ThemeDraft>(defaultThemeDraft)
  const [draftTheme, setDraftTheme] = useState<ThemeDraft>(defaultThemeDraft)
  const isThemeDirty = useMemo(
    () => !areThemesEqual(savedTheme, draftTheme),
    [draftTheme, savedTheme]
  )
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [menuActionMessage, setMenuActionMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [stripeStatus, setStripeStatus] = useState<StripeStatus | null>(null)
  const [stripeMessage, setStripeMessage] = useState<string | null>(null)
  const [isStripeLoading, setIsStripeLoading] = useState(true)
  const [isStripeLaunching, setIsStripeLaunching] = useState(false)
  const [printingSettings, setPrintingSettings] = useState<PrintingSettings>({
    enabled: false,
    macAddress: '',
  })
  const [savedPrintingSettings, setSavedPrintingSettings] = useState<PrintingSettings>({
    enabled: false,
    macAddress: '',
  })
  const [printingMessage, setPrintingMessage] = useState<string | null>(null)
  const [isPrintingLoading, setIsPrintingLoading] = useState(true)
  const [isPrintingSaving, setIsPrintingSaving] = useState(false)
  const [isBrandingUploadInProgress, setIsBrandingUploadInProgress] = useState(false)
  const [activeSection, setActiveSection] = useState<AdminSection>('overview')
  const [overviewOrdersToday, setOverviewOrdersToday] = useState(0)
  const [isOverviewLoading, setIsOverviewLoading] = useState(true)
  const [insightsData, setInsightsData] = useState<InsightsData | null>(null)
  const [isInsightsLoading, setIsInsightsLoading] = useState(false)
  const [insightsError, setInsightsError] = useState<string | null>(null)

  const handleOnboardingCompleted = useCallback(async () => {
    await user?.reload()
    window.location.assign('/')
  }, [user])

  useEffect(() => {
    function handlePopState() {
      setPathname(currentAdminPath())
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    if (!isLoaded) {
      return
    }

    if (!tenantSlug && pathname !== '/signup') {
      window.history.replaceState({}, '', '/signup')
      setPathname('/signup')
      return
    }

    if (tenantSlug && pathname === '/signup') {
      window.history.replaceState({}, '', '/')
      setPathname('/')
    }
  }, [isLoaded, pathname, tenantSlug])

  async function patchAdminJson<T>(path: string, body: unknown) {
    return adminFetchJson<T>(path, {
      method: 'PATCH',
      tenantSlug: linkedTenantSlug,
      getToken,
      body,
    })
  }

  async function postAdminJson<T>(path: string, body: unknown) {
    return adminFetchJson<T>(path, {
      method: 'POST',
      tenantSlug: linkedTenantSlug,
      getToken,
      body,
    })
  }

  async function uploadBrandingImage(file: File, onProgress?: (progressPercent: number) => void) {
    if (!tenantSlug) {
      throw new Error('Your account is not linked to a restaurant. Contact support.')
    }

    setSaveMessage(null)
    setIsBrandingUploadInProgress(true)

    try {
      const response = await adminUploadFileJson<{ url: string }>('/admin/branding/upload-image', {
        file,
        getToken,
        onProgress,
        tenantSlug: linkedTenantSlug,
      })

      return response.url
    } finally {
      setIsBrandingUploadInProgress(false)
    }
  }

  async function deleteAdmin(path: string) {
    await adminFetchJson<void>(path, {
      method: 'DELETE',
      tenantSlug: linkedTenantSlug,
      getToken,
    })
  }

  async function loadStripeStatus() {
    return adminFetchJson<StripeStatus>('/admin/payments/stripe/status', {
      tenantSlug: linkedTenantSlug,
      getToken,
    })
  }

  async function loadPrintingSettings() {
    return adminFetchJson<PrintingSettings>('/admin/restaurant/printing', {
      tenantSlug: linkedTenantSlug,
      getToken,
    })
  }

  async function loadOverviewOrders() {
    return adminFetchJson<{ orders: OverviewOrder[] }>('/v1/kitchen/orders', {
      tenantSlug: linkedTenantSlug,
      getToken,
    })
  }

  async function loadInsights() {
    const [summary, ordersOverTime, topItems, neverOrdered, peakHours, peakDays, orderComposition] =
      await Promise.all([
        adminFetchJson<InsightsSummary>('/admin/insights/summary', {
          tenantSlug: linkedTenantSlug,
          getToken,
        }),
        adminFetchJson<InsightsOrdersOverTimePoint[]>('/admin/insights/orders-over-time', {
          tenantSlug: linkedTenantSlug,
          getToken,
        }),
        adminFetchJson<InsightsTopItem[]>('/admin/insights/top-items', {
          tenantSlug: linkedTenantSlug,
          getToken,
        }),
        adminFetchJson<InsightsNeverOrderedItem[]>('/admin/insights/never-ordered', {
          tenantSlug: linkedTenantSlug,
          getToken,
        }),
        adminFetchJson<InsightsPeakHour[]>('/admin/insights/peak-hours', {
          tenantSlug: linkedTenantSlug,
          getToken,
        }),
        adminFetchJson<InsightsPeakDay[]>('/admin/insights/peak-days', {
          tenantSlug: linkedTenantSlug,
          getToken,
        }),
        adminFetchJson<InsightsOrderComposition>('/admin/insights/order-composition', {
          tenantSlug: linkedTenantSlug,
          getToken,
        }),
      ])

    return {
      summary,
      ordersOverTime,
      topItems,
      neverOrdered,
      peakHours,
      peakDays,
      orderComposition,
    } satisfies InsightsData
  }

  useEffect(() => {
    if (!isLoaded) {
      return
    }

    if (!tenantSlug) {
      setIsLoading(false)
      setIsStripeLoading(false)
      setIsPrintingLoading(false)
      setIsOverviewLoading(false)
      setOverviewOrdersToday(0)
      setInsightsData(null)
      setInsightsError(null)
      setIsInsightsLoading(false)
      setMenuData(null)
      setSavedTheme(defaultThemeDraft)
      setDraftTheme(defaultThemeDraft)
      setError(null)
      setStripeStatus(null)
      setStripeMessage(null)
      setPrintingSettings({ enabled: false, macAddress: '' })
      setSavedPrintingSettings({ enabled: false, macAddress: '' })
      setPrintingMessage(null)
      return
    }

    let cancelled = false

    async function load() {
      setIsLoading(true)
      setIsOverviewLoading(true)
      setError(null)
      setSaveMessage(null)
      setMenuActionMessage(null)
      setStripeMessage(null)
      setPrintingMessage(null)

      try {
        const [menu, nextStripeStatus, nextPrintingSettings] = await Promise.all([
          fetchTenantMenu(linkedTenantSlug, getToken),
          loadStripeStatus(),
          loadPrintingSettings(),
        ])
        const overviewOrdersResult = await loadOverviewOrders().catch(() => ({ orders: [] }))
        if (cancelled) return
        const nextTheme = buildDraft(menu)
        const startOfToday = new Date()
        startOfToday.setHours(0, 0, 0, 0)
        setMenuData(menu)
        setSavedTheme(nextTheme)
        setDraftTheme(nextTheme)
        setStripeStatus(nextStripeStatus)
        setPrintingSettings(nextPrintingSettings)
        setSavedPrintingSettings(nextPrintingSettings)
        setOverviewOrdersToday(
          overviewOrdersResult.orders.filter((order) => new Date(order.createdAt) >= startOfToday)
            .length
        )
      } catch (nextError) {
        if (cancelled) return
        setError(nextError instanceof Error ? nextError.message : 'Failed to load menu')
      } finally {
        if (!cancelled) {
          setIsLoading(false)
          setIsStripeLoading(false)
          setIsPrintingLoading(false)
          setIsOverviewLoading(false)
        }
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [getToken, isLoaded, linkedTenantSlug, tenantSlug])

  useEffect(() => {
    if (!tenantSlug || activeSection !== 'insights') {
      return
    }

    let cancelled = false

    async function run() {
      setIsInsightsLoading(true)
      setInsightsError(null)

      try {
        const nextInsights = await loadInsights()
        if (cancelled) {
          return
        }

        setInsightsData(nextInsights)
      } catch (nextError) {
        if (cancelled) {
          return
        }

        setInsightsError(nextError instanceof Error ? nextError.message : 'Failed to load insights')
      } finally {
        if (!cancelled) {
          setIsInsightsLoading(false)
        }
      }
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [activeSection, getToken, linkedTenantSlug, tenantSlug])

  if (!isLoaded) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-background px-6 py-10">
        <div className="text-sm text-muted-foreground">Loading admin…</div>
      </main>
    )
  }

  if (!tenantSlug) {
    const primaryEmail = user?.primaryEmailAddress?.emailAddress ?? ''

    return (
      <>
        <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
          <UserButton />
        </div>
        <OnboardingPage
          clerkUserId={user?.id ?? ''}
          email={primaryEmail}
          getToken={getToken}
          onCompleted={handleOnboardingCompleted}
        />
      </>
    )
  }

  const categories = menuData?.categories ?? []

  const updateTheme = <K extends keyof ThemeDraft>(key: K, value: ThemeDraft[K]) => {
    setDraftTheme((current) => {
      if (key === 'primaryColor') {
        const nextPrimary = value as ThemeDraft['primaryColor']
        return {
          ...current,
          primaryColor: nextPrimary,
          accentColor: derivedAccentColor(nextPrimary),
          borderColor: derivedBorderColor(nextPrimary, current.backgroundColor),
        }
      }

      if (key === 'backgroundColor') {
        const nextBackground = value as ThemeDraft['backgroundColor']
        return {
          ...current,
          backgroundColor: nextBackground,
          borderColor: derivedBorderColor(current.primaryColor, nextBackground),
        }
      }

      return { ...current, [key]: value }
    })
    setSaveMessage(null)
  }

  const updateMenuCategories = (updater: (categories: MenuCategory[]) => MenuCategory[]) => {
    setMenuData((current) => {
      if (!current) {
        return current
      }

      return {
        ...current,
        categories: updater(current.categories),
      }
    })
  }

  const reloadMenuData = async (syncTheme = false) => {
    if (!tenantSlug) {
      throw new Error('Your account is not linked to a restaurant. Contact support.')
    }

    const refreshedMenu = await fetchTenantMenu(linkedTenantSlug, getToken)
    setMenuData(refreshedMenu)
    if (syncTheme) {
      const nextTheme = buildDraft(refreshedMenu)
      setSavedTheme(nextTheme)
      setDraftTheme(nextTheme)
    }
    return refreshedMenu
  }

  const saveTheme = async () => {
    if (!tenantSlug) {
      setSaveMessage('Your account is not linked to a restaurant. Contact support.')
      return
    }

    if (isBrandingUploadInProgress) {
      setSaveMessage('Wait for the image upload to finish before saving.')
      return
    }

    setIsSaving(true)
    setSaveMessage(null)

    try {
      await patchAdminJson('/admin/brand-config', themePayload(draftTheme))

      await reloadMenuData(true)
      setSaveMessage('Storefront settings saved.')
    } catch (nextError) {
      setSaveMessage(nextError instanceof Error ? nextError.message : 'Failed to save theme')
    } finally {
      setIsSaving(false)
    }
  }

  const reorderCategories = async (nextCategoryIds: string[]) => {
    if (!menuData) return

    const categoryById = new Map(categories.map((category) => [category.id, category]))
    const reordered = nextCategoryIds
      .map((categoryId) => categoryById.get(categoryId))
      .filter((category): category is MenuCategory => Boolean(category))
      .map((category, index) => ({ ...category, sortOrder: index }))

    updateMenuCategories(() => reordered)

    try {
      setMenuActionMessage('Saving category order…')
      await Promise.all(
        reordered.map((category, index) =>
          patchAdminJson(`/admin/menu/categories/${category.id}`, {
            sortOrder: index,
          })
        )
      )
      await reloadMenuData()
      setMenuActionMessage('Category order saved.')
    } catch (nextError) {
      await reloadMenuData()
      setMenuActionMessage(
        nextError instanceof Error ? nextError.message : 'Failed to reorder categories'
      )
    }
  }

  const updateCategoryVisibility = async (
    categoryId: string,
    visibility: MenuCategory['visibility']
  ) => {
    const previousCategories = categories

    updateMenuCategories((current) =>
      current.map((category) =>
        category.id === categoryId ? { ...category, visibility } : category
      )
    )

    try {
      setMenuActionMessage('Saving category visibility…')
      await patchAdminJson(`/admin/menu/categories/${categoryId}/availability`, {
        visibility,
      })
      await reloadMenuData()
      setMenuActionMessage('Category visibility updated.')
    } catch (nextError) {
      updateMenuCategories(() => previousCategories)
      setMenuActionMessage(
        nextError instanceof Error ? nextError.message : 'Failed to update category visibility'
      )
    }
  }

  const updateCategorySchedule = async (
    categoryId: string,
    schedule: {
      visibility: MenuCategory['visibility']
      availableFrom: string | null
      availableUntil: string | null
      daysOfWeek: string[] | null
    }
  ) => {
    const previousCategories = categories

    updateMenuCategories((current) =>
      current.map((category) =>
        category.id === categoryId
          ? {
              ...category,
              visibility: schedule.visibility,
              availableFrom: schedule.availableFrom,
              availableUntil: schedule.availableUntil,
              daysOfWeek: schedule.daysOfWeek,
            }
          : category
      )
    )

    try {
      setMenuActionMessage('Saving category schedule…')
      await patchAdminJson(`/admin/menu/categories/${categoryId}`, schedule)
      await reloadMenuData()
      setMenuActionMessage(
        schedule.visibility === 'AVAILABLE'
          ? 'Category schedule removed.'
          : 'Category schedule updated.'
      )
    } catch (nextError) {
      updateMenuCategories(() => previousCategories)
      setMenuActionMessage(
        nextError instanceof Error ? nextError.message : 'Failed to update category schedule'
      )
    }
  }

  const deleteCategoryFromMenu = async (categoryId: string) => {
    const previousCategories = categories
    updateMenuCategories((current) => current.filter((category) => category.id !== categoryId))

    try {
      setMenuActionMessage('Deleting section…')
      await deleteAdmin(`/admin/menu/categories/${categoryId}`)
      await reloadMenuData()
      setMenuActionMessage('Section deleted.')
    } catch (nextError) {
      updateMenuCategories(() => previousCategories)
      setMenuActionMessage(
        nextError instanceof Error ? nextError.message : 'Failed to delete section'
      )
    }
  }

  const reorderCategoryItem = async (categoryId: string, nextItemIds: string[]) => {
    const category = categories.find((entry) => entry.id === categoryId)
    if (!category) return

    const entryByItemId = new Map(category.categoryItems.map((entry) => [entry.item.id, entry]))
    const reorderedEntries = nextItemIds
      .map((itemId) => entryByItemId.get(itemId))
      .filter((entry): entry is CategoryItemEntry => Boolean(entry))
      .map((entry, index) => ({
        ...entry,
        sortOrder: index,
      }))

    const previousCategories = categories
    updateMenuCategories((current) =>
      current.map((entry) =>
        entry.id === categoryId ? { ...entry, categoryItems: reorderedEntries } : entry
      )
    )

    try {
      setMenuActionMessage('Saving item order…')
      await patchAdminJson(`/admin/menu/categories/${categoryId}/items/reorder`, {
        itemIds: nextItemIds,
      })
      await reloadMenuData()
      setMenuActionMessage('Item order saved.')
    } catch (nextError) {
      updateMenuCategories(() => previousCategories)
      setMenuActionMessage(
        nextError instanceof Error ? nextError.message : 'Failed to reorder items'
      )
    }
  }

  const updateItemPresentation = async (
    itemId: string,
    body: Record<string, unknown>,
    successMessage: string
  ) => {
    const previousCategories = categories
    updateMenuCategories((current) =>
      current.map((category) => ({
        ...category,
        categoryItems: category.categoryItems.map((entry) =>
          entry.item.id === itemId
            ? {
                ...entry,
                item: {
                  ...entry.item,
                  ...(typeof body.isFeatured === 'boolean' ? { isFeatured: body.isFeatured } : {}),
                  ...(Object.prototype.hasOwnProperty.call(body, 'photoUrl')
                    ? { photoUrl: (body.photoUrl as string | null | undefined) ?? null }
                    : {}),
                },
              }
            : entry
        ),
      }))
    )

    try {
      setMenuActionMessage('Saving item settings…')
      await patchAdminJson(`/admin/menu/items/${itemId}`, body)
      await reloadMenuData()
      setMenuActionMessage(successMessage)
    } catch (nextError) {
      updateMenuCategories(() => previousCategories)
      setMenuActionMessage(nextError instanceof Error ? nextError.message : 'Failed to update item')
    }
  }

  const updateItemLocalizedName = async (itemId: string, nameLocalized: string) => {
    await updateItemPresentation(
      itemId,
      {
        nameLocalized: nameLocalized.trim() ? nameLocalized.trim() : null,
      },
      nameLocalized.trim() ? 'Localized item name updated.' : 'Localized item name removed.'
    )
  }

  const batchTranslateItems = async () => {
    const result = await postAdminJson<{ translated: number; skipped: number }>(
      '/admin/menu/batch-translate',
      {}
    )
    await reloadMenuData()
    return result
  }

  const updateItemVisibility = async (
    itemId: string,
    visibility: CategoryItemEntry['item']['visibility']
  ) => {
    const previousCategories = categories
    updateMenuCategories((current) =>
      current.map((category) => ({
        ...category,
        categoryItems: category.categoryItems.map((entry) =>
          entry.item.id === itemId
            ? {
                ...entry,
                item: {
                  ...entry.item,
                  visibility,
                },
              }
            : entry
        ),
      }))
    )

    try {
      setMenuActionMessage(
        visibility === 'HIDDEN'
          ? 'Hiding item…'
          : visibility === 'SOLD_OUT'
            ? 'Marking item sold out…'
            : 'Updating item visibility…'
      )
      await patchAdminJson(`/admin/menu/items/${itemId}/availability`, { visibility })
      await reloadMenuData()
      setMenuActionMessage(
        visibility === 'HIDDEN'
          ? 'Item hidden.'
          : visibility === 'SOLD_OUT'
            ? 'Item marked sold out.'
            : 'Item shown.'
      )
    } catch (nextError) {
      updateMenuCategories(() => previousCategories)
      setMenuActionMessage(
        nextError instanceof Error ? nextError.message : 'Failed to update availability'
      )
    }
  }

  const addItemToCategory = async (
    categoryId: string,
    input: { name: string; description: string; priceCents: number }
  ) => {
    const category = categories.find((entry) => entry.id === categoryId)
    if (!category) return

    try {
      setMenuActionMessage('Adding item…')
      const created = await postAdminJson<{ id: string }>('/admin/menu/items', {
        name: input.name,
        description: input.description || null,
        basePriceCents: input.priceCents,
        photoUrl: null,
        tags: [],
        prepTimeMinutes: 0,
        specialInstructionsEnabled: false,
        isFeatured: false,
        visibility: 'AVAILABLE',
        categoryIds: [categoryId],
      })

      await patchAdminJson(`/admin/menu/categories/${categoryId}/items/reorder`, {
        itemIds: [...category.categoryItems.map((entry) => entry.item.id), created.id],
      })

      await reloadMenuData()
      setMenuActionMessage('Item added.')
    } catch (nextError) {
      setMenuActionMessage(nextError instanceof Error ? nextError.message : 'Failed to add item')
    }
  }

  const deleteItemFromMenu = async (itemId: string) => {
    const previousCategories = categories
    updateMenuCategories((current) =>
      current.map((category) => ({
        ...category,
        categoryItems: category.categoryItems.filter((entry) => entry.item.id !== itemId),
      }))
    )

    try {
      setMenuActionMessage('Deleting item…')
      await deleteAdmin(`/admin/menu/items/${itemId}`)
      await reloadMenuData()
      setMenuActionMessage('Item deleted.')
    } catch (nextError) {
      updateMenuCategories(() => previousCategories)
      setMenuActionMessage(nextError instanceof Error ? nextError.message : 'Failed to delete item')
    }
  }

  const launchStripeOnboarding = async () => {
    setIsStripeLaunching(true)
    setStripeMessage(null)

    try {
      const response = await adminFetchJson<{ url: string }>(
        '/admin/payments/stripe/onboarding-link',
        {
          method: 'POST',
          tenantSlug: linkedTenantSlug,
          getToken,
        }
      )
      window.location.assign(response.url)
    } catch (nextError) {
      setStripeMessage(
        nextError instanceof Error ? nextError.message : 'Failed to launch Stripe onboarding'
      )
    } finally {
      setIsStripeLaunching(false)
    }
  }

  const savePrintingSettings = async () => {
    setIsPrintingSaving(true)
    setPrintingMessage(null)

    try {
      const nextSettings = await patchAdminJson<PrintingSettings>('/admin/restaurant/printing', {
        enabled: printingSettings.enabled,
        macAddress: printingSettings.macAddress?.trim() || '',
      })

      setPrintingSettings(nextSettings)
      setSavedPrintingSettings(nextSettings)
      setPrintingMessage('Printing settings saved.')
    } catch (nextError) {
      setPrintingMessage(
        nextError instanceof Error ? nextError.message : 'Failed to save printing settings'
      )
    } finally {
      setIsPrintingSaving(false)
    }
  }

  const stripeStatusLabel =
    stripeStatus?.status === 'active'
      ? 'Connected and ready'
      : stripeStatus?.status === 'onboarding_required'
        ? 'Onboarding required'
        : 'Not connected'
  const isPrintingDirty = JSON.stringify(printingSettings) !== JSON.stringify(savedPrintingSettings)
  const printingStatusLabel =
    printingSettings.enabled && printingSettings.macAddress ? 'Printer connected' : 'Not configured'
  const restaurantDisplayName =
    draftTheme.appTitle.trim() || stripeStatus?.displayName || linkedTenantSlug
  const userDisplayName =
    user?.fullName || user?.firstName || user?.primaryEmailAddress?.emailAddress || 'Admin'
  const storefrontUrl = storefrontUrlForTenant(linkedTenantSlug)
  const kitchenKioskUrl = kioskUrl(linkedTenantSlug)

  const paymentsPanel = (
    <div className="grid gap-6">
      <SectionCard
        title="Stripe payouts"
        subtitle="Connect the restaurant to Stripe before enabling live card payments."
      >
        <div className="grid gap-4">
          <div className="flex items-start justify-between gap-4 rounded-[var(--radius)] border border-border/70 bg-background px-4 py-4">
            <div className="grid gap-2">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <CreditCard className="h-4 w-4 text-primary" />
                {stripeStatus?.displayName ?? 'Restaurant payouts'}
              </div>
              <div className="text-sm text-muted-foreground">
                {isStripeLoading ? 'Checking Stripe onboarding status…' : stripeStatusLabel}
              </div>
            </div>
            <Badge
              variant="outline"
              className={cn(
                'border-border bg-card',
                stripeStatus?.status === 'active' && 'border-primary/30 text-foreground'
              )}
            >
              {stripeStatusLabel}
            </Badge>
          </div>

          {stripeStatus ? (
            <div className="grid gap-2 rounded-[var(--radius)] border border-border/70 bg-background px-4 py-4 text-sm text-muted-foreground">
              <div className="flex items-center justify-between gap-4">
                <span>Charges enabled</span>
                <span className="font-medium text-foreground">
                  {stripeStatus.chargesEnabled ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>Payouts enabled</span>
                <span className="font-medium text-foreground">
                  {stripeStatus.payoutsEnabled ? 'Yes' : 'No'}
                </span>
              </div>
              {stripeStatus.stripeAccountId ? (
                <div className="flex items-center justify-between gap-4">
                  <span>Stripe account</span>
                  <span className="truncate text-xs text-foreground">
                    {stripeStatus.stripeAccountId}
                  </span>
                </div>
              ) : null}
            </div>
          ) : null}

          {stripeMessage ? (
            <div className="rounded-[var(--radius)] border border-destructive/20 bg-destructive/10 px-4 py-4 text-sm text-destructive">
              {stripeMessage}
            </div>
          ) : null}

          <Button
            type="button"
            className="min-h-11 justify-between"
            disabled={isStripeLaunching || !stripeStatus?.configured}
            onClick={() => void launchStripeOnboarding()}
          >
            <span>
              {stripeStatus?.status === 'active'
                ? 'Review Stripe account'
                : stripeStatus?.status === 'onboarding_required'
                  ? 'Continue Stripe onboarding'
                  : 'Connect Stripe'}
            </span>
            <ExternalLink className="h-4 w-4" />
          </Button>

          {!stripeStatus?.configured ? (
            <div className="text-sm text-muted-foreground">
              Stripe is not configured yet. Add the Stripe env values before onboarding a
              restaurant.
            </div>
          ) : null}

          {stripeStatus?.status === 'active' ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              This restaurant can take live card payments.
            </div>
          ) : null}
        </div>
      </SectionCard>

      <SectionCard
        title="Digital kitchen workflow"
        subtitle="Printing is paused for launch. Use the kitchen dashboard to process orders live."
      >
        <div className="grid gap-4">
          <div className="flex items-start justify-between gap-4 rounded-[var(--radius)] border border-border/70 bg-background px-4 py-4">
            <div className="grid gap-2">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Printer className="h-4 w-4 text-primary" />
                Digital-only launch mode
              </div>
              <div className="text-sm text-muted-foreground">
                {isPrintingLoading
                  ? 'Checking previous printer configuration…'
                  : printingStatusLabel === 'Printer connected'
                    ? 'A printer was configured previously, but new orders will stay digital-only for launch.'
                    : 'New orders will stay in the kitchen dashboard until printing is re-enabled later.'}
              </div>
            </div>
            <Badge
              variant="outline"
              className={cn(
                'border-border bg-card',
                printingSettings.enabled &&
                  printingSettings.macAddress &&
                  'border-primary/30 text-foreground'
              )}
            >
              Printing paused
            </Badge>
          </div>

          <div className="rounded-[var(--radius)] border border-border/70 bg-background px-4 py-4 text-sm text-muted-foreground">
            Orders will be confirmed, prepared, and completed in the kitchen dashboard without
            generating CloudPRNT jobs. Re-enable printing after launch once the queue model is
            hardened.
          </div>

          <div className="flex flex-wrap gap-3">
            <Button asChild type="button" className="min-h-11">
              <a href={kitchenKioskUrl} target="_blank" rel="noreferrer">
                Open kitchen dashboard
              </a>
            </Button>
            <Button asChild type="button" variant="outline" className="min-h-11">
              <a href={storefrontUrl} target="_blank" rel="noreferrer">
                Open storefront
              </a>
            </Button>
          </div>
        </div>
      </SectionCard>
    </div>
  )

  const overviewPanel = (
    <div className="grid gap-6">
      <SectionCard
        title="Overview"
        subtitle="A quick snapshot of the restaurant setup before you edit the storefront."
      >
        <div className="grid min-w-0 gap-4 xl:grid-cols-2 2xl:grid-cols-3">
          <OverviewMetricCard
            label="Stripe status"
            value={isStripeLoading ? 'Checking…' : stripeStatusLabel}
            hint={stripeStatus?.status === 'active' ? 'Payments live' : 'Needs review'}
          />
          <OverviewMetricCard
            label="Orders today"
            value={isOverviewLoading ? 'Loading…' : String(overviewOrdersToday)}
            hint="Current kitchen feed"
          />
          <OverviewMetricCard
            label="Restaurant slug"
            value={linkedTenantSlug}
            hint="Tenant routing key"
          />
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button type="button" onClick={() => setActiveSection('branding')}>
            Open branding
          </Button>
          <Button type="button" variant="outline" onClick={() => setActiveSection('menu')}>
            Open menu
          </Button>
        </div>
      </SectionCard>

      {paymentsPanel}
    </div>
  )

  const brandingPanel = (
    <div className="grid gap-6">
      {error ? (
        <div className="rounded-[var(--radius)] border border-destructive/20 bg-destructive/10 px-4 py-4 text-sm text-destructive">
          {error}
        </div>
      ) : null}
      <SectionCard
        title="Branding"
        subtitle="Logo, hero copy, colors, and fonts update the preview immediately."
      >
        <BrandingTab
          theme={draftTheme}
          onThemeChange={updateTheme}
          onUploadImage={uploadBrandingImage}
        />
      </SectionCard>
    </div>
  )

  const menuPanel = (
    <div className="grid gap-6">
      {error ? (
        <div className="rounded-[var(--radius)] border border-destructive/20 bg-destructive/10 px-4 py-4 text-sm text-destructive">
          {error}
        </div>
      ) : null}
      <SectionCard
        title="Menu management"
        subtitle="Organize categories, control visibility, reorder items, and manage featured dishes."
      >
        <MenuTab
          categories={categories}
          menuActionMessage={menuActionMessage}
          onBatchTranslate={batchTranslateItems}
          onCategoryDelete={deleteCategoryFromMenu}
          onAddItem={addItemToCategory}
          onCategoryScheduleChange={updateCategorySchedule}
          onCategoryVisibilityChange={updateCategoryVisibility}
          onCategoryReorder={reorderCategories}
          onDeleteItem={deleteItemFromMenu}
          onItemFeaturedChange={(itemId, isFeatured) =>
            void updateItemPresentation(itemId, { isFeatured }, 'Featured state updated.')
          }
          onItemImageChange={(itemId, photoUrl) =>
            void updateItemPresentation(
              itemId,
              { photoUrl },
              photoUrl ? 'Item image updated.' : 'Item image removed.'
            )
          }
          onItemLocalizedNameChange={(itemId, nameLocalized) =>
            void updateItemLocalizedName(itemId, nameLocalized)
          }
          onItemReorder={reorderCategoryItem}
          onItemVisibilityChange={updateItemVisibility}
        />
      </SectionCard>
    </div>
  )

  const insightsPanel = (
    <InsightsDashboard
      data={insightsData}
      error={insightsError}
      isLoading={isInsightsLoading}
      onRefresh={() => {
        void loadInsights()
          .then((nextInsights) => {
            setInsightsData(nextInsights)
            setInsightsError(null)
          })
          .catch((nextError) => {
            setInsightsError(
              nextError instanceof Error ? nextError.message : 'Failed to load insights'
            )
          })
      }}
    />
  )

  const assistantPanel = (
    <SectionCard
      title="Assistant"
      subtitle="Use the AI operator to make menu and storefront changes in one place."
    >
      <AssistantPanel
        className="min-h-[620px]"
        getToken={getToken}
        tenantSlug={linkedTenantSlug}
        onRefreshTargets={(targets) => {
          if (targets.includes('menu')) {
            void reloadMenuData(true)
          }
        }}
      />
    </SectionCard>
  )

  const activeSectionContent = (() => {
    switch (activeSection) {
      case 'overview':
        return overviewPanel
      case 'branding':
        return brandingPanel
      case 'menu':
        return menuPanel
      case 'insights':
        return insightsPanel
      case 'loyalty':
        return <LoyaltyPage tenantSlug={linkedTenantSlug} />
      case 'payments':
        return paymentsPanel
      case 'assistant':
        return assistantPanel
    }
  })()

  return (
    <motion.main
      className="flex h-[100dvh] min-h-[100dvh] flex-col overflow-hidden bg-background"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
    >
      <header className="shrink-0 border-b border-border/70 bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-20 w-full max-w-[1800px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-4">
            <div className="inline-flex h-11 items-center rounded-full border border-border bg-card px-4 font-heading text-lg text-foreground shadow-sm">
              EasyMenu
            </div>
            <div className="min-w-0">
              <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                Restaurant admin
              </div>
              <div className="truncate text-lg font-semibold text-foreground">
                {restaurantDisplayName}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              className="hidden min-h-11 sm:inline-flex"
              onClick={() => {
                window.open(storefrontUrl, '_blank', 'noopener,noreferrer')
              }}
            >
              Live view
              <ExternalLink className="h-4 w-4" />
            </Button>
            <div className="hidden text-right sm:block">
              <div className="text-sm font-medium text-foreground">{userDisplayName}</div>
              <div className="text-xs text-muted-foreground">{linkedTenantSlug}</div>
            </div>
            <UserButton />
          </div>
        </div>
      </header>

      <div className="mx-auto grid min-h-0 flex-1 w-full max-w-[1800px] gap-4 px-4 py-4 sm:px-6 lg:grid-cols-[272px_minmax(0,1fr)] lg:px-8 xl:grid-cols-[272px_minmax(0,1fr)_minmax(560px,38vw)]">
        <aside className="hidden min-h-0 flex-col justify-between rounded-[calc(var(--radius)+8px)] border border-border/80 bg-card p-5 shadow-sm lg:flex">
          <div className="grid gap-6">
            <div className="rounded-[var(--radius)] border border-border/70 bg-background px-4 py-4">
              <div className="flex items-center gap-3">
                {user?.imageUrl ? (
                  <img
                    src={user.imageUrl}
                    alt={userDisplayName}
                    className="h-11 w-11 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                    {userDisplayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-foreground">
                    {restaurantDisplayName}
                  </div>
                  <div className="block max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-xs text-muted-foreground">
                    {linkedTenantSlug}
                  </div>
                </div>
              </div>
            </div>

            <SectionNav activeSection={activeSection} onChange={setActiveSection} />
          </div>

          <div className="grid gap-3">
            <div className="rounded-[var(--radius)] border border-border/70 bg-background px-3 py-3">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Launch
              </div>
              <div className="grid gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  className="justify-start rounded-[var(--radius)] px-3 text-muted-foreground"
                  onClick={() => {
                    window.open(storefrontUrl, '_blank', 'noopener,noreferrer')
                  }}
                >
                  <Store className="h-4 w-4" />
                  Customer site
                  <ExternalLink className="ml-auto h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="justify-start rounded-[var(--radius)] px-3 text-muted-foreground"
                  onClick={() => {
                    window.open(kitchenKioskUrl, '_blank', 'noopener,noreferrer')
                  }}
                >
                  <Printer className="h-4 w-4" />
                  Kitchen kiosk
                  <ExternalLink className="ml-auto h-4 w-4" />
                </Button>
              </div>
            </div>

            <Button
              type="button"
              variant="ghost"
              className="justify-start rounded-[var(--radius)] px-4 text-muted-foreground"
              onClick={() => {
                void signOut()
              }}
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>
        </aside>

        <section className="flex min-h-0 flex-col overflow-hidden rounded-[calc(var(--radius)+8px)] border border-border/80 bg-card shadow-sm">
          <div className="shrink-0 border-b border-border/70 px-4 py-3 lg:hidden">
            <CompactSectionNav activeSection={activeSection} onChange={setActiveSection} />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={activeSection}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="grid gap-6"
              >
                {activeSectionContent}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="shrink-0 border-t border-border/70 bg-background/95 p-4 backdrop-blur sm:px-6">
            <ThemeSaveBar
              isDirty={isThemeDirty}
              isLoading={isLoading}
              isUploadPending={isBrandingUploadInProgress}
              isSaving={isSaving}
              onSave={() => void saveTheme()}
              saveMessage={saveMessage}
            />
          </div>
        </section>

        <aside className="hidden min-h-0 flex-col overflow-hidden rounded-[calc(var(--radius)+8px)] border border-border/80 bg-card shadow-sm xl:flex">
          <div className="shrink-0 border-b border-border/70 px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-foreground">Live storefront preview</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  Draft changes render here immediately from the current editor state.
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                className="min-h-10 shrink-0"
                onClick={() => {
                  window.open(storefrontUrl, '_blank', 'noopener,noreferrer')
                }}
              >
                Open live site
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <PreviewPane theme={draftTheme} categories={categories} />
          </div>
        </aside>
      </div>
    </motion.main>
  )
}

function SectionNav({
  activeSection,
  onChange,
}: {
  activeSection: AdminSection
  onChange: (value: AdminSection) => void
}) {
  const sections: Array<{ id: AdminSection; icon: React.ReactNode; label: string }> = [
    { id: 'overview', icon: <LayoutDashboard className="h-4 w-4" />, label: 'Overview' },
    { id: 'branding', icon: <Palette className="h-4 w-4" />, label: 'Branding' },
    { id: 'menu', icon: <Store className="h-4 w-4" />, label: 'Menu' },
    { id: 'loyalty', icon: <Star className="h-4 w-4" />, label: 'Loyalty' },
    { id: 'insights', icon: <BarChart3 className="h-4 w-4" />, label: 'Insights' },
    { id: 'payments', icon: <CreditCard className="h-4 w-4" />, label: 'Payments' },
    { id: 'assistant', icon: <Bot className="h-4 w-4" />, label: 'Assistant' },
  ]

  return (
    <nav className="grid gap-2">
      {sections.map((section) => {
        const isActive = activeSection === section.id

        return (
          <Button
            key={section.id}
            type="button"
            variant="ghost"
            className={cn(
              'w-full justify-start gap-2.5 rounded-[var(--radius)] px-3 py-2.5 text-left text-[13px] leading-5',
              isActive
                ? 'border border-primary/25 bg-primary/10 text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
            onClick={() => onChange(section.id)}
          >
            {section.icon}
            {section.label}
          </Button>
        )
      })}
    </nav>
  )
}

function CompactSectionNav({
  activeSection,
  onChange,
}: {
  activeSection: AdminSection
  onChange: (value: AdminSection) => void
}) {
  const sections: Array<{ id: AdminSection; label: string }> = [
    { id: 'overview', label: 'Overview' },
    { id: 'branding', label: 'Branding' },
    { id: 'menu', label: 'Menu' },
    { id: 'loyalty', label: 'Loyalty' },
    { id: 'insights', label: 'Insights' },
    { id: 'payments', label: 'Payments' },
    { id: 'assistant', label: 'Assistant' },
  ]

  return (
    <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex w-max min-w-full gap-2">
        {sections.map((section) => (
          <Button
            key={section.id}
            type="button"
            variant={activeSection === section.id ? 'default' : 'outline'}
            className="rounded-full"
            onClick={() => onChange(section.id)}
          >
            {section.label}
          </Button>
        ))}
      </div>
    </div>
  )
}

// ─── Loyalty Page ────────────────────────────────────────────────────────────

type LoyaltyConfig = {
  active: boolean
  earnRate: number
  redeemRate: number
  minRedeem: number
  expiryMonths: number
  welcomeBonus: number
  newMemberDiscountEnabled: boolean
  newMemberDiscountType: 'PERCENTAGE' | 'FIXED'
  newMemberDiscountValue: number
  tiers: Array<{
    id: string
    name: string
    pointsCost: number
    discountCents: number
    sortOrder: number
  }>
}

type LoyaltyAnalytics = {
  enrolledCount: number
  issued: number
  redeemed: number
  topAccounts: Array<{
    id: string
    points: number
    lifetimePts: number
    customer: { name: string | null; phone: string }
  }>
  recentRedemptions: Array<{
    id: string
    delta: number
    description: string | null
    createdAt: string
    stripeCouponId: string | null
    account: { customer: { name: string | null; phone: string } }
  }>
}

function LoyaltyNumInput({
  value,
  onChange,
  suffix,
  min = 0,
  max = 9999,
}: {
  value: number
  onChange: (v: number) => void
  suffix?: string
  min?: number
  max?: number
}) {
  return (
    <div className="flex overflow-hidden rounded-lg border border-border bg-background">
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(Math.max(min, Math.min(max, Number(e.target.value))))}
        className="w-20 flex-1 border-none bg-transparent px-3 py-2 text-sm text-foreground outline-none"
      />
      {suffix && (
        <span className="border-l border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
          {suffix}
        </span>
      )}
    </div>
  )
}

function LoyaltyFieldRow({
  label,
  hint,
  children,
}: {
  label: string
  hint: string
  children: React.ReactNode
}) {
  return (
    <div className="grid grid-cols-[1fr_220px] gap-8 items-start border-b border-border py-5 last:border-none">
      <div>
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{hint}</p>
      </div>
      <div>{children}</div>
    </div>
  )
}

function LoyaltyPage({ tenantSlug }: { tenantSlug: string }) {
  const [tab, setTab] = useState<'rules' | 'analytics'>('rules')
  const [config, setConfig] = useState<LoyaltyConfig | null>(null)
  const [analytics, setAnalytics] = useState<LoyaltyAnalytics | null>(null)
  const [loadingConfig, setLoadingConfig] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loadingAnalytics, setLoadingAnalytics] = useState(false)
  const [togglingActive, setTogglingActive] = useState(false)
  const [configError, setConfigError] = useState<string | null>(null)
  const [analyticsError, setAnalyticsError] = useState<string | null>(null)
  const { getToken } = useAuth()

  // Tier editing state
  const [newTierName, setNewTierName] = useState('')
  const [newTierPts, setNewTierPts] = useState(0)
  const [newTierCents, setNewTierCents] = useState(0)
  const [addingTier, setAddingTier] = useState(false)

  const loadConfig = useCallback(async () => {
    setLoadingConfig(true)
    setConfigError(null)
    try {
      const nextConfig = await adminFetchJson<LoyaltyConfig>('/admin/loyalty', {
        tenantSlug,
        getToken,
      })
      setConfig(nextConfig)
    } catch (error) {
      setConfig(null)
      setConfigError(error instanceof Error ? error.message : 'Failed to load loyalty settings')
    } finally {
      setLoadingConfig(false)
    }
  }, [getToken, tenantSlug])

  const loadAnalytics = useCallback(async () => {
    setLoadingAnalytics(true)
    setAnalyticsError(null)
    try {
      const nextAnalytics = await adminFetchJson<LoyaltyAnalytics>('/admin/loyalty/analytics', {
        tenantSlug,
        getToken,
      })
      setAnalytics(nextAnalytics)
    } catch (error) {
      setAnalyticsError(error instanceof Error ? error.message : 'Failed to load loyalty analytics')
    } finally {
      setLoadingAnalytics(false)
    }
  }, [getToken, tenantSlug])

  useEffect(() => {
    void loadConfig()
  }, [loadConfig])

  useEffect(() => {
    if (tab !== 'analytics') return
    if (analytics) return
    void loadAnalytics()
  }, [tab, analytics, loadAnalytics])

  const handleSave = async () => {
    if (!config) return
    setSaving(true)
    setConfigError(null)
    try {
      const nextConfig = await adminFetchJson<LoyaltyConfig>('/admin/loyalty', {
        method: 'PATCH',
        tenantSlug,
        getToken,
        body: {
          active: config.active,
          earnRate: config.earnRate,
          redeemRate: config.redeemRate,
          minRedeem: config.minRedeem,
          expiryMonths: config.expiryMonths,
          welcomeBonus: config.welcomeBonus,
          newMemberDiscountEnabled: config.newMemberDiscountEnabled,
          newMemberDiscountType: config.newMemberDiscountType,
          newMemberDiscountValue: config.newMemberDiscountValue,
        },
      })
      setConfig(nextConfig)
      setSaved(true)
      setTimeout(() => setSaved(false), 2200)
    } catch (error) {
      setConfigError(error instanceof Error ? error.message : 'Failed to update loyalty settings')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleProgramActive = async () => {
    if (!config || togglingActive) return

    const nextActive = !config.active
    setTogglingActive(true)
    setConfigError(null)
    setConfig((current) => (current ? { ...current, active: nextActive } : current))

    try {
      const nextConfig = await adminFetchJson<LoyaltyConfig>('/admin/loyalty', {
        method: 'PATCH',
        tenantSlug,
        getToken,
        body: {
          active: nextActive,
        },
      })
      setConfig((current) => {
        const merged = nextConfig ?? current
        return merged ? { ...merged, active: nextActive } : merged
      })
    } catch (error) {
      setConfig((current) => (current ? { ...current, active: !nextActive } : current))
      setConfigError(error instanceof Error ? error.message : 'Failed to update loyalty status')
    } finally {
      setTogglingActive(false)
    }
  }

  const handleAddTier = async () => {
    if (!newTierName.trim() || newTierPts < 1 || newTierCents < 1) return
    setAddingTier(true)
    setConfigError(null)
    try {
      await adminFetchJson<{ id: string }>('/admin/loyalty/tiers', {
        method: 'POST',
        tenantSlug,
        getToken,
        body: { name: newTierName.trim(), pointsCost: newTierPts, discountCents: newTierCents },
      })
      await loadConfig()
      setNewTierName('')
      setNewTierPts(0)
      setNewTierCents(0)
    } catch (error) {
      setConfigError(error instanceof Error ? error.message : 'Failed to create reward tier')
    } finally {
      setAddingTier(false)
    }
  }

  const handleDeleteTier = async (tierId: string) => {
    setConfigError(null)
    try {
      await adminFetchJson<void>(`/admin/loyalty/tiers/${tierId}`, {
        method: 'DELETE',
        tenantSlug,
        getToken,
      })
      await loadConfig()
    } catch (error) {
      setConfigError(error instanceof Error ? error.message : 'Failed to delete reward tier')
    }
  }

  if (loadingConfig) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading loyalty settings…</p>
      </div>
    )
  }

  if (!config) {
    return (
      <div className="grid gap-4">
        <div className="rounded-[var(--radius)] border border-destructive/20 bg-destructive/10 px-4 py-4 text-sm text-foreground">
          {configError ?? 'Failed to load loyalty settings'}
        </div>
        <div>
          <Button type="button" variant="outline" onClick={() => void loadConfig()}>
            Retry
          </Button>
        </div>
      </div>
    )
  }

  const previewEarned = 50 * config.earnRate
  const previewValue = (previewEarned / config.redeemRate).toFixed(2)
  const minDollarOff = (config.minRedeem / config.redeemRate).toFixed(2)

  return (
    <div className="grid gap-6 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Loyalty Program</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure how customers earn and redeem points
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void handleToggleProgramActive()}
              aria-pressed={config.active}
              disabled={togglingActive}
              className={cn(
                'relative h-6 w-11 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                config.active ? 'bg-primary' : 'bg-input',
                togglingActive && 'opacity-60'
              )}
            >
              <span
                className={cn(
                  'absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-all',
                  config.active ? 'right-1' : 'left-1'
                )}
              />
            </button>
            <span
              className={cn(
                'text-sm font-medium transition-colors',
                config.active ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              {config.active ? 'Active' : 'Inactive'}
            </span>
          </div>
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className={cn('min-w-[120px]', saved && 'bg-green-600 hover:bg-green-600')}
          >
            {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(['rules', 'analytics'] as const).map((t) => (
          <Button
            key={t}
            type="button"
            variant={tab === t ? 'default' : 'outline'}
            className="rounded-full capitalize"
            onClick={() => setTab(t)}
          >
            {t === 'rules' ? 'Program Rules' : 'Analytics'}
          </Button>
        ))}
      </div>

      {configError ? (
        <div className="rounded-[var(--radius)] border border-destructive/20 bg-destructive/10 px-4 py-4 text-sm text-foreground">
          {configError}
        </div>
      ) : null}

      {tab === 'rules' && (
        <div className="grid gap-5">
          {/* Live preview card */}
          <div className="rounded-2xl bg-primary p-6 text-primary-foreground">
            <div className="grid grid-cols-3 gap-6">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-primary-foreground/60">
                  Earn on $50 order
                </p>
                <p className="mt-1 font-heading text-3xl font-bold">
                  {previewEarned.toLocaleString()} pts
                </p>
                <p className="mt-1 text-xs text-primary-foreground/60">
                  ≈ ${previewValue} in savings
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-primary-foreground/60">
                  Redemption rate
                </p>
                <p className="mt-1 font-heading text-3xl font-bold">{config.redeemRate} pts</p>
                <p className="mt-1 text-xs text-primary-foreground/60">= $1.00 off</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-primary-foreground/60">
                  Min to redeem
                </p>
                <p className="mt-1 font-heading text-3xl font-bold">{config.minRedeem} pts</p>
                <p className="mt-1 text-xs text-primary-foreground/60">= ${minDollarOff} off</p>
              </div>
            </div>
          </div>

          {/* Earn / redeem rules */}
          <Card>
            <CardContent className="px-6 py-1">
              <LoyaltyFieldRow
                label="Points per dollar spent"
                hint="How many points a customer earns for every $1 on a completed order."
              >
                <div className="grid gap-1.5">
                  <LoyaltyNumInput
                    value={config.earnRate}
                    onChange={(v) => setConfig((c) => (c ? { ...c, earnRate: v } : c))}
                    suffix="pts / $1"
                    min={1}
                    max={100}
                  />
                  <p className="text-xs text-muted-foreground">
                    Customer earns {config.earnRate}× their spend in points
                  </p>
                </div>
              </LoyaltyFieldRow>
              <LoyaltyFieldRow
                label="Points to redeem $1"
                hint="How many points equal $1 off. Lower = more generous for customers."
              >
                <div className="grid gap-1.5">
                  <LoyaltyNumInput
                    value={config.redeemRate}
                    onChange={(v) => setConfig((c) => (c ? { ...c, redeemRate: v } : c))}
                    suffix="pts = $1"
                    min={1}
                    max={1000}
                  />
                  <p className="text-xs text-muted-foreground">
                    Effective cash back: {((config.earnRate / config.redeemRate) * 100).toFixed(1)}%
                  </p>
                </div>
              </LoyaltyFieldRow>
              <LoyaltyFieldRow
                label="Minimum points to redeem"
                hint="Customers must reach this threshold before any rewards are available."
              >
                <LoyaltyNumInput
                  value={config.minRedeem}
                  onChange={(v) => setConfig((c) => (c ? { ...c, minRedeem: v } : c))}
                  suffix="pts minimum"
                  min={0}
                  max={10000}
                />
              </LoyaltyFieldRow>
              <LoyaltyFieldRow
                label="Points expiry"
                hint="Unused points expire after this many months of inactivity. 0 = no expiry."
              >
                <LoyaltyNumInput
                  value={config.expiryMonths}
                  onChange={(v) => setConfig((c) => (c ? { ...c, expiryMonths: v } : c))}
                  suffix="months"
                  min={0}
                  max={36}
                />
              </LoyaltyFieldRow>
              <LoyaltyFieldRow
                label="Welcome bonus"
                hint="Points awarded automatically when a customer joins on their first order."
              >
                <div className="grid gap-1.5">
                  <LoyaltyNumInput
                    value={config.welcomeBonus}
                    onChange={(v) => setConfig((c) => (c ? { ...c, welcomeBonus: v } : c))}
                    suffix="pts on join"
                    min={0}
                    max={5000}
                  />
                  <p className="text-xs text-muted-foreground">
                    = ${(config.welcomeBonus / config.redeemRate).toFixed(2)} in welcome savings
                  </p>
                </div>
              </LoyaltyFieldRow>
            </CardContent>
          </Card>

          {/* Reward tiers */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm">Reward tiers</CardTitle>
                  <CardDescription className="text-xs mt-1">
                    The discount options customers can choose from when redeeming points
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {['Tier name', 'Points cost', 'Discount', ''].map((h) => (
                      <th
                        key={h}
                        className="pb-2 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {config.tiers.map((tier) => (
                    <tr key={tier.id} className="border-b border-border last:border-none">
                      <td className="py-2.5 pr-3">
                        <span className="text-sm text-foreground">{tier.name}</span>
                      </td>
                      <td className="py-2.5 pr-3">
                        <span className="text-sm text-muted-foreground">
                          {tier.pointsCost.toLocaleString()} pts
                        </span>
                      </td>
                      <td className="py-2.5 pr-3">
                        <span className="text-sm text-foreground">
                          ${(tier.discountCents / 100).toFixed(2)} off
                        </span>
                      </td>
                      <td className="py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteTier(tier.id)}
                          className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Add tier form */}
              <div className="mt-4 grid grid-cols-[1fr_120px_120px_auto] gap-2 items-end">
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Name
                  </label>
                  <input
                    value={newTierName}
                    onChange={(e) => setNewTierName(e.target.value)}
                    placeholder="e.g. $5 off"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Points cost
                  </label>
                  <input
                    type="number"
                    value={newTierPts || ''}
                    onChange={(e) => setNewTierPts(Number(e.target.value))}
                    placeholder="500"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Discount (¢)
                  </label>
                  <input
                    type="number"
                    value={newTierCents || ''}
                    onChange={(e) => setNewTierCents(Number(e.target.value))}
                    placeholder="500"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddTier}
                  disabled={addingTier || !newTierName.trim() || newTierPts < 1 || newTierCents < 1}
                  className="self-end"
                >
                  {addingTier ? 'Adding…' : '+ Add'}
                </Button>
              </div>
              <p className="mt-3 text-[11px] text-muted-foreground">
                Changes apply to new redemptions only — existing issued rewards are not affected.
              </p>
            </CardContent>
          </Card>

          {/* New member discount */}
          <Card>
            <CardContent className="px-6 py-5">
              <div className="mb-4 flex items-start gap-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/20 text-accent-foreground flex-shrink-0">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">
                    New member first-order discount
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Applied automatically when a new phone number places their first order
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setConfig((c) =>
                      c ? { ...c, newMemberDiscountEnabled: !c.newMemberDiscountEnabled } : c
                    )
                  }
                  className={cn(
                    'relative h-6 w-11 flex-shrink-0 rounded-full transition-colors',
                    config.newMemberDiscountEnabled ? 'bg-primary' : 'bg-border'
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-all',
                      config.newMemberDiscountEnabled ? 'right-1' : 'left-1'
                    )}
                  />
                </button>
              </div>
              {config.newMemberDiscountEnabled && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Discount type
                    </label>
                    <select
                      value={config.newMemberDiscountType}
                      onChange={(e) =>
                        setConfig((c) =>
                          c
                            ? {
                                ...c,
                                newMemberDiscountType: e.target.value as 'PERCENTAGE' | 'FIXED',
                              }
                            : c
                        )
                      }
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                    >
                      <option value="PERCENTAGE">Percentage off</option>
                      <option value="FIXED">Fixed amount off</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Amount {config.newMemberDiscountType === 'PERCENTAGE' ? '(%)' : '($)'}
                    </label>
                    <LoyaltyNumInput
                      value={config.newMemberDiscountValue}
                      onChange={(v) =>
                        setConfig((c) => (c ? { ...c, newMemberDiscountValue: v } : c))
                      }
                      suffix={config.newMemberDiscountType === 'PERCENTAGE' ? '%' : '$'}
                      min={0}
                      max={config.newMemberDiscountType === 'PERCENTAGE' ? 100 : 500}
                    />
                  </div>
                </div>
              )}
              <p className="mt-3 rounded-lg border border-border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
                Discount is applied to the payment total automatically at checkout. One use per
                phone number.
              </p>
            </CardContent>
          </Card>

          {/* Stripe integration note */}
          <Card>
            <CardContent className="flex items-start gap-4 px-6 py-5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#635bff]/10 flex-shrink-0">
                <CreditCard className="h-4 w-4 text-[#635bff]" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">Stripe discount integration</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Discounts are applied by reducing the payment intent amount before charge. The
                  discount amount and type are stored on the order for your records.
                </p>
              </div>
              <Badge
                variant="outline"
                className="border-green-500/30 bg-green-500/10 text-green-700 flex-shrink-0"
              >
                Connected
              </Badge>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'analytics' && (
        <div className="grid gap-5">
          {analyticsError ? (
            <div className="rounded-[var(--radius)] border border-destructive/20 bg-destructive/10 px-4 py-4 text-sm text-foreground">
              {analyticsError}
            </div>
          ) : null}
          {loadingAnalytics && (
            <div className="flex h-40 items-center justify-center">
              <p className="text-sm text-muted-foreground">Loading analytics…</p>
            </div>
          )}
          {analytics && (
            <>
              {/* KPI row */}
              <div className="grid grid-cols-4 gap-4">
                {[
                  {
                    label: 'Enrolled members',
                    value: analytics.enrolledCount.toLocaleString(),
                    note: 'all time',
                  },
                  {
                    label: 'Points issued',
                    value: analytics.issued.toLocaleString(),
                    note: 'last 30 days',
                  },
                  {
                    label: 'Points redeemed',
                    value: analytics.redeemed.toLocaleString(),
                    note: 'last 30 days',
                  },
                  {
                    label: 'Redemption rate',
                    value:
                      analytics.issued > 0
                        ? `${((analytics.redeemed / analytics.issued) * 100).toFixed(1)}%`
                        : '—',
                    note: 'redeemed / issued',
                  },
                ].map((s) => (
                  <Card key={s.label}>
                    <CardContent className="px-5 py-4">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {s.label}
                      </p>
                      <p className="mt-2 font-heading text-3xl font-bold text-foreground">
                        {s.value}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">{s.note}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-5">
                {/* Top earners */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Top earners</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {analytics.topAccounts.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No members yet.</p>
                    ) : (
                      <div className="grid gap-3">
                        {analytics.topAccounts.map((acc, i) => (
                          <div key={acc.id} className="flex items-center gap-3">
                            <span className="w-4 text-right text-xs font-bold text-muted-foreground">
                              {i + 1}
                            </span>
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary flex-shrink-0">
                              {(acc.customer.name ?? acc.customer.phone).charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-foreground">
                                {acc.customer.name ?? 'Unknown'}{' '}
                                <span className="text-xs font-normal text-muted-foreground">
                                  •••{acc.customer.phone.slice(-4)}
                                </span>
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {acc.lifetimePts.toLocaleString()} lifetime pts
                              </p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-sm font-bold text-primary">
                                {acc.points.toLocaleString()}
                              </p>
                              <p className="text-[10px] text-muted-foreground">balance</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Summary card */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Program summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total members</span>
                        <span className="font-medium text-foreground">
                          {analytics.enrolledCount}
                        </span>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Points issued (30d)</span>
                        <span className="font-medium text-foreground">
                          {analytics.issued.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Points redeemed (30d)</span>
                        <span className="font-medium text-foreground">
                          {analytics.redeemed.toLocaleString()}
                        </span>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Earn rate</span>
                        <span className="font-medium text-foreground">
                          {config.earnRate} pts / $1
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Redemption rate</span>
                        <span className="font-medium text-foreground">
                          {config.redeemRate} pts = $1
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Welcome bonus</span>
                        <span className="font-medium text-foreground">
                          {config.welcomeBonus} pts
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Redemption log */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">Redemption log</CardTitle>
                    <Badge
                      variant="outline"
                      className="border-[#635bff]/30 bg-[#635bff]/10 text-[#635bff] text-[10px]"
                    >
                      Stripe discounts applied at checkout
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {analytics.recentRedemptions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No redemptions yet.</p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          {['Customer', 'Description', 'Points used', 'Date'].map((h) => (
                            <th
                              key={h}
                              className="pb-2 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {analytics.recentRedemptions.map((r) => (
                          <tr key={r.id} className="border-b border-border last:border-none">
                            <td className="py-2.5 pr-4 text-foreground font-medium">
                              {r.account.customer.name ?? '—'}
                              <span className="ml-1 text-xs font-normal text-muted-foreground">
                                •••{r.account.customer.phone.slice(-4)}
                              </span>
                            </td>
                            <td className="py-2.5 pr-4 text-muted-foreground">
                              {r.description ?? 'Redemption'}
                            </td>
                            <td className="py-2.5 pr-4 text-muted-foreground">
                              {Math.abs(r.delta).toLocaleString()}
                            </td>
                            <td className="py-2.5 text-muted-foreground">
                              {new Date(r.createdAt).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function OverviewMetricCard({
  hint,
  label,
  value,
}: {
  hint: string
  label: string
  value: string
}) {
  return (
    <div className="grid w-full min-w-0 gap-1.5 rounded-[var(--radius)] border border-border/70 bg-background px-4 py-4">
      <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      <div className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-base font-semibold leading-6 text-foreground">
        {value}
      </div>
      <div className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-xs leading-4 text-muted-foreground">
        {hint}
      </div>
    </div>
  )
}

function InsightsDashboard({
  data,
  error,
  isLoading,
  onRefresh,
}: {
  data: InsightsData | null
  error: string | null
  isLoading: boolean
  onRefresh: () => void
}) {
  if (isLoading && !data) {
    return <InsightsLoadingSkeleton />
  }

  if (error && !data) {
    return (
      <SectionCard
        title="Insights"
        subtitle="Track revenue, customer behavior, and product performance."
      >
        <div className="grid gap-4">
          <div className="rounded-[var(--radius)] border border-destructive/20 bg-destructive/10 px-5 py-5 text-sm text-destructive">
            {error}
          </div>
          <div>
            <Button type="button" variant="outline" onClick={onRefresh}>
              Retry
            </Button>
          </div>
        </div>
      </SectionCard>
    )
  }

  if (!data) {
    return null
  }

  const repeatRate =
    data.summary.totalCustomers > 0
      ? (data.summary.repeatCustomers / data.summary.totalCustomers) * 100
      : 0
  const ordersChange = formatSignedPercentChange(
    data.summary.ordersThisMonth,
    data.summary.ordersLastMonth
  )
  const revenueChange = formatSignedPercentChange(
    data.summary.revenueThisMonth,
    data.summary.revenueLastMonth
  )
  const hasOrders =
    data.summary.ordersThisMonth > 0 ||
    data.summary.ordersLastMonth > 0 ||
    data.ordersOverTime.some((entry) => entry.orders > 0) ||
    data.topItems.length > 0

  if (!hasOrders) {
    return (
      <SectionCard
        title="Insights"
        subtitle="Track revenue, customer behavior, and product performance."
      >
        <div className="grid gap-4 rounded-[var(--radius)] border border-border/70 bg-background px-6 py-10 text-center">
          <div className="text-lg font-semibold text-foreground">
            Your insights will appear here once you start receiving orders
          </div>
          <div className="text-sm text-muted-foreground">
            As soon as customers place paid orders, EasyMenu will show trends, top sellers, and
            repeat customer data.
          </div>
          <div>
            <Button type="button" variant="outline" onClick={onRefresh}>
              Refresh
            </Button>
          </div>
        </div>
      </SectionCard>
    )
  }

  return (
    <div className="grid gap-6">
      <SectionCard
        title="Insights"
        subtitle="Track revenue, customer behavior, and product performance."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <InsightsMetricCard
            label="Orders this month"
            value={String(data.summary.ordersThisMonth)}
            change={ordersChange}
            hint={`${data.summary.ordersLastMonth} last month`}
          />
          <InsightsMetricCard
            label="Revenue this month"
            value={formatUsd(data.summary.revenueThisMonth)}
            change={revenueChange}
            hint={`${formatUsd(data.summary.revenueLastMonth)} last month`}
          />
          <InsightsMetricCard
            label="Average order value"
            value={formatUsd(data.summary.averageOrderValue)}
            hint="Paid and fulfilled orders"
          />
          <InsightsMetricCard
            label="Total customers"
            value={String(data.summary.totalCustomers)}
            hint="Distinct customer profiles"
          />
          <InsightsMetricCard
            label="Repeat customers"
            value={String(data.summary.repeatCustomers)}
            hint="More than one qualifying order"
          />
          <InsightsMetricCard
            label="Repeat customer rate"
            value={`${repeatRate.toFixed(0)}%`}
            hint="Repeat customers / total customers"
          />
        </div>
      </SectionCard>

      <SectionCard title="Orders over time" subtitle="Daily order volume for the last 30 days.">
        <VerticalBarChart
          data={data.ordersOverTime}
          valueKey="orders"
          labelKey="date"
          formatLabel={shortDateLabel}
        />
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="Top selling items" subtitle="Most ordered items by unit count.">
          <RankedInsightList
            emptyMessage="No item-level sales data yet."
            rows={data.topItems.map((entry) => ({
              key: entry.itemName,
              title: entry.itemName,
              subtitle: `${entry.orderCount} ordered`,
              value: formatUsd(entry.revenue),
            }))}
          />
        </SectionCard>

        <SectionCard
          title="Items never ordered"
          subtitle="Useful for menu cleanup, promo focus, or photography decisions."
        >
          <RankedInsightList
            tone="warning"
            emptyMessage="Every active item has at least one order."
            rows={data.neverOrdered.map((entry) => ({
              key: `${entry.categoryName}-${entry.itemName}`,
              title: entry.itemName,
              subtitle: `${entry.categoryName} • ${entry.daysOnMenu} days on menu`,
              value: 'Never ordered',
            }))}
          />
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="Peak hours" subtitle="When customers place the most orders.">
          <HorizontalBarChart
            data={data.peakHours.map((entry) => ({
              label: `${entry.hour.toString().padStart(2, '0')}:00`,
              value: entry.orders,
            }))}
          />
        </SectionCard>

        <SectionCard title="Peak days" subtitle="Which days of the week are busiest.">
          <HorizontalBarChart
            data={data.peakDays.map((entry) => ({
              label: entry.day,
              value: entry.orders,
            }))}
          />
        </SectionCard>
      </div>

      <SectionCard title="Order composition" subtitle="How large typical orders are.">
        <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
          <div className="rounded-[var(--radius)] border border-border/70 bg-background px-5 py-5">
            <div className="text-sm text-muted-foreground">Average items per order</div>
            <div className="mt-2 text-3xl font-semibold text-foreground">
              {data.orderComposition.averageItemsPerOrder.toFixed(1)}
            </div>
          </div>
          <div className="grid gap-4 rounded-[var(--radius)] border border-border/70 bg-background px-5 py-5">
            <OrderCompositionBreakdown
              multiItemOrders={data.orderComposition.multiItemOrders}
              singleItemOrders={data.orderComposition.singleItemOrders}
            />
          </div>
        </div>
      </SectionCard>
    </div>
  )
}

function InsightsMetricCard({
  label,
  value,
  hint,
  change,
}: {
  label: string
  value: string
  hint: string
  change?: { label: string; tone: 'positive' | 'negative' | 'neutral' }
}) {
  return (
    <div className="grid gap-2 rounded-[var(--radius)] border border-border/70 bg-background px-4 py-4">
      <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold text-foreground">{value}</div>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-muted-foreground">{hint}</span>
        {change ? (
          <span
            className={cn(
              'font-medium',
              change.tone === 'positive' && 'text-emerald-600',
              change.tone === 'negative' && 'text-destructive',
              change.tone === 'neutral' && 'text-muted-foreground'
            )}
          >
            {change.label}
          </span>
        ) : null}
      </div>
    </div>
  )
}

function InsightsLoadingSkeleton() {
  return (
    <div className="grid gap-6">
      <SectionCard
        title="Insights"
        subtitle="Track revenue, customer behavior, and product performance."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="grid gap-3 rounded-[var(--radius)] border border-border/70 bg-background px-4 py-4"
            >
              <div className="h-3 w-28 rounded-full bg-border/60" />
              <div className="h-8 w-24 rounded-full bg-border/80" />
              <div className="h-3 w-36 rounded-full bg-border/60" />
            </div>
          ))}
        </div>
      </SectionCard>
      <SectionCard title="Orders over time" subtitle="Daily order volume for the last 30 days.">
        <div className="h-64 rounded-[var(--radius)] border border-border/70 bg-background" />
      </SectionCard>
      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="Top selling items" subtitle="Most ordered items by unit count.">
          <div className="h-64 rounded-[var(--radius)] border border-border/70 bg-background" />
        </SectionCard>
        <SectionCard
          title="Items never ordered"
          subtitle="Useful for menu cleanup, promo focus, or photography decisions."
        >
          <div className="h-64 rounded-[var(--radius)] border border-border/70 bg-background" />
        </SectionCard>
      </div>
    </div>
  )
}

function VerticalBarChart({
  data,
  formatLabel,
  labelKey,
  valueKey,
}: {
  data: Array<Record<string, string | number>>
  formatLabel: (value: string) => string
  labelKey: string
  valueKey: string
}) {
  const height = 220
  const width = 900
  const paddingTop = 16
  const paddingBottom = 28
  const chartHeight = height - paddingTop - paddingBottom
  const maxValue = Math.max(1, ...data.map((entry) => Number(entry[valueKey] ?? 0)))
  const barWidth = width / Math.max(data.length, 1)

  return (
    <div className="grid gap-3">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full overflow-visible">
        {data.map((entry, index) => {
          const value = Number(entry[valueKey] ?? 0)
          const barHeight = (value / maxValue) * chartHeight
          const x = index * barWidth + 6
          const y = paddingTop + (chartHeight - barHeight)
          const label = String(entry[labelKey] ?? '')
          const showLabel =
            index === 0 ||
            index === data.length - 1 ||
            index % Math.max(1, Math.floor(data.length / 6)) === 0

          return (
            <g key={label}>
              <rect
                x={x}
                y={y}
                width={Math.max(6, barWidth - 10)}
                height={Math.max(3, barHeight)}
                rx={8}
                fill="currentColor"
                className="text-primary/80"
              />
              {showLabel ? (
                <text
                  x={x + Math.max(6, barWidth - 10) / 2}
                  y={height - 8}
                  textAnchor="middle"
                  className="fill-muted-foreground text-[10px]"
                >
                  {formatLabel(label)}
                </text>
              ) : null}
            </g>
          )
        })}
      </svg>
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>0</span>
        <span>{maxValue} orders</span>
      </div>
    </div>
  )
}

function HorizontalBarChart({ data }: { data: Array<{ label: string; value: number }> }) {
  const maxValue = Math.max(1, ...data.map((entry) => entry.value))

  return (
    <div className="grid gap-3">
      {data.length === 0 ? (
        <div className="text-sm text-muted-foreground">No order activity yet.</div>
      ) : (
        data.map((entry) => (
          <div key={entry.label} className="grid gap-2">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-medium text-foreground">{entry.label}</span>
              <span className="text-muted-foreground">{entry.value}</span>
            </div>
            <div className="h-2 rounded-full bg-border/60">
              <div
                className="h-2 rounded-full bg-primary"
                style={{ width: `${(entry.value / maxValue) * 100}%` }}
              />
            </div>
          </div>
        ))
      )}
    </div>
  )
}

function RankedInsightList({
  emptyMessage,
  rows,
  tone = 'default',
}: {
  emptyMessage: string
  rows: Array<{ key: string; title: string; subtitle: string; value: string }>
  tone?: 'default' | 'warning'
}) {
  if (rows.length === 0) {
    return <div className="text-sm text-muted-foreground">{emptyMessage}</div>
  }

  return (
    <div className="grid gap-3">
      {rows.map((row, index) => (
        <div
          key={row.key}
          className={cn(
            'flex items-start justify-between gap-4 rounded-[var(--radius)] border px-4 py-4',
            tone === 'warning'
              ? 'border-amber-200 bg-amber-50/60'
              : 'border-border/70 bg-background'
          )}
        >
          <div className="grid gap-1">
            <div className="flex items-center gap-3">
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                #{index + 1}
              </div>
              <div className="font-medium text-foreground">{row.title}</div>
            </div>
            <div className="text-sm text-muted-foreground">{row.subtitle}</div>
          </div>
          <div className="shrink-0 text-sm font-medium text-foreground">{row.value}</div>
        </div>
      ))}
    </div>
  )
}

function OrderCompositionBreakdown({
  multiItemOrders,
  singleItemOrders,
}: {
  multiItemOrders: number
  singleItemOrders: number
}) {
  const total = singleItemOrders + multiItemOrders
  const singlePercent = total > 0 ? (singleItemOrders / total) * 100 : 0
  const multiPercent = total > 0 ? (multiItemOrders / total) * 100 : 0

  return (
    <div className="grid gap-4">
      <div className="grid gap-3">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="font-medium text-foreground">Single-item orders</span>
          <span className="text-muted-foreground">
            {singleItemOrders} ({singlePercent.toFixed(0)}%)
          </span>
        </div>
        <div className="h-2 rounded-full bg-border/60">
          <div className="h-2 rounded-full bg-primary" style={{ width: `${singlePercent}%` }} />
        </div>
      </div>
      <div className="grid gap-3">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="font-medium text-foreground">Multi-item orders</span>
          <span className="text-muted-foreground">
            {multiItemOrders} ({multiPercent.toFixed(0)}%)
          </span>
        </div>
        <div className="h-2 rounded-full bg-border/60">
          <div
            className="h-2 rounded-full bg-foreground/80"
            style={{ width: `${multiPercent}%` }}
          />
        </div>
      </div>
    </div>
  )
}

function BrandingTab({
  onUploadImage,
  theme,
  onThemeChange,
}: {
  onUploadImage: (file: File, onProgress?: (progressPercent: number) => void) => Promise<string>
  theme: ThemeDraft
  onThemeChange: ThemeChangeHandler
}) {
  const [uploadState, setUploadState] = useState<
    Record<
      BrandingImageField,
      { error: string | null; isUploading: boolean; progressPercent: number }
    >
  >({
    heroImageUrl: { error: null, isUploading: false, progressPercent: 0 },
    logoUrl: { error: null, isUploading: false, progressPercent: 0 },
  })

  async function handleFileChange(key: BrandingImageField, file: File | null) {
    if (!file) {
      return
    }

    setUploadState((current) => ({
      ...current,
      [key]: { error: null, isUploading: true, progressPercent: 0 },
    }))

    try {
      const nextValue = await onUploadImage(file, (progressPercent) => {
        setUploadState((current) => ({
          ...current,
          [key]: {
            ...current[key],
            progressPercent,
          },
        }))
      })
      onThemeChange(key, nextValue)
      setUploadState((current) => ({
        ...current,
        [key]: { error: null, isUploading: false, progressPercent: 100 },
      }))
    } catch (error) {
      setUploadState((current) => ({
        ...current,
        [key]: {
          error: error instanceof Error ? error.message : 'Failed to upload image',
          isUploading: false,
          progressPercent: 0,
        },
      }))
    }
  }

  return (
    <div className="grid gap-5">
      <div className="grid gap-5">
        <FieldShell>
          <Label htmlFor="logo-upload" className={fieldLabelClassName}>
            Logo upload
          </Label>
          <div className="grid gap-3 rounded-[var(--radius)] border border-border/70 bg-background/70 p-4">
            <ImageDropZone
              id="logo-upload"
              copy="Drop image here or click to upload"
              imageUrl={theme.logoUrl}
              imagePresentation="contain"
              disabled={uploadState.logoUrl.isUploading}
              onRemove={() => onThemeChange('logoUrl', '')}
              onFile={(file) => void handleFileChange('logoUrl', file)}
            />
            {uploadState.logoUrl.isUploading ? (
              <div className="text-sm text-muted-foreground">
                Uploading logo… {uploadState.logoUrl.progressPercent}%
              </div>
            ) : null}
            {uploadState.logoUrl.error ? (
              <div className="text-sm text-destructive">{uploadState.logoUrl.error}</div>
            ) : null}
            {!theme.logoUrl ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ImageIcon className="h-4 w-4" />
                Upload a square or horizontal logo.
              </div>
            ) : null}
          </div>
        </FieldShell>

        <FieldShell>
          <Label htmlFor="banner-upload" className={fieldLabelClassName}>
            Banner image upload
          </Label>
          <div className="grid gap-3 rounded-[var(--radius)] border border-border/70 bg-background/70 p-4">
            <ImageDropZone
              id="banner-upload"
              copy="Drop image here or click to upload"
              imageUrl={theme.heroImageUrl}
              imagePresentation="cover"
              disabled={uploadState.heroImageUrl.isUploading}
              overlayImage
              onRemove={() => onThemeChange('heroImageUrl', '')}
              onFile={(file) => void handleFileChange('heroImageUrl', file)}
            />
            {uploadState.heroImageUrl.isUploading ? (
              <div className="text-sm text-muted-foreground">
                Uploading banner… {uploadState.heroImageUrl.progressPercent}%
              </div>
            ) : null}
            {uploadState.heroImageUrl.error ? (
              <div className="text-sm text-destructive">{uploadState.heroImageUrl.error}</div>
            ) : null}
            {!theme.heroImageUrl ? (
              <div className="text-sm text-muted-foreground">
                No banner uploaded. The hero will fall back to a subtle brand-color tint.
              </div>
            ) : null}
          </div>
        </FieldShell>

        <FieldShell>
          <ColorField
            label="Brand color"
            value={theme.primaryColor}
            onChange={(value) => onThemeChange('primaryColor', value)}
          />
        </FieldShell>

        <FieldShell>
          <ColorField
            label="Accent color"
            value={theme.accentColor}
            onChange={(value) => onThemeChange('accentColor', value)}
          />
        </FieldShell>

        <FieldShell>
          <ColorField
            label="Background color"
            value={theme.backgroundColor}
            onChange={(value) => onThemeChange('backgroundColor', value)}
          />
          <p className="mt-2 text-sm text-muted-foreground">
            Any valid hex color is allowed. Dark backgrounds may reduce text contrast in some
            sections.
          </p>
        </FieldShell>

        <FieldShell>
          <ColorField
            label="Font color"
            value={theme.textColor}
            onChange={(value) => onThemeChange('textColor', value)}
          />
        </FieldShell>

        <FieldShell>
          <SelectField
            label="Heading font"
            value={theme.headingFont}
            onChange={(value) => onThemeChange('headingFont', value)}
            options={FONT_OPTIONS as unknown as Array<{ label: string; value: string }>}
          />
        </FieldShell>

        <FieldShell>
          <SelectField
            label="Body/subheadline font"
            value={theme.bodyFont}
            onChange={(value) => onThemeChange('bodyFont', value)}
            options={FONT_OPTIONS as unknown as Array<{ label: string; value: string }>}
          />
        </FieldShell>

        <FieldShell>
          <Label htmlFor="hero-headline" className={fieldLabelClassName}>
            Hero headline
          </Label>
          <textarea
            id="hero-headline"
            value={theme.heroHeadline}
            onChange={(event) => onThemeChange('heroHeadline', event.target.value)}
            rows={2}
            className={textareaClassName}
          />
        </FieldShell>

        <FieldShell>
          <Label htmlFor="hero-subheadline" className={fieldLabelClassName}>
            Hero subheadline
          </Label>
          <textarea
            id="hero-subheadline"
            value={theme.heroSubheadline}
            onChange={(event) => onThemeChange('heroSubheadline', event.target.value)}
            rows={3}
            className={textareaClassName}
          />
        </FieldShell>

        <FieldShell>
          <Label htmlFor="hero-badge" className={fieldLabelClassName}>
            Hero badge text
          </Label>
          <Input
            id="hero-badge"
            value={theme.heroBadgeText}
            onChange={(event) => onThemeChange('heroBadgeText', event.target.value)}
          />
        </FieldShell>

        <FieldShell>
          <Label htmlFor="promo-banner" className={fieldLabelClassName}>
            Promo banner text
          </Label>
          <Input
            id="promo-banner"
            value={theme.promoBannerText}
            onChange={(event) => onThemeChange('promoBannerText', event.target.value)}
          />
        </FieldShell>
      </div>
    </div>
  )
}

function ThemeSaveBar({
  isDirty,
  isLoading,
  isUploadPending,
  isSaving,
  onSave,
  saveMessage,
}: {
  isDirty: boolean
  isLoading: boolean
  isUploadPending: boolean
  isSaving: boolean
  onSave: () => void
  saveMessage: string | null
}) {
  const isSaved = Boolean(saveMessage?.toLowerCase().includes('saved'))

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-[var(--radius)] border border-border/70 bg-background/70 p-4">
      <div className="grid gap-1">
        <div
          className={cn(
            'text-sm font-medium',
            isDirty ? 'text-foreground' : 'text-muted-foreground'
          )}
        >
          {isDirty ? 'Unsaved changes' : 'Draft matches saved settings'}
        </div>
        {saveMessage ? (
          <div className={cn('text-sm', isSaved ? 'text-foreground' : 'text-destructive')}>
            {saveMessage}
          </div>
        ) : null}
      </div>

      <Button
        type="button"
        onClick={onSave}
        disabled={isSaving || isLoading || isUploadPending || !isDirty}
      >
        {isSaving
          ? 'Saving…'
          : isUploadPending
            ? 'Upload in progress…'
            : 'Save storefront settings'}
      </Button>
    </div>
  )
}

function MenuTab({
  onAddItem,
  categories,
  menuActionMessage,
  onBatchTranslate,
  onCategoryDelete,
  onCategoryReorder,
  onCategoryScheduleChange,
  onCategoryVisibilityChange,
  onDeleteItem,
  onItemFeaturedChange,
  onItemImageChange,
  onItemLocalizedNameChange,
  onItemReorder,
  onItemVisibilityChange,
}: {
  onAddItem: (
    categoryId: string,
    input: { name: string; description: string; priceCents: number }
  ) => void | Promise<void>
  categories: MenuCategory[]
  menuActionMessage: string | null
  onBatchTranslate: () => Promise<{ translated: number; skipped: number }>
  onCategoryDelete: (categoryId: string) => void | Promise<void>
  onCategoryReorder: (nextCategoryIds: string[]) => void
  onCategoryScheduleChange: (
    categoryId: string,
    schedule: {
      visibility: MenuCategory['visibility']
      availableFrom: string | null
      availableUntil: string | null
      daysOfWeek: string[] | null
    }
  ) => void | Promise<void>
  onCategoryVisibilityChange: (categoryId: string, visibility: MenuCategory['visibility']) => void
  onDeleteItem: (itemId: string) => void | Promise<void>
  onItemFeaturedChange: (itemId: string, isFeatured: boolean) => void
  onItemImageChange: (itemId: string, photoUrl: string | null) => void | Promise<void>
  onItemLocalizedNameChange: (itemId: string, nameLocalized: string) => void | Promise<void>
  onItemReorder: (categoryId: string, nextItemIds: string[]) => void
  onItemVisibilityChange: (
    itemId: string,
    visibility: CategoryItemEntry['item']['visibility']
  ) => void
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))
  const categoryIds = categories.map((category) => category.id)
  const [translateState, setTranslateState] = useState<'idle' | 'loading' | 'done' | 'error'>(
    'idle'
  )
  const [translateCount, setTranslateCount] = useState(0)
  const [activeDragId, setActiveDragId] = useState<string | null>(null)
  const [activeDragType, setActiveDragType] = useState<'category' | 'item' | null>(null)
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null)
  const [overDragId, setOverDragId] = useState<string | null>(null)

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveDragId(null)
    setActiveDragType(null)
    setActiveCategoryId(null)
    setOverDragId(null)

    if (!over || active.id === over.id) {
      return
    }

    const activeType = active.data.current?.type
    const overType = over.data.current?.type

    if (activeType === 'category' && overType === 'category') {
      const oldIndex = categoryIds.indexOf(String(active.id))
      const newIndex = categoryIds.indexOf(String(over.id))
      if (oldIndex >= 0 && newIndex >= 0 && oldIndex !== newIndex) {
        void Promise.resolve(onCategoryReorder(arrayMove(categoryIds, oldIndex, newIndex)))
      }
      return
    }

    if (activeType === 'item' && overType === 'item') {
      const activeCategory = String(active.data.current?.categoryId ?? '')
      const overCategory = String(over.data.current?.categoryId ?? '')
      if (!activeCategory || activeCategory !== overCategory) {
        return
      }

      const category = categories.find((entry) => entry.id === activeCategory)
      if (!category) {
        return
      }

      const itemIds = category.categoryItems.map((entry) => entry.item.id)
      const oldIndex = itemIds.indexOf(String(active.id))
      const newIndex = itemIds.indexOf(String(over.id))
      if (oldIndex >= 0 && newIndex >= 0 && oldIndex !== newIndex) {
        void Promise.resolve(onItemReorder(activeCategory, arrayMove(itemIds, oldIndex, newIndex)))
      }
    }
  }

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-4">
        <p
          className={cn(
            'text-sm',
            translateState === 'error'
              ? 'text-destructive'
              : menuActionMessage?.includes('Failed')
                ? 'text-destructive'
                : 'text-muted-foreground'
          )}
        >
          {translateState === 'done'
            ? `${translateCount} item${translateCount === 1 ? '' : 's'} translated to Chinese`
            : translateState === 'error'
              ? 'Translation failed — check that ANTHROPIC_API_KEY is set'
              : (menuActionMessage ?? 'These changes shape what customers see in the storefront.')}
        </p>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0"
          disabled={translateState === 'loading'}
          onClick={() => {
            setTranslateState('loading')
            void onBatchTranslate()
              .then((result) => {
                setTranslateCount(result.translated)
                setTranslateState('done')
                setTimeout(() => setTranslateState('idle'), 5000)
              })
              .catch(() => {
                setTranslateState('error')
                setTimeout(() => setTranslateState('idle'), 5000)
              })
          }}
        >
          {translateState === 'loading' ? 'Translating...' : 'Auto-translate to Chinese'}
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={(event) => {
          setActiveDragId(String(event.active.id))
          setActiveDragType(
            (event.active.data.current?.type as 'category' | 'item' | undefined) ?? null
          )
          setActiveCategoryId(
            typeof event.active.data.current?.categoryId === 'string'
              ? event.active.data.current.categoryId
              : null
          )
        }}
        onDragOver={(event) => {
          setOverDragId(event.over ? String(event.over.id) : null)
        }}
        onDragCancel={() => {
          setActiveDragId(null)
          setActiveDragType(null)
          setActiveCategoryId(null)
          setOverDragId(null)
        }}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={categoryIds} strategy={verticalListSortingStrategy}>
          <div className="grid gap-4">
            {categories.map((category) => (
              <SortableCategoryCard
                key={category.id}
                activeCategoryId={activeCategoryId}
                activeDragId={activeDragId}
                activeDragType={activeDragType}
                category={category}
                categoryIds={categoryIds}
                onAddItem={onAddItem}
                onCategoryDelete={onCategoryDelete}
                onCategoryScheduleChange={onCategoryScheduleChange}
                onCategoryVisibilityChange={onCategoryVisibilityChange}
                onDeleteItem={onDeleteItem}
                onItemFeaturedChange={onItemFeaturedChange}
                onItemImageChange={onItemImageChange}
                onItemLocalizedNameChange={onItemLocalizedNameChange}
                onItemVisibilityChange={onItemVisibilityChange}
                overDragId={overDragId}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
}

function SortableCategoryCard({
  activeCategoryId,
  activeDragId,
  activeDragType,
  category,
  categoryIds,
  onAddItem,
  onCategoryDelete,
  onCategoryScheduleChange,
  onCategoryVisibilityChange,
  onDeleteItem,
  onItemFeaturedChange,
  onItemImageChange,
  onItemLocalizedNameChange,
  onItemVisibilityChange,
  overDragId,
}: {
  activeCategoryId: string | null
  activeDragId: string | null
  activeDragType: 'category' | 'item' | null
  category: MenuCategory
  categoryIds: string[]
  onAddItem: (
    categoryId: string,
    input: { name: string; description: string; priceCents: number }
  ) => void | Promise<void>
  onCategoryDelete: (categoryId: string) => void | Promise<void>
  onCategoryScheduleChange: (
    categoryId: string,
    schedule: {
      visibility: MenuCategory['visibility']
      availableFrom: string | null
      availableUntil: string | null
      daysOfWeek: string[] | null
    }
  ) => void | Promise<void>
  onCategoryVisibilityChange: (categoryId: string, visibility: MenuCategory['visibility']) => void
  onDeleteItem: (itemId: string) => void | Promise<void>
  onItemFeaturedChange: (itemId: string, isFeatured: boolean) => void
  onItemImageChange: (itemId: string, photoUrl: string | null) => void | Promise<void>
  onItemLocalizedNameChange: (itemId: string, nameLocalized: string) => void | Promise<void>
  onItemVisibilityChange: (
    itemId: string,
    visibility: CategoryItemEntry['item']['visibility']
  ) => void
  overDragId: string | null
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: category.id,
    data: { type: 'category', categoryId: category.id },
  })

  const itemIds = category.categoryItems.map((entry) => entry.item.id)
  const isHidden = category.visibility === 'HIDDEN'
  const isScheduled = category.visibility === 'SCHEDULED'
  const isScheduledAvailableNow = isCategoryAvailableNow(category)
  const [scheduleEditorOpen, setScheduleEditorOpen] = useState(false)
  const [availableFrom, setAvailableFrom] = useState(scheduleTimeInputValue(category.availableFrom))
  const [availableUntil, setAvailableUntil] = useState(
    scheduleTimeInputValue(category.availableUntil)
  )
  const [selectedDays, setSelectedDays] = useState<string[]>(category.daysOfWeek ?? [])
  const categoryIndex = categoryIds.indexOf(category.id)
  const activeCategoryIndex = activeDragId ? categoryIds.indexOf(activeDragId) : -1
  const showTopDropIndicator =
    activeDragType === 'category' &&
    overDragId === category.id &&
    activeCategoryIndex > categoryIndex
  const showBottomDropIndicator =
    activeDragType === 'category' &&
    overDragId === category.id &&
    activeCategoryIndex >= 0 &&
    activeCategoryIndex < categoryIndex

  useEffect(() => {
    setAvailableFrom(scheduleTimeInputValue(category.availableFrom))
    setAvailableUntil(scheduleTimeInputValue(category.availableUntil))
    setSelectedDays(category.daysOfWeek ?? [])
  }, [category.availableFrom, category.availableUntil, category.daysOfWeek])

  function toggleScheduleDay(day: string) {
    setSelectedDays((current) =>
      current.includes(day) ? current.filter((entry) => entry !== day) : [...current, day]
    )
  }

  async function handleSaveSchedule() {
    await onCategoryScheduleChange(category.id, {
      visibility: 'SCHEDULED',
      availableFrom: scheduleTimeInputToIso(availableFrom),
      availableUntil: scheduleTimeInputToIso(availableUntil),
      daysOfWeek: selectedDays.length > 0 ? selectedDays : null,
    })
    setScheduleEditorOpen(false)
  }

  async function handleRemoveSchedule() {
    await onCategoryScheduleChange(category.id, {
      visibility: 'AVAILABLE',
      availableFrom: null,
      availableUntil: null,
      daysOfWeek: null,
    })
    setScheduleEditorOpen(false)
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.7 : 1,
        position: 'relative',
      }}
    >
      {showTopDropIndicator ? <DropIndicator position="top" /> : null}
      <motion.div layout>
        <Card
          className={cn(
            'gap-4 border border-border/80 py-0 shadow-sm',
            isHidden ? 'bg-background/70' : 'bg-card',
            activeDragType === 'category' && overDragId === category.id ? 'ring-2 ring-ring/20' : ''
          )}
        >
          <CardContent className="grid gap-4 px-4 py-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <DragHandleButton
                  attributes={attributes}
                  listeners={listeners}
                  label={`Reorder category ${category.name}`}
                />
                <div className="min-w-0 space-y-1">
                  <div
                    className={cn(
                      'flex items-center gap-2 truncate font-medium text-foreground',
                      isHidden ? 'opacity-60' : ''
                    )}
                  >
                    {isScheduled ? (
                      <Clock3 className="h-4 w-4 shrink-0 text-muted-foreground" />
                    ) : null}
                    <span className="truncate">{category.name}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <span>{category.categoryItems.length} items</span>
                    {isScheduled ? (
                      <Badge
                        variant="outline"
                        className="border-primary/20 bg-primary/5 text-foreground"
                      >
                        {formatCategorySchedule(category)}
                      </Badge>
                    ) : null}
                    {isScheduled && !isScheduledAvailableNow ? (
                      <Badge
                        variant="outline"
                        className="border-border/70 bg-background text-muted-foreground"
                      >
                        Currently hidden - outside scheduled hours
                      </Badge>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
                <IconToggleButton
                  active={!isHidden}
                  label={isHidden ? `Show ${category.name}` : `Hide ${category.name}`}
                  onClick={() =>
                    onCategoryVisibilityChange(
                      category.id,
                      isHidden
                        ? category.availableFrom ||
                          category.availableUntil ||
                          (category.daysOfWeek?.length ?? 0) > 0
                          ? 'SCHEDULED'
                          : 'AVAILABLE'
                        : 'HIDDEN'
                    )
                  }
                >
                  {isHidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </IconToggleButton>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setScheduleEditorOpen((current) => !current)}
                  className={cn(
                    'rounded-[calc(var(--radius)-8px)]',
                    isScheduled
                      ? 'border-primary/20 bg-primary/5 text-foreground'
                      : 'text-muted-foreground'
                  )}
                >
                  <Clock3 className="h-4 w-4" />
                  {isScheduled ? 'Edit schedule' : 'Schedule'}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (
                      window.confirm(
                        `Delete the ${category.name} section? Items in that section will no longer appear there.`
                      )
                    ) {
                      void Promise.resolve(onCategoryDelete(category.id))
                    }
                  }}
                  className="rounded-[calc(var(--radius)-8px)] border-destructive/20 text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete section
                </Button>
              </div>
            </div>

            {scheduleEditorOpen ? (
              <div className="grid w-full min-w-0 gap-4 rounded-[var(--radius)] border border-border/70 bg-background/70 p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <FieldShell>
                    <Label htmlFor={`category-${category.id}-available-from`}>Available from</Label>
                    <Input
                      id={`category-${category.id}-available-from`}
                      type="time"
                      value={availableFrom}
                      onChange={(event) => setAvailableFrom(event.target.value)}
                    />
                  </FieldShell>
                  <FieldShell>
                    <Label htmlFor={`category-${category.id}-available-until`}>
                      Available until
                    </Label>
                    <Input
                      id={`category-${category.id}-available-until`}
                      type="time"
                      value={availableUntil}
                      onChange={(event) => setAvailableUntil(event.target.value)}
                    />
                  </FieldShell>
                </div>

                <FieldShell>
                  <Label>Days of week</Label>
                  <div className="flex flex-wrap gap-2">
                    {scheduleDayOrder.map((day) => {
                      const active = selectedDays.includes(day)

                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleScheduleDay(day)}
                          className={cn(
                            'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                            active
                              ? 'border-[#1a1a1a] bg-[#1a1a1a] text-white shadow-sm'
                              : 'border-border/70 bg-transparent text-muted-foreground hover:border-border hover:text-foreground'
                          )}
                        >
                          {scheduleDayLabels[day]}
                        </button>
                      )
                    })}
                  </div>
                </FieldShell>

                <div className="flex flex-wrap gap-3">
                  <Button type="button" onClick={() => void handleSaveSchedule()}>
                    Save schedule
                  </Button>
                  {isScheduled ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void handleRemoveSchedule()}
                    >
                      Remove schedule
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setScheduleEditorOpen(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : null}

            <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
              <div className="grid gap-3">
                {category.categoryItems.map((entry) => (
                  <SortableItemRow
                    activeCategoryId={activeCategoryId}
                    activeDragId={activeDragId}
                    activeDragType={activeDragType}
                    key={entry.item.id}
                    categoryId={category.id}
                    entry={entry}
                    itemIds={itemIds}
                    onDelete={onDeleteItem}
                    onFeaturedChange={onItemFeaturedChange}
                    onImageChange={onItemImageChange}
                    onLocalizedNameChange={onItemLocalizedNameChange}
                    onVisibilityChange={onItemVisibilityChange}
                    overDragId={overDragId}
                  />
                ))}
              </div>
            </SortableContext>

            <Separator />

            <AddItemInlineForm categoryId={category.id} onSubmit={onAddItem} />
          </CardContent>
        </Card>
      </motion.div>
      {showBottomDropIndicator ? <DropIndicator position="bottom" /> : null}
    </div>
  )
}

function SortableItemRow({
  activeCategoryId,
  activeDragId,
  activeDragType,
  categoryId,
  entry,
  itemIds,
  onDelete,
  onFeaturedChange,
  onImageChange,
  onLocalizedNameChange,
  onVisibilityChange,
  overDragId,
}: {
  activeCategoryId: string | null
  activeDragId: string | null
  activeDragType: 'category' | 'item' | null
  categoryId: string
  entry: CategoryItemEntry
  itemIds: string[]
  onDelete: (itemId: string) => void | Promise<void>
  onFeaturedChange: (itemId: string, isFeatured: boolean) => void
  onImageChange: (itemId: string, photoUrl: string | null) => void | Promise<void>
  onLocalizedNameChange: (itemId: string, nameLocalized: string) => void | Promise<void>
  onVisibilityChange: (itemId: string, visibility: CategoryItemEntry['item']['visibility']) => void
  overDragId: string | null
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: entry.item.id,
    data: { type: 'item', categoryId, itemId: entry.item.id },
  })

  const isHidden = entry.item.visibility === 'HIDDEN'
  const isSoldOut = entry.item.visibility === 'SOLD_OUT'
  const itemIndex = itemIds.indexOf(entry.item.id)
  const activeItemIndex = activeDragId ? itemIds.indexOf(activeDragId) : -1
  const isSameCategoryDrag = activeDragType === 'item' && activeCategoryId === categoryId
  const showTopDropIndicator =
    isSameCategoryDrag && overDragId === entry.item.id && activeItemIndex > itemIndex
  const showBottomDropIndicator =
    isSameCategoryDrag &&
    overDragId === entry.item.id &&
    activeItemIndex >= 0 &&
    activeItemIndex < itemIndex
  const [localizedNameDraft, setLocalizedNameDraft] = useState(entry.item.nameLocalized ?? '')
  const [isSavingLocalizedName, setIsSavingLocalizedName] = useState(false)

  useEffect(() => {
    setLocalizedNameDraft(entry.item.nameLocalized ?? '')
  }, [entry.item.nameLocalized])

  const saveLocalizedName = async () => {
    if ((entry.item.nameLocalized ?? '') === localizedNameDraft) {
      return
    }

    setIsSavingLocalizedName(true)
    try {
      await onLocalizedNameChange(entry.item.id, localizedNameDraft)
    } finally {
      setIsSavingLocalizedName(false)
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : isHidden ? 0.6 : 1,
        position: 'relative',
      }}
    >
      {showTopDropIndicator ? <DropIndicator position="top" inset /> : null}
      <motion.div layout>
        <div
          className={cn(
            'grid gap-3 rounded-[var(--radius)] border border-border/70 bg-background px-3 py-3',
            isSoldOut ? 'bg-accent/10' : '',
            isSameCategoryDrag && overDragId === entry.item.id ? 'ring-2 ring-ring/20' : ''
          )}
        >
          <div className="grid gap-3 sm:grid-cols-[auto_48px_minmax(0,1fr)] sm:items-start">
            <DragHandleButton
              attributes={attributes}
              listeners={listeners}
              label={`Reorder item ${entry.item.name}`}
            />
            <ImageDropZone
              id={`item-image-${entry.item.id}`}
              compact
              copy="Add image"
              imageUrl={entry.item.photoUrl ?? undefined}
              imagePresentation="cover"
              onRemove={() => void onImageChange(entry.item.id, null)}
              onFile={(file) =>
                void readFileAsDataUrl(file).then((value) => onImageChange(entry.item.id, value))
              }
            />
            <div className="min-w-0">
              <div className="font-medium text-foreground">{entry.item.name}</div>
              {entry.item.nameLocalized ? (
                <div className="mt-0.5 text-sm text-muted-foreground">
                  {entry.item.nameLocalized}
                </div>
              ) : null}
              <div className="mt-1 text-sm text-muted-foreground">
                {formatPrice(entry.item.variants[0]?.priceCents ?? entry.item.basePriceCents)}
              </div>
            </div>
          </div>

          <div className="grid gap-2 sm:pl-[84px]">
            <Label htmlFor={`item-localized-name-${entry.item.id}`}>
              Local language name (optional)
            </Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id={`item-localized-name-${entry.item.id}`}
                value={localizedNameDraft}
                placeholder="e.g. 蒜蓉结"
                onChange={(event) => setLocalizedNameDraft(event.target.value)}
                onBlur={() => void saveLocalizedName()}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={
                  isSavingLocalizedName || localizedNameDraft === (entry.item.nameLocalized ?? '')
                }
                onClick={() => void saveLocalizedName()}
              >
                {isSavingLocalizedName ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:pl-[84px]">
            <IconToggleButton
              active={!isHidden}
              label={isHidden ? `Show ${entry.item.name}` : `Hide ${entry.item.name}`}
              onClick={() => onVisibilityChange(entry.item.id, isHidden ? 'AVAILABLE' : 'HIDDEN')}
            >
              {isHidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </IconToggleButton>

            <IconToggleButton
              active={entry.item.isFeatured}
              label={
                entry.item.isFeatured
                  ? `Unfeature ${entry.item.name}`
                  : `Feature ${entry.item.name}`
              }
              onClick={() => onFeaturedChange(entry.item.id, !entry.item.isFeatured)}
            >
              <Star className={cn('h-4 w-4', entry.item.isFeatured ? 'fill-current' : '')} />
            </IconToggleButton>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                onVisibilityChange(entry.item.id, isSoldOut ? 'AVAILABLE' : 'SOLD_OUT')
              }
              className={cn(
                'rounded-[calc(var(--radius)-8px)]',
                isSoldOut ? 'border-accent bg-accent/15 text-foreground' : 'text-muted-foreground'
              )}
            >
              Sold out
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                if (window.confirm(`Delete ${entry.item.name}?`)) {
                  void Promise.resolve(onDelete(entry.item.id))
                }
              }}
              className="rounded-[calc(var(--radius)-8px)] border-destructive/20 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>
      </motion.div>
      {showBottomDropIndicator ? <DropIndicator position="bottom" inset /> : null}
    </div>
  )
}

function AddItemInlineForm({
  categoryId,
  onSubmit,
}: {
  categoryId: string
  onSubmit: (
    categoryId: string,
    input: { name: string; description: string; priceCents: number }
  ) => void | Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [description, setDescription] = useState('')

  async function handleSubmit() {
    const trimmedName = name.trim()
    const parsedPrice = Number(price)

    if (!trimmedName || Number.isNaN(parsedPrice) || parsedPrice < 0) {
      return
    }

    await onSubmit(categoryId, {
      name: trimmedName,
      description: description.trim(),
      priceCents: Math.round(parsedPrice * 100),
    })

    setName('')
    setPrice('')
    setDescription('')
    setOpen(false)
  }

  return (
    <div className="grid gap-3">
      {!open ? (
        <Button type="button" variant="outline" onClick={() => setOpen(true)} className="w-fit">
          Add item
        </Button>
      ) : (
        <>
          <div className="grid gap-3 lg:grid-cols-[1.5fr_0.8fr]">
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Item name"
            />
            <Input
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              placeholder="Price"
              inputMode="decimal"
            />
          </div>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Description"
            rows={2}
            className={textareaClassName}
          />
          <div className="flex flex-wrap gap-3">
            <Button type="button" onClick={() => void handleSubmit()}>
              Create item
            </Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

function DropIndicator({
  inset = false,
  position,
}: {
  inset?: boolean
  position: 'top' | 'bottom'
}) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute h-1 rounded-full bg-primary/70"
      style={{
        [position]: inset ? 6 : -8,
        left: inset ? 10 : 0,
        right: inset ? 10 : 0,
      }}
    />
  )
}

function DragHandleButton({
  attributes,
  label,
  listeners,
}: {
  attributes: ReturnType<typeof useSortable>['attributes']
  label: string
  listeners: ReturnType<typeof useSortable>['listeners']
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="icon-sm"
      aria-label={label}
      {...attributes}
      {...listeners}
      className="shrink-0 cursor-grab rounded-[calc(var(--radius)-8px)] text-muted-foreground"
    >
      <GripIcon />
    </Button>
  )
}

function IconToggleButton({
  active,
  children,
  label,
  onClick,
}: {
  active: boolean
  children: React.ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <Button
      type="button"
      aria-label={label}
      onClick={onClick}
      variant="outline"
      size="icon-sm"
      className={cn(
        'rounded-[calc(var(--radius)-8px)]',
        active ? 'border-primary/30 bg-primary/10 text-foreground' : 'text-muted-foreground'
      )}
    >
      {children}
    </Button>
  )
}

function GripIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="9" cy="6" r="1.6" />
      <circle cx="15" cy="6" r="1.6" />
      <circle cx="9" cy="12" r="1.6" />
      <circle cx="15" cy="12" r="1.6" />
      <circle cx="9" cy="18" r="1.6" />
      <circle cx="15" cy="18" r="1.6" />
    </svg>
  )
}

function FieldShell({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('grid gap-2', className)}>{children}</div>
}

function ImageDropZone({
  compact = false,
  copy,
  disabled = false,
  id,
  imagePresentation = 'cover',
  imageUrl,
  onRemove,
  overlayImage = false,
  onFile,
}: {
  compact?: boolean
  copy: string
  disabled?: boolean
  id: string
  imagePresentation?: 'contain' | 'cover'
  imageUrl?: string
  onRemove?: () => void
  overlayImage?: boolean
  onFile: (file: File) => void
}) {
  const [isDragging, setIsDragging] = useState(false)

  function handleFiles(files: FileList | null) {
    if (disabled) {
      return
    }

    const file = files?.[0]
    if (file) {
      onFile(file)
    }
  }

  return (
    <label
      htmlFor={id}
      className={cn(
        'relative flex cursor-pointer items-center justify-center overflow-hidden rounded-[var(--radius)] border text-center text-sm text-muted-foreground transition-colors',
        imageUrl
          ? compact
            ? 'h-12 w-12 border-border bg-background'
            : 'min-h-28 border-border bg-card'
          : 'border-dashed border-border bg-background/80 hover:bg-background',
        compact ? 'px-3 py-2' : 'px-4 py-6',
        !imageUrl && compact ? 'min-h-12' : '',
        !imageUrl && !compact ? 'min-h-28' : '',
        isDragging ? 'border-primary bg-primary/10 text-foreground' : '',
        disabled ? 'cursor-not-allowed opacity-70' : ''
      )}
      onDragOver={(event) => {
        if (disabled) {
          return
        }
        event.preventDefault()
        setIsDragging(true)
      }}
      onDragLeave={(event) => {
        event.preventDefault()
        setIsDragging(false)
      }}
      onDrop={(event) => {
        if (disabled) {
          return
        }
        event.preventDefault()
        setIsDragging(false)
        handleFiles(event.dataTransfer.files)
      }}
    >
      <input
        id={id}
        type="file"
        accept="image/*"
        className="sr-only"
        disabled={disabled}
        onChange={(event) => handleFiles(event.target.files)}
      />
      {imageUrl ? (
        <>
          <div
            className={cn(
              'absolute inset-0',
              imagePresentation === 'contain'
                ? 'bg-contain bg-center bg-no-repeat'
                : 'bg-cover bg-center'
            )}
            style={{
              backgroundImage: overlayImage
                ? `linear-gradient(rgba(39, 28, 23, 0.44), rgba(39, 28, 23, 0.44)), url(${imageUrl})`
                : `url(${imageUrl})`,
            }}
          />
          {!compact ? (
            <div className="absolute inset-x-0 bottom-0 bg-background/90 px-3 py-2 text-xs text-foreground">
              Click or drop to replace
            </div>
          ) : null}
          {onRemove ? (
            <button
              type="button"
              className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background text-foreground shadow-sm"
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
                onRemove()
              }}
              aria-label="Remove image"
            >
              ×
            </button>
          ) : null}
        </>
      ) : (
        <div className="grid gap-1">
          <div className="font-medium text-foreground">{copy}</div>
          {!compact ? <div>PNG, JPG, or WebP</div> : null}
        </div>
      )}
    </label>
  )
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <FieldShell>
      <Label className={fieldLabelClassName}>{label}</Label>
      <div className="grid gap-3">
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-12 w-full rounded-[var(--radius)] border border-input bg-background p-1"
        />
        <Input value={value} onChange={(event) => onChange(event.target.value)} />
      </div>
    </FieldShell>
  )
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: Array<{ label: string; value: string }>
}) {
  return (
    <FieldShell>
      <Label className={fieldLabelClassName}>{label}</Label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={selectClassName}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldShell>
  )
}

const fieldLabelClassName = 'text-sm font-medium text-muted-foreground'
const textareaClassName =
  'min-h-24 w-full rounded-[var(--radius)] border border-input bg-background px-3 py-3 text-sm text-foreground shadow-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30'
const selectClassName =
  'h-10 w-full rounded-[var(--radius)] border border-input bg-background px-3 text-sm text-foreground shadow-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30'
