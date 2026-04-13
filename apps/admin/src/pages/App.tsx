import React, { useCallback, useEffect, useMemo, useState } from "react"
import { UserButton, useAuth, useClerk, useUser } from "@clerk/react"
import {
  DndContext,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { AnimatePresence, motion } from "framer-motion"
import {
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
  Sparkles,
  Star,
  Store,
  Trash2,
} from "lucide-react"

import { AssistantPanel } from "../assistant/AssistantPanel"
import {
  fetchTenantMenu,
  isCategoryAvailableNow,
  type MenuCategory,
  type MenuResponse,
} from "../lib/menu"
import { adminFetchJson, adminUploadFileJson } from "../lib/api"
import { OnboardingPage } from "./OnboardingPage"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

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
  buttonStyle: "rounded" | "square"
  heroLayout: "immersive" | "minimal"
  menuCardLayout: "classic" | "compact" | "photo-first"
  showFeaturedBadges: boolean
  showCategoryChips: boolean
}

type StripeStatus = {
  configured: boolean
  displayName: string
  stripeAccountId: string | null
  chargesEnabled: boolean
  payoutsEnabled: boolean
  status: "not_connected" | "onboarding_required" | "active"
}

const defaultThemeDraft: ThemeDraft = {
  appTitle: "Restaurant",
  tagline: "Direct ordering, owned by the restaurant.",
  logoUrl: "",
  heroHeadline: "Neighborhood favorites without marketplace markup.",
  heroSubheadline: "Make repeat visits easier with direct ordering and better menu presentation.",
  heroBadgeText: "Direct ordering",
  promoBannerText: "Give loyal customers a direct-order reward funded by marketplace savings.",
  heroImageUrl: "",
  primaryColor: "#b42318",
  accentColor: "#eca934",
  backgroundColor: "#faf7f2",
  surfaceColor: "#fffcf7",
  textColor: "#271c17",
  mutedColor: "#745e54",
  borderColor: "#e8dcd1",
  onPrimary: "#fff7ed",
  bodyFont: "Inter, sans-serif",
  headingFont: "Georgia, serif",
  radius: 12,
  buttonStyle: "rounded",
  heroLayout: "minimal",
  menuCardLayout: "photo-first",
  showFeaturedBadges: true,
  showCategoryChips: true,
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function getBrandConfig(menu: MenuResponse) {
  const nested = asRecord(menu.brand)
  return asRecord(menu.brandConfig?.config) ?? asRecord(nested?.config) ?? nested ?? {}
}

function getString(config: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = config[key]
    if (typeof value === "string") {
      return value
    }
  }

  return undefined
}

function buildDraft(menu: MenuResponse): ThemeDraft {
  const config = getBrandConfig(menu)
  const primaryColor = getString(config, "primaryColor") ?? defaultThemeDraft.primaryColor
  const backgroundColor =
    getString(config, "backgroundColor") ?? defaultThemeDraft.backgroundColor
  const accentColor = getString(config, "accentColor") ?? derivedAccentColor(primaryColor)
  const surfaceColor = getString(config, "surfaceColor") ?? defaultThemeDraft.surfaceColor
  const textColor = getString(config, "textColor") ?? defaultThemeDraft.textColor
  const mutedColor = getString(config, "mutedColor") ?? defaultThemeDraft.mutedColor
  const borderColor =
    getString(config, "borderColor") ?? derivedBorderColor(primaryColor, backgroundColor)

  return {
    ...defaultThemeDraft,
    appTitle: getString(config, "appTitle") ?? defaultThemeDraft.appTitle,
    tagline: getString(config, "tagline") ?? defaultThemeDraft.tagline,
    logoUrl: getString(config, "logoUrl") ?? defaultThemeDraft.logoUrl,
    heroHeadline: getString(config, "heroHeadline") ?? defaultThemeDraft.heroHeadline,
    heroSubheadline: getString(config, "heroSubheadline") ?? defaultThemeDraft.heroSubheadline,
    heroBadgeText: getString(config, "heroBadgeText") ?? defaultThemeDraft.heroBadgeText,
    promoBannerText: getString(config, "promoBannerText") ?? defaultThemeDraft.promoBannerText,
    heroImageUrl: getString(config, "heroImageUrl") ?? defaultThemeDraft.heroImageUrl,
    primaryColor,
    accentColor,
    backgroundColor,
    surfaceColor,
    textColor,
    mutedColor,
    borderColor,
    onPrimary: getString(config, "onPrimary") ?? defaultThemeDraft.onPrimary,
    bodyFont: getString(config, "fontFamily", "bodyFont") ?? defaultThemeDraft.bodyFont,
    headingFont: getString(config, "headingFont") ?? defaultThemeDraft.headingFont,
    radius: defaultThemeDraft.radius,
    buttonStyle: defaultThemeDraft.buttonStyle,
    heroLayout: defaultThemeDraft.heroLayout,
    menuCardLayout: defaultThemeDraft.menuCardLayout,
    showFeaturedBadges: defaultThemeDraft.showFeaturedBadges,
    showCategoryChips: defaultThemeDraft.showCategoryChips,
  }
}

type AdminSection =
  | "overview"
  | "branding"
  | "menu"
  | "insights"
  | "payments"
  | "assistant"
type ThemeChangeHandler = <K extends keyof ThemeDraft>(key: K, value: ThemeDraft[K]) => void
type CategoryItemEntry = MenuCategory["categoryItems"][number]
type BrandingImageField = "logoUrl" | "heroImageUrl"
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
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "0.0.0.0"
}

function storefrontUrlForTenant(tenantSlug: string) {
  if (typeof window === "undefined") {
    return `https://${tenantSlug}.easymenu.website`
  }

  const hostname = window.location.hostname.toLowerCase()
  const protocol = window.location.protocol

  if (localHostname(hostname)) {
    return `http://localhost:5173/?tenant=${encodeURIComponent(tenantSlug)}`
  }

  if (hostname.endsWith(".easymenu.website")) {
    return `${protocol}//${tenantSlug}.easymenu.website`
  }

  return `https://${tenantSlug}.easymenu.website`
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
  { label: "Inter", value: '"Inter", sans-serif' },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Playfair Display", value: '"Playfair Display", serif' },
  { label: "Lora", value: '"Lora", serif' },
  { label: "Merriweather", value: '"Merriweather", serif' },
  { label: "Raleway", value: '"Raleway", sans-serif' },
  { label: "Montserrat", value: '"Montserrat", sans-serif' },
  { label: "Nunito", value: '"Nunito", sans-serif' },
  { label: "DM Sans", value: '"DM Sans", sans-serif' },
  { label: "DM Serif Display", value: '"DM Serif Display", serif' },
  { label: "Fraunces", value: '"Fraunces", serif' },
  { label: "Cabinet Grotesk", value: '"Cabinet Grotesk", sans-serif' },
  { label: "Plus Jakarta Sans", value: '"Plus Jakarta Sans", sans-serif' },
  { label: "Libre Baskerville", value: '"Libre Baskerville", serif' },
  { label: "Cormorant Garamond", value: '"Cormorant Garamond", serif' },
] as const

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace("#", "").trim()
  const expanded =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => `${char}${char}`)
          .join("")
      : normalized

  const value = Number.parseInt(expanded, 16)
  const red = (value >> 16) & 255
  const green = (value >> 8) & 255
  const blue = value & 255

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`
}

function parseHexColor(hex: string) {
  const normalized = hex.replace("#", "").trim()
  const expanded =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => `${char}${char}`)
          .join("")
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
    .map((value) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, "0"))
    .join("")}`
}

