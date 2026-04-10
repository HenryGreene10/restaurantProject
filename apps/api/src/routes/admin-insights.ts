import type { Response, Router } from 'express'
import { Prisma } from '@prisma/client'
import { withTenantConnection } from '@repo/data-access'
import type { TenantRequest } from '../middleware/tenant.js'

type SummaryRow = {
  ordersThisMonth: bigint | number
  revenueThisMonthCents: bigint | number | null
  averageOrderValueCents: bigint | number | null
  totalCustomers: bigint | number
  repeatCustomers: bigint | number
  ordersLastMonth: bigint | number
  revenueLastMonthCents: bigint | number | null
}

type OrdersOverTimeRow = {
  date: string
  orders: bigint | number
  revenueCents: bigint | number | null
}

type TopItemRow = {
  itemName: string
  orderCount: bigint | number
  revenueCents: bigint | number | null
}

type NeverOrderedRow = {
  itemName: string
  categoryName: string | null
  daysOnMenu: bigint | number
}

type PeakHourRow = {
  hour: bigint | number
  orders: bigint | number
}

type PeakDayRow = {
  dow: bigint | number
  orders: bigint | number
}

type CompositionRow = {
  averageItemsPerOrder: number | null
  singleItemOrders: bigint | number
  multiItemOrders: bigint | number
}

const timezone = 'America/New_York'

function tenantIdFor(req: TenantRequest) {
  if (!req.tenant) {
    throw new Error('No tenant in request')
  }

  return req.tenant.id
}

function eligibleOrdersWhere(restaurantId: string, alias?: string) {
  const column = (name: string) =>
    Prisma.raw(alias ? `${alias}."${name}"` : `"${name}"`)

  return Prisma.sql`
    ${column('restaurantId')} = ${restaurantId}
    AND ${column('status')} != ${Prisma.sql`${'CANCELLED'}::"OrderStatus"`}
    AND (
      ${column('status')} IN (${Prisma.sql`${'READY'}::"OrderStatus"`}, ${Prisma.sql`${'COMPLETED'}::"OrderStatus"`})
      OR ${column('paymentStatus')} = ${Prisma.sql`${'PAID'}::"PaymentStatus"`}
    )
  `
}

function toNumber(value: bigint | number | string | null | undefined) {
  if (typeof value === 'bigint') return Number(value)
  if (typeof value === 'string') return Number(value)
  return typeof value === 'number' ? value : 0
}

function centsToDollars(value: bigint | number | null | undefined) {
  return toNumber(value) / 100
}

function roundCurrency(value: number) {
  return Number(value.toFixed(2))
}

function dayNameFromDow(dow: number) {
  switch (dow) {
    case 0:
      return 'Sunday'
    case 1:
      return 'Monday'
    case 2:
      return 'Tuesday'
    case 3:
      return 'Wednesday'
    case 4:
      return 'Thursday'
    case 5:
      return 'Friday'
    case 6:
      return 'Saturday'
    default:
      return 'Unknown'
  }
}

async function querySummary(restaurantId: string) {
  return withTenantConnection(restaurantId, async (prisma) => {
    const rows = await prisma.$queryRaw<SummaryRow[]>(Prisma.sql`
      WITH eligible_orders AS (
        SELECT *
        FROM "Order"
        WHERE ${eligibleOrdersWhere(restaurantId)}
      ),
      current_month AS (
        SELECT date_trunc('month', NOW()) AS start_at
      ),
      previous_month AS (
        SELECT (SELECT start_at FROM current_month) - INTERVAL '1 month' AS start_at
      ),
      customer_orders AS (
        SELECT COALESCE("customerId"::text, "customerPhoneSnapshot") AS customer_key
        FROM eligible_orders
        WHERE COALESCE("customerId"::text, "customerPhoneSnapshot") IS NOT NULL
      )
      SELECT
        COUNT(*) FILTER (
          WHERE eo."createdAt" >= (SELECT start_at FROM current_month)
            AND eo."createdAt" < (SELECT start_at FROM current_month) + INTERVAL '1 month'
        ) AS "ordersThisMonth",
        COALESCE(SUM(eo."totalCents") FILTER (
          WHERE eo."createdAt" >= (SELECT start_at FROM current_month)
            AND eo."createdAt" < (SELECT start_at FROM current_month) + INTERVAL '1 month'
        ), 0) AS "revenueThisMonthCents",
        COALESCE(AVG(eo."totalCents") FILTER (
          WHERE eo."createdAt" >= (SELECT start_at FROM current_month)
            AND eo."createdAt" < (SELECT start_at FROM current_month) + INTERVAL '1 month'
        ), 0) AS "averageOrderValueCents",
        COALESCE((
          SELECT COUNT(DISTINCT customer_key)
          FROM customer_orders
        ), 0) AS "totalCustomers",
        COALESCE((
          SELECT COUNT(*)
          FROM (
            SELECT customer_key
            FROM customer_orders
            GROUP BY customer_key
            HAVING COUNT(*) > 1
          ) repeaters
        ), 0) AS "repeatCustomers",
        COUNT(*) FILTER (
          WHERE eo."createdAt" >= (SELECT start_at FROM previous_month)
            AND eo."createdAt" < (SELECT start_at FROM current_month)
        ) AS "ordersLastMonth",
        COALESCE(SUM(eo."totalCents") FILTER (
          WHERE eo."createdAt" >= (SELECT start_at FROM previous_month)
            AND eo."createdAt" < (SELECT start_at FROM current_month)
        ), 0) AS "revenueLastMonthCents"
      FROM eligible_orders eo
    `)

    const row = rows[0]

    return {
      ordersThisMonth: toNumber(row?.ordersThisMonth),
      revenueThisMonth: roundCurrency(centsToDollars(row?.revenueThisMonthCents)),
      averageOrderValue: roundCurrency(centsToDollars(row?.averageOrderValueCents)),
      totalCustomers: toNumber(row?.totalCustomers),
      repeatCustomers: toNumber(row?.repeatCustomers),
      ordersLastMonth: toNumber(row?.ordersLastMonth),
      revenueLastMonth: roundCurrency(centsToDollars(row?.revenueLastMonthCents)),
    }
  })
}

