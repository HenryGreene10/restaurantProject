export type KitchenTicketModifier = {
  groupName: string
  optionName: string
  priceDeltaCents?: number
  portion?: "WHOLE" | "LEFT" | "RIGHT" | string | null
}

export type KitchenTicketItem = {
  name: string
  nameLocalized?: string | null
  variantName?: string | null
  quantity: number
  unitPriceCents?: number | null
  linePriceCents?: number | null
  notes?: string | null
  modifierSelections?: KitchenTicketModifier[]
}

export type KitchenTicketOrder = {
  orderNumber: number
  createdAt: Date | string
  fulfillmentType: "PICKUP" | "DELIVERY"
  customerNameSnapshot?: string | null
  customerPhoneSnapshot?: string | null
  deliveryAddressSnapshot?: unknown
  notes?: string | null
  subtotalCents?: number | null
  taxCents?: number | null
  discountCents?: number | null
  totalCents?: number | null
  items: KitchenTicketItem[]
}

const ESC = {
  initialize: Buffer.from([0x1b, 0x40]),
  center: Buffer.from([0x1b, 0x61, 0x01]),
  left: Buffer.from([0x1b, 0x61, 0x00]),
  boldOn: Buffer.from([0x1b, 0x45, 0x01]),
  boldOff: Buffer.from([0x1b, 0x45, 0x00]),
  doubleSize: Buffer.from([0x1b, 0x21, 0x30]),
  normalSize: Buffer.from([0x1b, 0x21, 0x00]),
  cut: Buffer.from([0x1d, 0x56, 0x41, 0x00]),
} as const

const LINE_FEED = "\n"
const TICKET_WIDTH = 42
const MONEY_FORMATTER = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
})

function text(value: string) {
  return Buffer.from(value, "utf8")
}

function normalizeText(value: string) {
  return value.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim()
}

function wrapText(value: string, width = TICKET_WIDTH) {
  const normalized = normalizeText(value)
  if (!normalized) {
    return []
  }

  return normalized.split("\n").flatMap((line) => {
    const trimmedLine = line.trim()
    if (!trimmedLine) {
      return [""]
    }

    const words = trimmedLine.split(/\s+/)
    const lines: string[] = []
    let current = ""

    for (const word of words) {
      if (word.length > width) {
        if (current) {
          lines.push(current)
          current = ""
        }

        for (let index = 0; index < word.length; index += width) {
          lines.push(word.slice(index, index + width))
        }
        continue
      }

      const next = current ? `${current} ${word}` : word
      if (next.length > width) {
        lines.push(current)
        current = word
      } else {
        current = next
      }
    }

    if (current) {
      lines.push(current)
    }

    return lines
  })
}

function addLine(buffers: Buffer[], value = "") {
  buffers.push(text(value + LINE_FEED))
}

function wrapKeyValue(label: string, value: string, width = TICKET_WIDTH) {
  if (!value) {
    return wrapText(label, width)
  }

  const safeLabel = normalizeText(label)
  const safeValue = normalizeText(value)
  if (!safeLabel) {
    return [safeValue]
  }

  if (safeValue.length >= width) {
    return [...wrapText(safeLabel, width), ...wrapText(safeValue, width)]
  }

  const availableLabelWidth = width - safeValue.length - 1
  const labelLines = wrapText(safeLabel, Math.max(availableLabelWidth, 8))

  if (labelLines.length === 0) {
    return [safeValue]
  }

  const lines = labelLines.slice(0, -1)
  const lastLabelLine = labelLines[labelLines.length - 1] ?? ""
  const spacing = Math.max(1, width - lastLabelLine.length - safeValue.length)
  lines.push(`${lastLabelLine}${" ".repeat(spacing)}${safeValue}`)
  return lines
}