function mixHexColors(base: string, overlay: string, alpha: number) {
  const background = parseHexColor(base)
  const foreground = parseHexColor(overlay)

  return toHexColor(
    background.red * (1 - alpha) + foreground.red * alpha,
    background.green * (1 - alpha) + foreground.green * alpha,
    background.blue * (1 - alpha) + foreground.blue * alpha,
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
      if (typeof reader.result === "string") {
        resolve(reader.result)
        return
      }

      reject(new Error("Failed to read file"))
    }
    reader.onerror = () => reject(new Error("Failed to read file"))
    reader.readAsDataURL(file)
  })
}

function formatPrice(priceCents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(priceCents / 100)
}

function formatUsd(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

function formatSignedPercentChange(current: number, previous: number) {
  if (previous === 0) {
    if (current === 0) {
      return { label: "0%", tone: "neutral" as const }
    }

    return { label: "New", tone: "positive" as const }
  }

  const delta = ((current - previous) / previous) * 100
  const prefix = delta > 0 ? "+" : ""

  return {
    label: `${prefix}${delta.toFixed(0)}%`,
    tone: delta > 0 ? ("positive" as const) : delta < 0 ? ("negative" as const) : ("neutral" as const),
  }
}

function shortDateLabel(value: string) {
  const date = new Date(`${value}T00:00:00`)
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}

function tenantSlugFromMetadata(value: unknown) {
  if (typeof value !== "string") {
    return null
  }

  const nextValue = value.trim()
  return nextValue.length > 0 ? nextValue : null
}

function previewCategories(categories: MenuCategory[]) {
  return categories
    .filter(
      (category) => category.visibility !== "HIDDEN" && isCategoryAvailableNow(category),
    )
    .map((category) => ({
      ...category,
      categoryItems: category.categoryItems.filter((entry) => entry.item.visibility !== "HIDDEN"),
    }))
    .filter((category) => category.categoryItems.length > 0)
}

function previewStyle(theme: ThemeDraft): React.CSSProperties {
  const backgroundColor = theme.backgroundColor
  const accentColor = theme.accentColor
  const borderColor = theme.borderColor

  return {
    ["--preview-primary" as string]: theme.primaryColor,
    ["--preview-accent" as string]: accentColor,
    ["--preview-background" as string]: backgroundColor,
    ["--preview-surface" as string]: theme.surfaceColor,
    ["--preview-text" as string]: theme.textColor,
    ["--preview-muted" as string]: theme.mutedColor,
    ["--preview-border" as string]: borderColor,
    ["--preview-on-primary" as string]: theme.onPrimary,
    ["--preview-radius" as string]: `${defaultThemeDraft.radius}px`,
    ["--preview-body-font" as string]: theme.bodyFont,
    ["--preview-heading-font" as string]: theme.headingFont,
  } as React.CSSProperties
}

const scheduleDayOrder = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const

const scheduleDayLabels: Record<(typeof scheduleDayOrder)[number], string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
}

const scheduleTimeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: "UTC",
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
    return ""
  }

  const hours = String(parsed.getUTCHours()).padStart(2, "0")
  const minutes = String(parsed.getUTCMinutes()).padStart(2, "0")
  return `${hours}:${minutes}`
}

function scheduleTimeInputToIso(value: string) {
  if (!value) {
    return null
  }

  const [hoursString, minutesString] = value.split(":")
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
      scheduleDayOrder.includes(day as (typeof scheduleDayOrder)[number]),
    )

  if (normalized.length === 0 || normalized.length === scheduleDayOrder.length) {
    return "Every day"
  }

  const indexes = [...new Set(normalized.map((day) => scheduleDayOrder.indexOf(day)))].sort(
    (left, right) => left - right,
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
        : `${scheduleDayLabels[scheduleDayOrder[start]]}\u2013${scheduleDayLabels[scheduleDayOrder[end]]}`,
    )
  }

  return ranges.join(", ")
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