async function queryOrdersOverTime(restaurantId: string) {
  return withTenantConnection(restaurantId, async (prisma) => {
    const rows = await prisma.$queryRaw<OrdersOverTimeRow[]>(Prisma.sql`
      WITH days AS (
        SELECT generate_series(
          current_date - INTERVAL '29 days',
          current_date,
          INTERVAL '1 day'
        )::date AS day
      ),
      orders_by_day AS (
        SELECT
          DATE("createdAt" AT TIME ZONE ${timezone}) AS day,
          COUNT(*) AS orders,
          COALESCE(SUM("totalCents"), 0) AS "revenueCents"
        FROM "Order"
        WHERE ${eligibleOrdersWhere(restaurantId)}
          AND "createdAt" >= current_date - INTERVAL '29 days'
        GROUP BY 1
      )
      SELECT
        to_char(days.day, 'YYYY-MM-DD') AS date,
        COALESCE(obd.orders, 0) AS orders,
        COALESCE(obd."revenueCents", 0) AS "revenueCents"
      FROM days
      LEFT JOIN orders_by_day obd ON obd.day = days.day
      ORDER BY days.day ASC
    `)

    return rows.map((row) => ({
      date: row.date,
      orders: toNumber(row.orders),
      revenue: roundCurrency(centsToDollars(row.revenueCents)),
    }))
  })
}

async function queryTopItems(restaurantId: string) {
  return withTenantConnection(restaurantId, async (prisma) => {
    const rows = await prisma.$queryRaw<TopItemRow[]>(Prisma.sql`
      SELECT
        oi."name" AS "itemName",
        COALESCE(SUM(oi."quantity"), 0) AS "orderCount",
        COALESCE(SUM(oi."linePriceCents"), 0) AS "revenueCents"
        FROM "OrderItem" oi
      INNER JOIN "Order" o
        ON o."id" = oi."orderId"
       AND o."restaurantId" = ${restaurantId}
      WHERE oi."restaurantId" = ${restaurantId}
        AND ${eligibleOrdersWhere(restaurantId, 'o')}
      GROUP BY oi."name"
      ORDER BY SUM(oi."quantity") DESC, SUM(oi."linePriceCents") DESC, oi."name" ASC
      LIMIT 5
    `)

    return rows.map((row) => ({
      itemName: row.itemName,
      orderCount: toNumber(row.orderCount),
      revenue: roundCurrency(centsToDollars(row.revenueCents)),
    }))
  })
}

async function queryNeverOrdered(restaurantId: string) {
  return withTenantConnection(restaurantId, async (prisma) => {
    const rows = await prisma.$queryRaw<NeverOrderedRow[]>(Prisma.sql`
      SELECT
        mi."name" AS "itemName",
        category_lookup."categoryName" AS "categoryName",
        GREATEST(1, FLOOR(EXTRACT(EPOCH FROM (NOW() - mi."createdAt")) / 86400)) AS "daysOnMenu"
      FROM "MenuItem" mi
      LEFT JOIN LATERAL (
        SELECT mc."name" AS "categoryName"
        FROM "MenuCategoryItem" mci
        INNER JOIN "MenuCategory" mc
          ON mc."id" = mci."categoryId"
         AND mc."restaurantId" = ${restaurantId}
        WHERE mci."restaurantId" = ${restaurantId}
          AND mci."itemId" = mi."id"
        ORDER BY mc."sortOrder" ASC, mci."sortOrder" ASC
        LIMIT 1
      ) category_lookup ON TRUE
      WHERE mi."restaurantId" = ${restaurantId}
        AND NOT EXISTS (
          SELECT 1
          FROM "OrderItem" oi
          INNER JOIN "Order" o
            ON o."id" = oi."orderId"
           AND o."restaurantId" = ${restaurantId}
          WHERE oi."restaurantId" = ${restaurantId}
            AND oi."itemId" = mi."id"
            AND ${eligibleOrdersWhere(restaurantId, 'o')}
        )
      ORDER BY mi."createdAt" ASC, mi."name" ASC
    `)

    return rows.map((row) => ({
      itemName: row.itemName,
      categoryName: row.categoryName ?? 'Uncategorized',
      daysOnMenu: toNumber(row.daysOnMenu),
    }))
  })
}