function formatTimestamp(createdAt: Date | string) {
  const date = createdAt instanceof Date ? createdAt : new Date(createdAt)
  if (Number.isNaN(date.getTime())) {
    return "Unknown time"
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

function formatDeliveryAddress(value: unknown) {
  if (typeof value === "string") {
    return normalizeText(value)
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return ""
  }

  const parts = Object.values(value as Record<string, unknown>).flatMap((entry) =>
    typeof entry === "string" ? [entry.trim()] : [],
  )

  return normalizeText(parts.filter(Boolean).join(", "))
}

function formatMoney(value?: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return ""
  }

  return MONEY_FORMATTER.format(value / 100)
}

function formatPortionLabel(value?: string | null) {
  if (!value || value === "WHOLE") {
    return ""
  }

  return ` (${value.toLowerCase()})`
}

function buildTicketLines(order: KitchenTicketOrder) {
  const separator = "=".repeat(TICKET_WIDTH)
  const divider = "-".repeat(TICKET_WIDTH)
  const customerName = normalizeText(order.customerNameSnapshot ?? "") || "Guest"
  const customerPhone = normalizeText(order.customerPhoneSnapshot ?? "") || "N/A"
  const deliveryAddress = formatDeliveryAddress(order.deliveryAddressSnapshot)
  const lines: string[] = [
    separator,
    `ORDER #${order.orderNumber}`,
    formatTimestamp(order.createdAt),
    separator,
    order.fulfillmentType === "DELIVERY" ? "[DELIVERY]" : "[PICKUP]",
    `Customer: ${customerName}`,
    `Phone: ${customerPhone}`,
    "",
  ]

  if (order.fulfillmentType === "DELIVERY" && deliveryAddress) {
    lines.push("Deliver to:")
    lines.push(...wrapText(deliveryAddress, TICKET_WIDTH))
    lines.push("")
  }

  lines.push(divider)
  lines.push("ITEMS:")

  for (const item of order.items) {
    const baseLabel = `${item.quantity} x ${item.name}`
    pushArray(lines, wrapKeyValue(baseLabel, formatMoney(item.linePriceCents)))

    const localizedName =
      item.nameLocalized && normalizeText(item.nameLocalized)
        ? normalizeText(item.nameLocalized)
        : ""
    if (localizedName) {
      pushArray(lines, wrapText(localizedName, TICKET_WIDTH - 2).map((line) => `  ${line}`))
    }

    const variantName = normalizeText(item.variantName ?? "")
    if (variantName) {
      pushArray(lines, wrapText(`Variant: ${variantName}`, TICKET_WIDTH - 2).map((line) => `  ${line}`))
    }

    for (const modifier of item.modifierSelections ?? []) {
      const modifierPrice =
        typeof modifier.priceDeltaCents === "number" && modifier.priceDeltaCents > 0
          ? ` +${formatMoney(modifier.priceDeltaCents)}`
          : ""
      const modifierLabel = `- ${modifier.groupName}: ${modifier.optionName}${formatPortionLabel(modifier.portion)}${modifierPrice}`
      pushArray(lines, wrapText(modifierLabel, TICKET_WIDTH - 2).map((line) => `  ${line}`))
    }

    const itemNotes = normalizeText(item.notes ?? "")
    if (itemNotes) {
      pushArray(lines, wrapText(`Notes: ${itemNotes}`, TICKET_WIDTH - 2).map((line) => `  ${line}`))
    }

    lines.push("")
  }

  const hasSubtotal = typeof order.subtotalCents === "number"
  const hasTax = typeof order.taxCents === "number" && order.taxCents > 0
  const hasDiscount = typeof order.discountCents === "number" && order.discountCents > 0
  const hasTotal = typeof order.totalCents === "number"

  if (hasSubtotal || hasTax || hasDiscount || hasTotal) {
    lines.push(divider)
    if (hasSubtotal) {
      pushArray(lines, wrapKeyValue("Subtotal", formatMoney(order.subtotalCents)))
    }
    if (hasTax) {
      pushArray(lines, wrapKeyValue("Tax", formatMoney(order.taxCents)))
    }
    if (hasDiscount) {
      pushArray(lines, wrapKeyValue("Discount", `-${formatMoney(order.discountCents)}`))
    }
    if (hasTotal) {
      pushArray(lines, wrapKeyValue("TOTAL", formatMoney(order.totalCents)))
    }
  }

  const orderNotes = normalizeText(order.notes ?? "")
  if (orderNotes) {
    lines.push(divider)
    lines.push("Special Instructions:")
    pushArray(lines, wrapText(orderNotes, TICKET_WIDTH))
    lines.push("")
  }

  lines.push(separator)
  lines.push("THANK YOU")
  lines.push(separator)
  return lines
}

function pushArray(target: string[], values: string[]) {
  for (const value of values) {
    target.push(value)
  }
}

export function buildKitchenReceiptText(order: KitchenTicketOrder) {
  return `${buildTicketLines(order).join(LINE_FEED)}${LINE_FEED}${LINE_FEED}`
}

export function buildKitchenTicket(order: KitchenTicketOrder) {
  const buffers: Buffer[] = []
  const divider = "-".repeat(TICKET_WIDTH)
  const lines = buildTicketLines(order)

  buffers.push(ESC.initialize)
  buffers.push(ESC.center)
  buffers.push(ESC.boldOn)
  buffers.push(ESC.doubleSize)
  addLine(buffers, lines[1] ?? "")
  buffers.push(ESC.normalSize)
  buffers.push(ESC.boldOff)
  addLine(buffers, lines[2] ?? "")
  addLine(buffers, lines[0] ?? "")
  buffers.push(ESC.left)
  for (const line of lines.slice(3)) {
    if (line === divider || line === "ITEMS:" || line.startsWith("TOTAL")) {
      buffers.push(ESC.boldOn)
      addLine(buffers, line)
      buffers.push(ESC.boldOff)
      continue
    }

    addLine(buffers, line)
  }

  buffers.push(ESC.center)
  addLine(buffers)
  addLine(buffers)
  buffers.push(ESC.cut)

  return Buffer.concat(buffers).toString("latin1")
}
