type KitchenTicketModifier = {
  groupName: string
  optionName: string
}

type KitchenTicketItem = {
  name: string
  nameLocalized?: string | null
  quantity: number
  notes?: string | null
  modifierSelections?: KitchenTicketModifier[]
}

type KitchenTicketOrder = {
  orderNumber: number
  createdAt: Date | string
  fulfillmentType: "PICKUP" | "DELIVERY"
  customerNameSnapshot?: string | null
  customerPhoneSnapshot?: string | null
  deliveryAddressSnapshot?: unknown
  notes?: string | null
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

function appendWrapped(buffers: Buffer[], value: string, indent = "") {
  for (const line of wrapText(value, TICKET_WIDTH - indent.length)) {
    addLine(buffers, `${indent}${line}`)
  }
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

export function buildKitchenTicket(order: KitchenTicketOrder) {
  const buffers: Buffer[] = []
  const separator = "=".repeat(32)
  const divider = "-".repeat(32)
  const customerName = normalizeText(order.customerNameSnapshot ?? "") || "Guest"
  const customerPhone = normalizeText(order.customerPhoneSnapshot ?? "") || "N/A"
  const deliveryAddress = formatDeliveryAddress(order.deliveryAddressSnapshot)

  buffers.push(ESC.initialize)
  buffers.push(ESC.center)
  addLine(buffers, separator)
  buffers.push(ESC.boldOn)
  buffers.push(ESC.doubleSize)
  addLine(buffers, `ORDER #${order.orderNumber}`)
  buffers.push(ESC.normalSize)
  buffers.push(ESC.boldOff)
  addLine(buffers, formatTimestamp(order.createdAt))
  addLine(buffers, separator)
  buffers.push(ESC.left)
  addLine(buffers, order.fulfillmentType === "DELIVERY" ? "[DELIVERY]" : "[PICKUP]")
  addLine(buffers, `Customer: ${customerName}`)
  addLine(buffers, `Phone: ${customerPhone}`)
  addLine(buffers)

  if (order.fulfillmentType === "DELIVERY" && deliveryAddress) {
    addLine(buffers, "Deliver to:")
    appendWrapped(buffers, deliveryAddress)
    addLine(buffers)
  }

  addLine(buffers, divider)
  buffers.push(ESC.boldOn)
  addLine(buffers, "ITEMS:")
  buffers.push(ESC.boldOff)

  for (const item of order.items) {
    addLine(buffers, `${item.quantity} x ${item.name}`)

    const localizedName =
      item.nameLocalized && normalizeText(item.nameLocalized)
        ? normalizeText(item.nameLocalized)
        : ""
    if (localizedName) {
      appendWrapped(buffers, localizedName, "  ")
    }

    for (const modifier of item.modifierSelections ?? []) {
      appendWrapped(buffers, `- ${modifier.groupName}: ${modifier.optionName}`, "  ")
    }

    const itemNotes = normalizeText(item.notes ?? "")
    if (itemNotes) {
      appendWrapped(buffers, `Notes: ${itemNotes}`, "  ")
    }

    addLine(buffers)
  }

  const orderNotes = normalizeText(order.notes ?? "")
  if (orderNotes) {
    addLine(buffers, divider)
    buffers.push(ESC.boldOn)
    addLine(buffers, "Special Instructions:")
    buffers.push(ESC.boldOff)
    appendWrapped(buffers, orderNotes)
    addLine(buffers)
  }

  buffers.push(ESC.center)
  addLine(buffers, separator)
  buffers.push(ESC.boldOn)
  addLine(buffers, "THANK YOU")
  buffers.push(ESC.boldOff)
  addLine(buffers, separator)
  addLine(buffers)
  addLine(buffers)
  buffers.push(ESC.cut)

  return Buffer.concat(buffers).toString("latin1")
}
