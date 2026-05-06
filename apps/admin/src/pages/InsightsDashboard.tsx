import React from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { SectionCard } from '../components/SectionCard'
import { formatUsd, formatSignedPercentChange, shortDateLabel } from '../lib/format'

export type InsightsSummary = {
  ordersThisMonth: number
  revenueThisMonth: number
  averageOrderValue: number
  totalCustomers: number
  repeatCustomers: number
  ordersLastMonth: number
  revenueLastMonth: number
}

export type InsightsOrdersOverTimePoint = {
  date: string
  orders: number
  revenue: number
}

export type InsightsTopItem = {
  itemName: string
  orderCount: number
  revenue: number
}

export type InsightsNeverOrderedItem = {
  itemName: string
  categoryName: string
  daysOnMenu: number
}

export type InsightsPeakHour = {
  hour: number
  orders: number
}

export type InsightsPeakDay = {
  day: string
  orders: number
}

export type InsightsOrderComposition = {
  averageItemsPerOrder: number
  singleItemOrders: number
  multiItemOrders: number
}

export type InsightsData = {
  summary: InsightsSummary
  ordersOverTime: InsightsOrdersOverTimePoint[]
  topItems: InsightsTopItem[]
  neverOrdered: InsightsNeverOrderedItem[]
  peakHours: InsightsPeakHour[]
  peakDays: InsightsPeakDay[]
  orderComposition: InsightsOrderComposition
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

export function InsightsDashboard({
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
  if (isLoading && !data) return <InsightsLoadingSkeleton />

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

  if (!data) return null

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