function PreviewPane({
  theme,
  categories,
}: {
  theme: ThemeDraft
  categories: MenuCategory[]
}) {
  const cardRadius = defaultThemeDraft.radius
  const visible = previewCategories(categories)

  return (
    <div
      className="min-h-[860px] rounded-[calc(var(--radius)*1.2)] border border-border/70 bg-card p-5 shadow-sm"
      style={{
        ...previewStyle(theme),
        fontFamily: "var(--preview-body-font)",
      }}
    >
      <div
        style={{
          minHeight: "100%",
          borderRadius: "24px",
          background: "var(--preview-background)",
          color: "var(--preview-text)",
          padding: 24,
          boxShadow: "var(--shadow-brand)",
        }}
      >
        <div
          style={{
            borderRadius: cardRadius,
            padding: "22px 22px 16px",
            background: theme.heroImageUrl
              ? `linear-gradient(${hexToRgba("#271c17", 0.48)}, ${hexToRgba("#271c17", 0.48)}), url(${theme.heroImageUrl}) center/cover`
              : `linear-gradient(135deg, ${hexToRgba(theme.primaryColor, 0.14)}, ${hexToRgba(theme.primaryColor, 0.1)}), var(--preview-surface)`,
            border: "1px solid var(--preview-border)",
            display: "grid",
            gap: 18,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start" }}>
            {theme.logoUrl ? (
              <img
                src={theme.logoUrl}
                alt={`${theme.appTitle} logo`}
                style={{
                  maxHeight: 56,
                  width: "auto",
                  maxWidth: 180,
                  objectFit: "contain",
                  flexShrink: 0,
                }}
              />
            ) : (
              <div />
            )}
            {theme.heroBadgeText.trim() ? (
              <div
                style={{
                  display: "inline-flex",
                  width: "fit-content",
                  borderRadius: cardRadius,
                  padding: "6px 10px",
                  background: hexToRgba("#fffcf7", 0.84),
                  border: "1px solid var(--preview-border)",
                  color: "var(--preview-muted)",
                  fontSize: 12,
                }}
              >
                {theme.heroBadgeText}
              </div>
            ) : (
              <div />
            )}
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            <h1
              style={{
                margin: 0,
                fontFamily: "var(--preview-heading-font)",
                fontSize: 56,
                lineHeight: 0.95,
                fontWeight: 700,
                maxWidth: 760,
                color: theme.heroImageUrl ? "#fff7ed" : "var(--preview-text)",
              }}
            >
              {theme.heroHeadline}
            </h1>
            <p
              style={{
                margin: 0,
                color: theme.heroImageUrl ? hexToRgba("#fff7ed", 0.84) : "var(--preview-muted)",
                maxWidth: 620,
                lineHeight: 1.7,
                fontSize: 19,
              }}
            >
              {theme.heroSubheadline}
            </p>
          </div>
          {theme.showCategoryChips ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {visible.map((category) => (
                <span
                  key={category.id}
                  style={{
                    borderRadius: cardRadius,
                    border: "1px solid var(--preview-border)",
                    background: "var(--preview-surface)",
                    color: "var(--preview-text)",
                    padding: "7px 12px",
                    fontSize: 13,
                  }}
                >
                  {category.name}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        {theme.promoBannerText ? (
          <div
            style={{
              marginTop: 16,
              borderRadius: cardRadius,
              border: "1px solid var(--preview-border)",
              background: "var(--preview-surface)",
              color: "var(--preview-muted)",
              padding: "13px 16px",
              fontSize: 14,
              lineHeight: 1.55,
            }}
          >
            {theme.promoBannerText}
          </div>
        ) : null}

        <div style={{ display: "grid", gap: 22, marginTop: 22 }}>
          {visible.map((category) => (
            <section key={category.id} style={{ display: "grid", gap: 12 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 16,
                }}
              >
                <h2
                  style={{
                    margin: 0,
                    fontFamily: "var(--preview-heading-font)",
                    fontSize: 30,
                    fontWeight: 700,
                  }}
                >
                  {category.name}
                </h2>
                <span style={{ color: "var(--preview-muted)", fontSize: 13 }}>
                  {category.categoryItems.length} items
                </span>
              </div>

              <div style={{ display: "grid", gap: 12 }}>
                {category.categoryItems.map(({ id, item }) => (
                  <article
                    key={id}
                    style={{
                      borderRadius: cardRadius,
                      padding: theme.menuCardLayout === "compact" ? 14 : 18,
                      border: "1px solid var(--preview-border)",
                      background: "var(--preview-surface)",
                      display: "grid",
                      gap: 12,
                      opacity: item.visibility === "SOLD_OUT" ? 0.76 : 1,
                      gridTemplateColumns: item.photoUrl ? "132px minmax(0, 1fr)" : "1fr",
                    }}
                  >
                    {item.photoUrl ? (
                      <div
                        style={{
                          minHeight: 124,
                          borderRadius: Math.max(12, cardRadius - 8),
                          border: "1px solid var(--preview-border)",
                          background: `url(${item.photoUrl}) center/cover`,
                        }}
                      />
                    ) : null}

                    <div style={{ display: "grid", gap: 12 }}>
                      <div style={{ display: "grid", gap: 8 }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            gap: 16,
                          }}
                        >
                          <div style={{ display: "grid", gap: 8 }}>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                flexWrap: "wrap",
                                gap: 8,
                              }}
                            >
                              <h3
                                style={{
                                  margin: 0,
                                  fontSize: 20,
                                  fontWeight: 600,
                                  fontFamily: "var(--preview-heading-font)",
                                }}
                              >
                                {item.name}
                              </h3>
                              {theme.showFeaturedBadges && item.isFeatured ? (
                                <span
                                  style={{
                                    borderRadius: cardRadius,
                                    border: "1px solid transparent",
                                    background: "var(--preview-primary)",
                                    color: "var(--preview-on-primary)",
                                    fontSize: 11,
                                    padding: "4px 8px",
                                  }}
                                >
                                  Featured
                                </span>
                              ) : null}
                              {item.visibility === "SOLD_OUT" ? (
                                <span
                                  style={{
                                    borderRadius: cardRadius,
                                    border: "1px solid var(--preview-border)",
                                    background: "var(--preview-surface)",
                                    color: "var(--preview-muted)",
                                    fontSize: 11,
                                    padding: "4px 8px",
                                  }}
                                >
                                  Sold out
                                </span>
                              ) : null}
                            </div>
                            {item.description ? (
                              <p
                                style={{
                                  margin: 0,
                                  color: "var(--preview-muted)",
                                  lineHeight: 1.55,
                                }}
                              >
                                {item.description}
                              </p>
                            ) : null}
                          </div>
                          <strong>{formatPrice(item.variants[0]?.priceCents ?? item.basePriceCents)}</strong>
                        </div>

                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                          {item.tags.slice(0, 1).map((tag) => (
                            <span
                              key={tag}
                              style={{
                                borderRadius: cardRadius,
                                border: "1px solid var(--preview-border)",
                                color: "var(--preview-muted)",
                                fontSize: 12,
                                padding: "4px 8px",
                              }}
                            >
                              {tag}
                            </span>
                          ))}
                          {item.prepTimeMinutes ? (
                            <span style={{ color: "var(--preview-muted)", fontSize: 12 }}>
                              {item.prepTimeMinutes} min prep
                            </span>
                          ) : null}
                        </div>
                      </div>

                      {item.visibility === "SOLD_OUT" ? (
                        <div style={{ color: "var(--preview-muted)", fontSize: 14, textAlign: "right" }}>Sold out today</div>
                      ) : (
                        <div style={{ display: "flex", justifyContent: "flex-end" }}>
                          <button
                            type="button"
                            style={{
                              width: "fit-content",
                              borderRadius: cardRadius,
                              border: "1px solid transparent",
                              padding: "10px 14px",
                              background:
                                "linear-gradient(135deg, var(--preview-primary), var(--preview-accent))",
                              color: "var(--preview-on-primary)",
                              fontWeight: 600,
                            }}
                          >
                            Add
                          </button>
                        </div>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}

export const App: React.FC = () => {
  const { getToken } = useAuth()
  const { signOut } = useClerk()
  const { isLoaded, user } = useUser()
  const tenantSlug = tenantSlugFromMetadata(user?.publicMetadata?.tenantSlug)
  const linkedTenantSlug = tenantSlug ?? ""
  const [pathname, setPathname] = useState(currentAdminPath)
  const [menuData, setMenuData] = useState<MenuResponse | null>(null)
  const [savedTheme, setSavedTheme] = useState<ThemeDraft>(defaultThemeDraft)
  const [draftTheme, setDraftTheme] = useState<ThemeDraft>(defaultThemeDraft)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [menuActionMessage, setMenuActionMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [stripeStatus, setStripeStatus] = useState<StripeStatus | null>(null)
  const [stripeMessage, setStripeMessage] = useState<string | null>(null)
  const [isStripeLoading, setIsStripeLoading] = useState(true)
  const [isStripeLaunching, setIsStripeLaunching] = useState(false)
  const [isBrandingUploadInProgress, setIsBrandingUploadInProgress] = useState(false)
  const [activeSection, setActiveSection] = useState<AdminSection>("overview")
  const [overviewOrdersToday, setOverviewOrdersToday] = useState(0)
  const [isOverviewLoading, setIsOverviewLoading] = useState(true)
  const [insightsData, setInsightsData] = useState<InsightsData | null>(null)
  const [isInsightsLoading, setIsInsightsLoading] = useState(false)
  const [insightsError, setInsightsError] = useState<string | null>(null)

  const handleOnboardingCompleted = useCallback(async () => {
    await user?.reload()
    window.location.assign("/")
  }, [user])

  useEffect(() => {
    function handlePopState() {
      setPathname(currentAdminPath())
    }

    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [])

  useEffect(() => {
    if (!isLoaded) {
      return
    }

    if (!tenantSlug && pathname !== "/signup") {
      window.history.replaceState({}, "", "/signup")
      setPathname("/signup")
      return
    }

    if (tenantSlug && pathname === "/signup") {
      window.history.replaceState({}, "", "/")
      setPathname("/")
    }
  }, [isLoaded, pathname, tenantSlug])

  async function patchAdminJson<T>(path: string, body: unknown) {
    return adminFetchJson<T>(path, {
      method: "PATCH",
      tenantSlug: linkedTenantSlug,
      getToken,
      body,
    })
  }

  async function postAdminJson<T>(path: string, body: unknown) {
    return adminFetchJson<T>(path, {
      method: "POST",
      tenantSlug: linkedTenantSlug,
      getToken,
      body,
    })
  }

  async function uploadBrandingImage(
    file: File,
    onProgress?: (progressPercent: number) => void,
  ) {
    if (!tenantSlug) {
      throw new Error("Your account is not linked to a restaurant. Contact support.")
    }

    setSaveMessage(null)
    setIsBrandingUploadInProgress(true)

    try {
      const response = await adminUploadFileJson<{ url: string }>(
        "/admin/branding/upload-image",
        {
          file,
          getToken,
          onProgress,
          tenantSlug: linkedTenantSlug,
        },
      )

      return response.url
    } finally {
      setIsBrandingUploadInProgress(false)
    }
  }

  async function deleteAdmin(path: string) {
    await adminFetchJson<void>(path, {
      method: "DELETE",
      tenantSlug: linkedTenantSlug,
      getToken,
    })
  }

  async function loadStripeStatus() {
    return adminFetchJson<StripeStatus>("/admin/payments/stripe/status", {
      tenantSlug: linkedTenantSlug,
      getToken,
    })
  }

  async function loadOverviewOrders() {
    return adminFetchJson<{ orders: OverviewOrder[] }>("/v1/kitchen/orders", {
      tenantSlug: linkedTenantSlug,
      getToken,
    })
  }

  async function loadInsights() {
    const [
      summary,
      ordersOverTime,
      topItems,
      neverOrdered,
      peakHours,
      peakDays,
      orderComposition,
    ] = await Promise.all([
      adminFetchJson<InsightsSummary>("/admin/insights/summary", {
        tenantSlug: linkedTenantSlug,
        getToken,
      }),
      adminFetchJson<InsightsOrdersOverTimePoint[]>("/admin/insights/orders-over-time", {
        tenantSlug: linkedTenantSlug,
        getToken,
      }),
      adminFetchJson<InsightsTopItem[]>("/admin/insights/top-items", {
        tenantSlug: linkedTenantSlug,
        getToken,
      }),
      adminFetchJson<InsightsNeverOrderedItem[]>("/admin/insights/never-ordered", {
        tenantSlug: linkedTenantSlug,
        getToken,
      }),
      adminFetchJson<InsightsPeakHour[]>("/admin/insights/peak-hours", {
        tenantSlug: linkedTenantSlug,
        getToken,
      }),
      adminFetchJson<InsightsPeakDay[]>("/admin/insights/peak-days", {
        tenantSlug: linkedTenantSlug,
        getToken,
      }),
      adminFetchJson<InsightsOrderComposition>("/admin/insights/order-composition", {
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

      try {
        const [menu, nextStripeStatus] = await Promise.all([
          fetchTenantMenu(linkedTenantSlug, getToken),
          loadStripeStatus(),
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
        setOverviewOrdersToday(
          overviewOrdersResult.orders.filter((order) => new Date(order.createdAt) >= startOfToday)
            .length,
        )
      } catch (nextError) {
        if (cancelled) return
        setError(nextError instanceof Error ? nextError.message : "Failed to load menu")
      } finally {
        if (!cancelled) {
          setIsLoading(false)
          setIsStripeLoading(false)
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
    if (!tenantSlug || activeSection !== "insights") {
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

        setInsightsError(
          nextError instanceof Error ? nextError.message : "Failed to load insights",
        )
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
    const primaryEmail = user?.primaryEmailAddress?.emailAddress ?? ""

    return (
      <>
        <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
          <UserButton />
        </div>
        <OnboardingPage
          clerkUserId={user?.id ?? ""}
          email={primaryEmail}
          getToken={getToken}
          onCompleted={handleOnboardingCompleted}
        />
      </>
    )
  }

  const categories = menuData?.categories ?? []
  const isThemeDirty = useMemo(
    () => !areThemesEqual(savedTheme, draftTheme),
    [draftTheme, savedTheme],
  )

  const updateTheme = <K extends keyof ThemeDraft>(key: K, value: ThemeDraft[K]) => {
    setDraftTheme((current) => {
      if (key === "primaryColor") {
        const nextPrimary = value as ThemeDraft["primaryColor"]
        return {
          ...current,
          primaryColor: nextPrimary,
          accentColor: derivedAccentColor(nextPrimary),
          borderColor: derivedBorderColor(nextPrimary, current.backgroundColor),
        }
      }

      if (key === "backgroundColor") {
        const nextBackground = value as ThemeDraft["backgroundColor"]
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

  const updateMenuCategories = (
    updater: (categories: MenuCategory[]) => MenuCategory[],
  ) => {
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
      throw new Error("Your account is not linked to a restaurant. Contact support.")
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
      setSaveMessage("Your account is not linked to a restaurant. Contact support.")
      return
    }

    if (isBrandingUploadInProgress) {
      setSaveMessage("Wait for the image upload to finish before saving.")
      return
    }

    setIsSaving(true)
    setSaveMessage(null)

    try {
      await patchAdminJson("/admin/brand-config", themePayload(draftTheme))

      await reloadMenuData(true)
      setSaveMessage("Storefront settings saved.")
    } catch (nextError) {
      setSaveMessage(nextError instanceof Error ? nextError.message : "Failed to save theme")
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
      setMenuActionMessage("Saving category order…")
      await Promise.all(
        reordered.map((category, index) =>
          patchAdminJson(`/admin/menu/categories/${category.id}`, {
            sortOrder: index,
          }),
        ),
      )
      await reloadMenuData()
      setMenuActionMessage("Category order saved.")
    } catch (nextError) {
      await reloadMenuData()
      setMenuActionMessage(
        nextError instanceof Error ? nextError.message : "Failed to reorder categories",
      )
    }
  }

  const updateCategoryVisibility = async (
    categoryId: string,
    visibility: MenuCategory["visibility"],
  ) => {
    const previousCategories = categories

    updateMenuCategories((current) =>
      current.map((category) =>
        category.id === categoryId ? { ...category, visibility } : category,
      ),
    )

    try {
      setMenuActionMessage("Saving category visibility…")
      await patchAdminJson(`/admin/menu/categories/${categoryId}/availability`, {
        visibility,
      })
      await reloadMenuData()
      setMenuActionMessage("Category visibility updated.")
    } catch (nextError) {
      updateMenuCategories(() => previousCategories)
      setMenuActionMessage(
        nextError instanceof Error ? nextError.message : "Failed to update category visibility",
      )
    }
  }

  const updateCategorySchedule = async (
    categoryId: string,
    schedule: {
      visibility: MenuCategory["visibility"]
      availableFrom: string | null
      availableUntil: string | null
      daysOfWeek: string[] | null
    },
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
          : category,
      ),
    )

    try {
      setMenuActionMessage("Saving category schedule…")
      await patchAdminJson(`/admin/menu/categories/${categoryId}`, schedule)
      await reloadMenuData()
      setMenuActionMessage(
        schedule.visibility === "AVAILABLE"
          ? "Category schedule removed."
          : "Category schedule updated.",
      )
    } catch (nextError) {
      updateMenuCategories(() => previousCategories)
      setMenuActionMessage(
        nextError instanceof Error ? nextError.message : "Failed to update category schedule",
      )
    }
  }

  const deleteCategoryFromMenu = async (categoryId: string) => {
    const previousCategories = categories
    updateMenuCategories((current) => current.filter((category) => category.id !== categoryId))

    try {
      setMenuActionMessage("Deleting section…")
      await deleteAdmin(`/admin/menu/categories/${categoryId}`)
      await reloadMenuData()
      setMenuActionMessage("Section deleted.")
    } catch (nextError) {
      updateMenuCategories(() => previousCategories)
      setMenuActionMessage(
        nextError instanceof Error ? nextError.message : "Failed to delete section",
      )
    }
  }

  const reorderCategoryItem = async (categoryId: string, nextItemIds: string[]) => {
    const category = categories.find((entry) => entry.id === categoryId)
    if (!category) return

    const entryByItemId = new Map(
      category.categoryItems.map((entry) => [entry.item.id, entry]),
    )
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
        entry.id === categoryId
          ? { ...entry, categoryItems: reorderedEntries }
          : entry,
      ),
    )

    try {
      setMenuActionMessage("Saving item order…")
      await patchAdminJson(`/admin/menu/categories/${categoryId}/items/reorder`, {
        itemIds: nextItemIds,
      })
      await reloadMenuData()
      setMenuActionMessage("Item order saved.")
    } catch (nextError) {
      updateMenuCategories(() => previousCategories)
      setMenuActionMessage(nextError instanceof Error ? nextError.message : "Failed to reorder items")
    }
  }

  const updateItemPresentation = async (
    itemId: string,
    body: Record<string, unknown>,
    successMessage: string,
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
                  ...(typeof body.isFeatured === "boolean"
                    ? { isFeatured: body.isFeatured }
                    : {}),
                  ...(Object.prototype.hasOwnProperty.call(body, "photoUrl")
                    ? { photoUrl: (body.photoUrl as string | null | undefined) ?? null }
                    : {}),
                },
              }
            : entry,
        ),
      })),
    )

    try {
      setMenuActionMessage("Saving item settings…")
      await patchAdminJson(`/admin/menu/items/${itemId}`, body)
      await reloadMenuData()
      setMenuActionMessage(successMessage)
    } catch (nextError) {
      updateMenuCategories(() => previousCategories)
      setMenuActionMessage(nextError instanceof Error ? nextError.message : "Failed to update item")
    }
  }

  const updateItemVisibility = async (
    itemId: string,
    visibility: CategoryItemEntry["item"]["visibility"],
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
            : entry,
        ),
      })),
    )

    try {
      setMenuActionMessage(
        visibility === "HIDDEN"
          ? "Hiding item…"
          : visibility === "SOLD_OUT"
            ? "Marking item sold out…"
            : "Updating item visibility…",
      )
      await patchAdminJson(`/admin/menu/items/${itemId}/availability`, { visibility })
      await reloadMenuData()
      setMenuActionMessage(
        visibility === "HIDDEN"
          ? "Item hidden."
          : visibility === "SOLD_OUT"
            ? "Item marked sold out."
            : "Item shown.",
      )
    } catch (nextError) {
      updateMenuCategories(() => previousCategories)
      setMenuActionMessage(nextError instanceof Error ? nextError.message : "Failed to update availability")
    }
  }

  const addItemToCategory = async (
    categoryId: string,
    input: { name: string; description: string; priceCents: number },
  ) => {
    const category = categories.find((entry) => entry.id === categoryId)
    if (!category) return

    try {
      setMenuActionMessage("Adding item…")
      const created = await postAdminJson<{ id: string }>("/admin/menu/items", {
        name: input.name,
        description: input.description || null,
        basePriceCents: input.priceCents,
        photoUrl: null,
        tags: [],
        prepTimeMinutes: 0,
        specialInstructionsEnabled: false,
        isFeatured: false,
        visibility: "AVAILABLE",
        categoryIds: [categoryId],
      })

      await patchAdminJson(`/admin/menu/categories/${categoryId}/items/reorder`, {
        itemIds: [...category.categoryItems.map((entry) => entry.item.id), created.id],
      })

      await reloadMenuData()
      setMenuActionMessage("Item added.")
    } catch (nextError) {
      setMenuActionMessage(nextError instanceof Error ? nextError.message : "Failed to add item")
    }
  }

  const deleteItemFromMenu = async (itemId: string) => {
    const previousCategories = categories
    updateMenuCategories((current) =>
      current.map((category) => ({
        ...category,
        categoryItems: category.categoryItems.filter((entry) => entry.item.id !== itemId),
      })),
    )

    try {
      setMenuActionMessage("Deleting item…")
      await deleteAdmin(`/admin/menu/items/${itemId}`)
      await reloadMenuData()
      setMenuActionMessage("Item deleted.")
    } catch (nextError) {
      updateMenuCategories(() => previousCategories)
      setMenuActionMessage(nextError instanceof Error ? nextError.message : "Failed to delete item")
    }
  }

  const launchStripeOnboarding = async () => {
    setIsStripeLaunching(true)
    setStripeMessage(null)

    try {
      const response = await adminFetchJson<{ url: string }>(
        "/admin/payments/stripe/onboarding-link",
        {
          method: "POST",
          tenantSlug: linkedTenantSlug,
          getToken,
        },
      )
      window.location.assign(response.url)
    } catch (nextError) {
      setStripeMessage(
        nextError instanceof Error
          ? nextError.message
          : "Failed to launch Stripe onboarding",
      )
    } finally {
      setIsStripeLaunching(false)
    }
  }

  const stripeStatusLabel =
    stripeStatus?.status === "active"
      ? "Connected and ready"
      : stripeStatus?.status === "onboarding_required"
        ? "Onboarding required"
        : "Not connected"
  const restaurantDisplayName =
    draftTheme.appTitle.trim() || stripeStatus?.displayName || linkedTenantSlug
  const userDisplayName =
    user?.fullName ||
    user?.firstName ||
    user?.primaryEmailAddress?.emailAddress ||
    "Admin"
  const storefrontUrl = storefrontUrlForTenant(linkedTenantSlug)

  const paymentsPanel = (
    <SectionCard
      title="Stripe payouts"
      subtitle="Connect the restaurant to Stripe before enabling live card payments."
    >
      <div className="grid gap-4">
        <div className="flex items-start justify-between gap-4 rounded-[var(--radius)] border border-border/70 bg-background px-4 py-4">
          <div className="grid gap-2">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <CreditCard className="h-4 w-4 text-primary" />
              {stripeStatus?.displayName ?? "Restaurant payouts"}
            </div>
            <div className="text-sm text-muted-foreground">
              {isStripeLoading ? "Checking Stripe onboarding status…" : stripeStatusLabel}
            </div>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "border-border bg-card",
              stripeStatus?.status === "active" && "border-primary/30 text-foreground",
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
                {stripeStatus.chargesEnabled ? "Yes" : "No"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span>Payouts enabled</span>
              <span className="font-medium text-foreground">
                {stripeStatus.payoutsEnabled ? "Yes" : "No"}
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
            {stripeStatus?.status === "active"
              ? "Review Stripe account"
              : stripeStatus?.status === "onboarding_required"
                ? "Continue Stripe onboarding"
                : "Connect Stripe"}
          </span>
          <ExternalLink className="h-4 w-4" />
        </Button>

        {!stripeStatus?.configured ? (
          <div className="text-sm text-muted-foreground">
            Stripe is not configured yet. Add the Stripe env values before onboarding a restaurant.
          </div>
        ) : null}

        {stripeStatus?.status === "active" ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            This restaurant can take live card payments.
          </div>
        ) : null}
      </div>
    </SectionCard>
  )

  const overviewPanel = (
    <div className="grid gap-6">
      <SectionCard
        title="Overview"
        subtitle="A quick snapshot of the restaurant setup before you edit the storefront."
      >
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          <OverviewMetricCard
            label="Stripe status"
            value={isStripeLoading ? "Checking…" : stripeStatusLabel}
            hint={stripeStatus?.status === "active" ? "Payments live" : "Needs review"}
          />
          <OverviewMetricCard
            label="Orders today"
            value={isOverviewLoading ? "Loading…" : String(overviewOrdersToday)}
            hint="Current kitchen feed"
          />
          <OverviewMetricCard
            label="Restaurant slug"
            value={linkedTenantSlug}
            hint="Tenant routing key"
          />
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button type="button" onClick={() => setActiveSection("branding")}>
            Open branding
          </Button>
          <Button type="button" variant="outline" onClick={() => setActiveSection("menu")}>
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
          onCategoryDelete={deleteCategoryFromMenu}
          onAddItem={addItemToCategory}
          onCategoryScheduleChange={updateCategorySchedule}
          onCategoryVisibilityChange={updateCategoryVisibility}
          onCategoryReorder={reorderCategories}
          onDeleteItem={deleteItemFromMenu}
          onItemFeaturedChange={(itemId, isFeatured) =>
            void updateItemPresentation(itemId, { isFeatured }, "Featured state updated.")
          }
          onItemImageChange={(itemId, photoUrl) =>
            void updateItemPresentation(
              itemId,
              { photoUrl },
              photoUrl ? "Item image updated." : "Item image removed.",
            )
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
              nextError instanceof Error ? nextError.message : "Failed to load insights",
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
          if (targets.includes("menu")) {
            void reloadMenuData(true)
          }
        }}
      />
    </SectionCard>
  )

  const activeSectionContent = (() => {
    switch (activeSection) {
      case "overview":
        return overviewPanel
      case "branding":
        return brandingPanel
      case "menu":
        return menuPanel
      case "insights":
        return insightsPanel
      case "payments":
        return paymentsPanel
      case "assistant":
        return assistantPanel
    }
  })()

  return (
    <motion.main
      className="flex h-[100dvh] min-h-[100dvh] flex-col overflow-hidden bg-background"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
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
                window.open(storefrontUrl, "_blank", "noopener,noreferrer")
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
                  <div className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-xs text-muted-foreground">
                    {linkedTenantSlug}
                  </div>
                </div>
              </div>
            </div>

            <SectionNav activeSection={activeSection} onChange={setActiveSection} />
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
                transition={{ duration: 0.18, ease: "easeOut" }}
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
                  window.open(storefrontUrl, "_blank", "noopener,noreferrer")
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
    { id: "overview", icon: <LayoutDashboard className="h-4 w-4" />, label: "Overview" },
    { id: "branding", icon: <Palette className="h-4 w-4" />, label: "Branding" },
    { id: "menu", icon: <Store className="h-4 w-4" />, label: "Menu" },
    { id: "insights", icon: <BarChart3 className="h-4 w-4" />, label: "Insights" },
    { id: "payments", icon: <CreditCard className="h-4 w-4" />, label: "Payments" },
    { id: "assistant", icon: <Bot className="h-4 w-4" />, label: "Assistant" },
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
              "w-full justify-start gap-2.5 rounded-[var(--radius)] px-3 py-2.5 text-left text-[13px] leading-5",
              isActive
                ? "border border-primary/25 bg-primary/10 text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
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
    { id: "overview", label: "Overview" },
    { id: "branding", label: "Branding" },
    { id: "menu", label: "Menu" },
    { id: "insights", label: "Insights" },
    { id: "payments", label: "Payments" },
    { id: "assistant", label: "Assistant" },
  ]

  return (
    <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex w-max min-w-full gap-2">
        {sections.map((section) => (
          <Button
            key={section.id}
            type="button"
            variant={activeSection === section.id ? "default" : "outline"}
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
    <div className="min-w-0 grid gap-1.5 rounded-[var(--radius)] border border-border/70 bg-background px-4 py-4">
      <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      <div className="overflow-hidden text-ellipsis whitespace-nowrap text-base font-semibold leading-6 text-foreground">
        {value}
      </div>
      <div className="text-xs leading-4 text-muted-foreground">{hint}</div>
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
      <SectionCard title="Insights" subtitle="Track revenue, customer behavior, and product performance.">
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
    data.summary.ordersLastMonth,
  )
  const revenueChange = formatSignedPercentChange(
    data.summary.revenueThisMonth,
    data.summary.revenueLastMonth,
  )
  const hasOrders =
    data.summary.ordersThisMonth > 0 ||
    data.summary.ordersLastMonth > 0 ||
    data.ordersOverTime.some((entry) => entry.orders > 0) ||
    data.topItems.length > 0

  if (!hasOrders) {
    return (
      <SectionCard title="Insights" subtitle="Track revenue, customer behavior, and product performance.">
        <div className="grid gap-4 rounded-[var(--radius)] border border-border/70 bg-background px-6 py-10 text-center">
          <div className="text-lg font-semibold text-foreground">Your insights will appear here once you start receiving orders</div>
          <div className="text-sm text-muted-foreground">
            As soon as customers place paid orders, EasyMenu will show trends, top sellers, and repeat customer data.
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
      <SectionCard title="Insights" subtitle="Track revenue, customer behavior, and product performance.">
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
              value: "Never ordered",
            }))}
          />
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="Peak hours" subtitle="When customers place the most orders.">
          <HorizontalBarChart
            data={data.peakHours.map((entry) => ({
              label: `${entry.hour.toString().padStart(2, "0")}:00`,
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
  change?: { label: string; tone: "positive" | "negative" | "neutral" }
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
              "font-medium",
              change.tone === "positive" && "text-emerald-600",
              change.tone === "negative" && "text-destructive",
              change.tone === "neutral" && "text-muted-foreground",
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
      <SectionCard title="Insights" subtitle="Track revenue, customer behavior, and product performance.">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="grid gap-3 rounded-[var(--radius)] border border-border/70 bg-background px-4 py-4">
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
        <SectionCard title="Items never ordered" subtitle="Useful for menu cleanup, promo focus, or photography decisions.">
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
          const label = String(entry[labelKey] ?? "")
          const showLabel =
            index === 0 || index === data.length - 1 || index % Math.max(1, Math.floor(data.length / 6)) === 0

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

function HorizontalBarChart({
  data,
}: {
  data: Array<{ label: string; value: number }>
}) {
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
  tone = "default",
}: {
  emptyMessage: string
  rows: Array<{ key: string; title: string; subtitle: string; value: string }>
  tone?: "default" | "warning"
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
            "flex items-start justify-between gap-4 rounded-[var(--radius)] border px-4 py-4",
            tone === "warning"
              ? "border-amber-200 bg-amber-50/60"
              : "border-border/70 bg-background",
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
          <div className="h-2 rounded-full bg-foreground/80" style={{ width: `${multiPercent}%` }} />
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
  onUploadImage: (
    file: File,
    onProgress?: (progressPercent: number) => void,
  ) => Promise<string>
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

  async function handleFileChange(
    key: BrandingImageField,
    file: File | null,
  ) {
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
          error: error instanceof Error ? error.message : "Failed to upload image",
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
              onRemove={() => onThemeChange("logoUrl", "")}
              onFile={(file) => void handleFileChange("logoUrl", file)}
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
              onRemove={() => onThemeChange("heroImageUrl", "")}
              onFile={(file) => void handleFileChange("heroImageUrl", file)}
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
            onChange={(value) => onThemeChange("primaryColor", value)}
          />
        </FieldShell>

        <FieldShell>
          <ColorField
            label="Accent color"
            value={theme.accentColor}
            onChange={(value) => onThemeChange("accentColor", value)}
          />
        </FieldShell>

        <FieldShell>
          <ColorField
            label="Background color"
            value={theme.backgroundColor}
            onChange={(value) => onThemeChange("backgroundColor", value)}
          />
          <p className="mt-2 text-sm text-muted-foreground">
            Any valid hex color is allowed. Dark backgrounds may reduce text contrast in some sections.
          </p>
        </FieldShell>

        <FieldShell>
          <SelectField
            label="Heading font"
            value={theme.headingFont}
            onChange={(value) => onThemeChange("headingFont", value)}
            options={FONT_OPTIONS as unknown as Array<{ label: string; value: string }>}
          />
        </FieldShell>

        <FieldShell>
          <SelectField
            label="Body/subheadline font"
            value={theme.bodyFont}
            onChange={(value) => onThemeChange("bodyFont", value)}
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
            onChange={(event) => onThemeChange("heroHeadline", event.target.value)}
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
            onChange={(event) => onThemeChange("heroSubheadline", event.target.value)}
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
            onChange={(event) => onThemeChange("heroBadgeText", event.target.value)}
          />
        </FieldShell>

        <FieldShell>
          <Label htmlFor="promo-banner" className={fieldLabelClassName}>
            Promo banner text
          </Label>
          <Input
            id="promo-banner"
            value={theme.promoBannerText}
            onChange={(event) => onThemeChange("promoBannerText", event.target.value)}
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
  const isSaved = Boolean(saveMessage?.toLowerCase().includes("saved"))

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-[var(--radius)] border border-border/70 bg-background/70 p-4">
      <div className="grid gap-1">
        <div className={cn("text-sm font-medium", isDirty ? "text-foreground" : "text-muted-foreground")}>
          {isDirty ? "Unsaved changes" : "Draft matches saved settings"}
        </div>
        {saveMessage ? (
          <div className={cn("text-sm", isSaved ? "text-foreground" : "text-destructive")}>
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
          ? "Saving…"
          : isUploadPending
            ? "Upload in progress…"
            : "Save storefront settings"}
      </Button>
    </div>
  )
}

function MenuTab({
  onAddItem,
  categories,
  menuActionMessage,
  onCategoryDelete,
  onCategoryReorder,
  onCategoryScheduleChange,
  onCategoryVisibilityChange,
  onDeleteItem,
  onItemFeaturedChange,
  onItemImageChange,
  onItemReorder,
  onItemVisibilityChange,
}: {
  onAddItem: (
    categoryId: string,
    input: { name: string; description: string; priceCents: number },
  ) => void | Promise<void>
  categories: MenuCategory[]
  menuActionMessage: string | null
  onCategoryDelete: (categoryId: string) => void | Promise<void>
  onCategoryReorder: (nextCategoryIds: string[]) => void
  onCategoryScheduleChange: (
    categoryId: string,
    schedule: {
      visibility: MenuCategory["visibility"]
      availableFrom: string | null
      availableUntil: string | null
      daysOfWeek: string[] | null
    },
  ) => void | Promise<void>
  onCategoryVisibilityChange: (categoryId: string, visibility: MenuCategory["visibility"]) => void
  onDeleteItem: (itemId: string) => void | Promise<void>
  onItemFeaturedChange: (itemId: string, isFeatured: boolean) => void
  onItemImageChange: (itemId: string, photoUrl: string | null) => void | Promise<void>
  onItemReorder: (categoryId: string, nextItemIds: string[]) => void
  onItemVisibilityChange: (
    itemId: string,
    visibility: CategoryItemEntry["item"]["visibility"],
  ) => void
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))
  const categoryIds = categories.map((category) => category.id)
  const [activeDragId, setActiveDragId] = useState<string | null>(null)
  const [activeDragType, setActiveDragType] = useState<"category" | "item" | null>(null)
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

    if (activeType === "category" && overType === "category") {
      const oldIndex = categoryIds.indexOf(String(active.id))
      const newIndex = categoryIds.indexOf(String(over.id))
      if (oldIndex >= 0 && newIndex >= 0 && oldIndex !== newIndex) {
        void Promise.resolve(onCategoryReorder(arrayMove(categoryIds, oldIndex, newIndex)))
      }
      return
    }

    if (activeType === "item" && overType === "item") {
      const activeCategory = String(active.data.current?.categoryId ?? "")
      const overCategory = String(over.data.current?.categoryId ?? "")
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
      <div className={cn("text-sm", menuActionMessage?.includes("Failed") ? "text-destructive" : "text-muted-foreground")}>
        {menuActionMessage ?? "These changes shape what customers see in the storefront."}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={(event) => {
          setActiveDragId(String(event.active.id))
          setActiveDragType((event.active.data.current?.type as "category" | "item" | undefined) ?? null)
          setActiveCategoryId(
            typeof event.active.data.current?.categoryId === "string"
              ? event.active.data.current.categoryId
              : null,
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
  onItemVisibilityChange,
  overDragId,
}: {
  activeCategoryId: string | null
  activeDragId: string | null
  activeDragType: "category" | "item" | null
  category: MenuCategory
  categoryIds: string[]
  onAddItem: (
    categoryId: string,
    input: { name: string; description: string; priceCents: number },
  ) => void | Promise<void>
  onCategoryDelete: (categoryId: string) => void | Promise<void>
  onCategoryScheduleChange: (
    categoryId: string,
    schedule: {
      visibility: MenuCategory["visibility"]
      availableFrom: string | null
      availableUntil: string | null
      daysOfWeek: string[] | null
    },
  ) => void | Promise<void>
  onCategoryVisibilityChange: (categoryId: string, visibility: MenuCategory["visibility"]) => void
  onDeleteItem: (itemId: string) => void | Promise<void>
  onItemFeaturedChange: (itemId: string, isFeatured: boolean) => void
  onItemImageChange: (itemId: string, photoUrl: string | null) => void | Promise<void>
  onItemVisibilityChange: (
    itemId: string,
    visibility: CategoryItemEntry["item"]["visibility"],
  ) => void
  overDragId: string | null
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: category.id,
    data: { type: "category", categoryId: category.id },
  })

  const itemIds = category.categoryItems.map((entry) => entry.item.id)
  const isHidden = category.visibility === "HIDDEN"
  const isScheduled = category.visibility === "SCHEDULED"
  const isScheduledAvailableNow = isCategoryAvailableNow(category)
  const [scheduleEditorOpen, setScheduleEditorOpen] = useState(false)
  const [availableFrom, setAvailableFrom] = useState(scheduleTimeInputValue(category.availableFrom))
  const [availableUntil, setAvailableUntil] = useState(scheduleTimeInputValue(category.availableUntil))
  const [selectedDays, setSelectedDays] = useState<string[]>(category.daysOfWeek ?? [])
  const categoryIndex = categoryIds.indexOf(category.id)
  const activeCategoryIndex = activeDragId ? categoryIds.indexOf(activeDragId) : -1
  const showTopDropIndicator =
    activeDragType === "category" &&
    overDragId === category.id &&
    activeCategoryIndex > categoryIndex
  const showBottomDropIndicator =
    activeDragType === "category" &&
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
      current.includes(day) ? current.filter((entry) => entry !== day) : [...current, day],
    )
  }

  async function handleSaveSchedule() {
    await onCategoryScheduleChange(category.id, {
      visibility: "SCHEDULED",
      availableFrom: scheduleTimeInputToIso(availableFrom),
      availableUntil: scheduleTimeInputToIso(availableUntil),
      daysOfWeek: selectedDays.length > 0 ? selectedDays : null,
    })
    setScheduleEditorOpen(false)
  }

  async function handleRemoveSchedule() {
    await onCategoryScheduleChange(category.id, {
      visibility: "AVAILABLE",
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
        position: "relative",
      }}
    >
      {showTopDropIndicator ? <DropIndicator position="top" /> : null}
      <motion.div layout>
        <Card
          className={cn(
            "gap-4 border border-border/80 py-0 shadow-sm",
            isHidden ? "bg-background/70" : "bg-card",
            activeDragType === "category" && overDragId === category.id ? "ring-2 ring-ring/20" : "",
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
                  <div className={cn("flex items-center gap-2 truncate font-medium text-foreground", isHidden ? "opacity-60" : "")}>
                    {isScheduled ? <Clock3 className="h-4 w-4 shrink-0 text-muted-foreground" /> : null}
                    <span className="truncate">{category.name}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <span>{category.categoryItems.length} items</span>
                    {isScheduled ? (
                      <Badge variant="outline" className="border-primary/20 bg-primary/5 text-foreground">
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
                        ? category.availableFrom || category.availableUntil || (category.daysOfWeek?.length ?? 0) > 0
                          ? "SCHEDULED"
                          : "AVAILABLE"
                        : "HIDDEN",
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
                    "rounded-[calc(var(--radius)-8px)]",
                    isScheduled ? "border-primary/20 bg-primary/5 text-foreground" : "text-muted-foreground",
                  )}
                >
                  <Clock3 className="h-4 w-4" />
                  {isScheduled ? "Edit schedule" : "Schedule"}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (
                      window.confirm(
                        `Delete the ${category.name} section? Items in that section will no longer appear there.`,
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
                    <Label htmlFor={`category-${category.id}-available-until`}>Available until</Label>
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
                            "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                            active
                              ? "border-[#1a1a1a] bg-[#1a1a1a] text-white shadow-sm"
                              : "border-border/70 bg-transparent text-muted-foreground hover:border-border hover:text-foreground",
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
                    <Button type="button" variant="outline" onClick={() => void handleRemoveSchedule()}>
                      Remove schedule
                    </Button>
                  ) : null}
                  <Button type="button" variant="ghost" onClick={() => setScheduleEditorOpen(false)}>
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
  onVisibilityChange,
  overDragId,
}: {
  activeCategoryId: string | null
  activeDragId: string | null
  activeDragType: "category" | "item" | null
  categoryId: string
  entry: CategoryItemEntry
  itemIds: string[]
  onDelete: (itemId: string) => void | Promise<void>
  onFeaturedChange: (itemId: string, isFeatured: boolean) => void
  onImageChange: (itemId: string, photoUrl: string | null) => void | Promise<void>
  onVisibilityChange: (
    itemId: string,
    visibility: CategoryItemEntry["item"]["visibility"],
  ) => void
  overDragId: string | null
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: entry.item.id,
    data: { type: "item", categoryId, itemId: entry.item.id },
  })

  const isHidden = entry.item.visibility === "HIDDEN"
  const isSoldOut = entry.item.visibility === "SOLD_OUT"
  const itemIndex = itemIds.indexOf(entry.item.id)
  const activeItemIndex = activeDragId ? itemIds.indexOf(activeDragId) : -1
  const isSameCategoryDrag = activeDragType === "item" && activeCategoryId === categoryId
  const showTopDropIndicator =
    isSameCategoryDrag &&
    overDragId === entry.item.id &&
    activeItemIndex > itemIndex
  const showBottomDropIndicator =
    isSameCategoryDrag &&
    overDragId === entry.item.id &&
    activeItemIndex >= 0 &&
    activeItemIndex < itemIndex

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : isHidden ? 0.6 : 1,
        position: "relative",
      }}
    >
      {showTopDropIndicator ? <DropIndicator position="top" inset /> : null}
      <motion.div layout>
        <div
          className={cn(
            "grid gap-3 rounded-[var(--radius)] border border-border/70 bg-background px-3 py-3",
            isSoldOut ? "bg-accent/10" : "",
            isSameCategoryDrag && overDragId === entry.item.id ? "ring-2 ring-ring/20" : "",
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
              <div className="mt-1 text-sm text-muted-foreground">
                {formatPrice(entry.item.variants[0]?.priceCents ?? entry.item.basePriceCents)}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:pl-[84px]">
            <IconToggleButton
              active={!isHidden}
              label={isHidden ? `Show ${entry.item.name}` : `Hide ${entry.item.name}`}
              onClick={() =>
                onVisibilityChange(
                  entry.item.id,
                  isHidden ? "AVAILABLE" : "HIDDEN",
                )
              }
            >
              {isHidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </IconToggleButton>

            <IconToggleButton
              active={entry.item.isFeatured}
              label={entry.item.isFeatured ? `Unfeature ${entry.item.name}` : `Feature ${entry.item.name}`}
              onClick={() => onFeaturedChange(entry.item.id, !entry.item.isFeatured)}
            >
              <Star className={cn("h-4 w-4", entry.item.isFeatured ? "fill-current" : "")} />
            </IconToggleButton>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                onVisibilityChange(
                  entry.item.id,
                  isSoldOut ? "AVAILABLE" : "SOLD_OUT",
                )
              }
              className={cn(
                "rounded-[calc(var(--radius)-8px)]",
                isSoldOut ? "border-accent bg-accent/15 text-foreground" : "text-muted-foreground",
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
    input: { name: string; description: string; priceCents: number },
  ) => void | Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [price, setPrice] = useState("")
  const [description, setDescription] = useState("")

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

    setName("")
    setPrice("")
    setDescription("")
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
  position: "top" | "bottom"
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
  attributes: ReturnType<typeof useSortable>["attributes"]
  label: string
  listeners: ReturnType<typeof useSortable>["listeners"]
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
        "rounded-[calc(var(--radius)-8px)]",
        active ? "border-primary/30 bg-primary/10 text-foreground" : "text-muted-foreground",
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

function FieldShell({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("grid gap-2", className)}>
      {children}
    </div>
  )
}

function ImageDropZone({
  compact = false,
  copy,
  disabled = false,
  id,
  imagePresentation = "cover",
  imageUrl,
  onRemove,
  overlayImage = false,
  onFile,
}: {
  compact?: boolean
  copy: string
  disabled?: boolean
  id: string
  imagePresentation?: "contain" | "cover"
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
        "relative flex cursor-pointer items-center justify-center overflow-hidden rounded-[var(--radius)] border text-center text-sm text-muted-foreground transition-colors",
        imageUrl
          ? compact
            ? "h-12 w-12 border-border bg-background"
            : "min-h-28 border-border bg-card"
          : "border-dashed border-border bg-background/80 hover:bg-background",
        compact ? "px-3 py-2" : "px-4 py-6",
        !imageUrl && compact ? "min-h-12" : "",
        !imageUrl && !compact ? "min-h-28" : "",
        isDragging ? "border-primary bg-primary/10 text-foreground" : "",
        disabled ? "cursor-not-allowed opacity-70" : "",
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
              "absolute inset-0",
              imagePresentation === "contain" ? "bg-contain bg-center bg-no-repeat" : "bg-cover bg-center",
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
      <select value={value} onChange={(event) => onChange(event.target.value)} className={selectClassName}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldShell>
  )
}

const fieldLabelClassName = "text-sm font-medium text-muted-foreground"
const textareaClassName =
  "min-h-24 w-full rounded-[var(--radius)] border border-input bg-background px-3 py-3 text-sm text-foreground shadow-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
const selectClassName =
  "h-10 w-full rounded-[var(--radius)] border border-input bg-background px-3 text-sm text-foreground shadow-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