async function queryPeakHours(restaurantId: string) {
  return withTenantConnection(restaurantId, async (prisma) => {
    const rows = await prisma.$queryRaw<PeakHourRow[]>(Prisma.sql`
      SELECT
        EXTRACT(HOUR FROM "createdAt" AT TIME ZONE ${timezone}) AS hour,
        COUNT(*) AS orders
      FROM "Order"
      WHERE ${eligibleOrdersWhere(restaurantId)}
      GROUP BY 1
      ORDER BY 1 ASC
    `)

    return rows.map((row) => ({
      hour: toNumber(row.hour),
      orders: toNumber(row.orders),
    }))
  })
}

async function queryPeakDays(restaurantId: string) {
  return withTenantConnection(restaurantId, async (prisma) => {
    const rows = await prisma.$queryRaw<PeakDayRow[]>(Prisma.sql`
      SELECT
        EXTRACT(DOW FROM "createdAt" AT TIME ZONE ${timezone}) AS dow,
        COUNT(*) AS orders
      FROM "Order"
      WHERE ${eligibleOrdersWhere(restaurantId)}
      GROUP BY 1
      ORDER BY 1 ASC
    `)

    const counts = new Map(rows.map((row) => [toNumber(row.dow), toNumber(row.orders)]))

    return [1, 2, 3, 4, 5, 6, 0].map((dow) => ({
      day: dayNameFromDow(dow),
      orders: counts.get(dow) ?? 0,
    }))
  })
}

async function queryOrderComposition(restaurantId: string) {
  return withTenantConnection(restaurantId, async (prisma) => {
    const rows = await prisma.$queryRaw<CompositionRow[]>(Prisma.sql`
      WITH per_order AS (
        SELECT
          o."id",
          COALESCE(SUM(oi."quantity"), 0) AS item_count
        FROM "Order" o
        LEFT JOIN "OrderItem" oi
          ON oi."orderId" = o."id"
         AND oi."restaurantId" = ${restaurantId}
        WHERE ${eligibleOrdersWhere(restaurantId, 'o')}
        GROUP BY o."id"
      )
      SELECT
        COALESCE(AVG(item_count), 0) AS "averageItemsPerOrder",
        COUNT(*) FILTER (WHERE item_count = 1) AS "singleItemOrders",
        COUNT(*) FILTER (WHERE item_count > 1) AS "multiItemOrders"
      FROM per_order
    `)

    const row = rows[0]

    return {
      averageItemsPerOrder: Number(toNumber(row?.averageItemsPerOrder).toFixed(2)),
      singleItemOrders: toNumber(row?.singleItemOrders),
      multiItemOrders: toNumber(row?.multiItemOrders),
    }
  })
}

function handleRouteError(res: Response, error: unknown) {
  const message = error instanceof Error ? error.message : 'Failed to load insights'
  return res.status(400).json({ error: message })
}

export function registerAdminInsightsRoutes(r: Router) {
  r.get('/admin/insights/summary', async (req: TenantRequest, res) => {
    try {
      return res.json(await querySummary(tenantIdFor(req)))
    } catch (error) {
      return handleRouteError(res, error)
    }
  })

  r.get('/admin/insights/orders-over-time', async (req: TenantRequest, res) => {
    try {
      return res.json(await queryOrdersOverTime(tenantIdFor(req)))
    } catch (error) {
      return handleRouteError(res, error)
    }
  })

  r.get('/admin/insights/top-items', async (req: TenantRequest, res) => {
    try {
      return res.json(await queryTopItems(tenantIdFor(req)))
    } catch (error) {
      return handleRouteError(res, error)
    }
  })

  r.get('/admin/insights/never-ordered', async (req: TenantRequest, res) => {
    try {
      return res.json(await queryNeverOrdered(tenantIdFor(req)))
    } catch (error) {
      return handleRouteError(res, error)
    }
  })

  r.get('/admin/insights/peak-hours', async (req: TenantRequest, res) => {
    try {
      return res.json(await queryPeakHours(tenantIdFor(req)))
    } catch (error) {
      return handleRouteError(res, error)
    }
  })

  r.get('/admin/insights/peak-days', async (req: TenantRequest, res) => {
    try {
      return res.json(await queryPeakDays(tenantIdFor(req)))
    } catch (error) {
      return handleRouteError(res, error)
    }
  })

  r.get('/admin/insights/order-composition', async (req: TenantRequest, res) => {
    try {
      return res.json(await queryOrderComposition(tenantIdFor(req)))
    } catch (error) {
      return handleRouteError(res, error)
    }
  })
}
