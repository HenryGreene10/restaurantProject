import type { Router } from "express"
import { createTenantDataAccess, createTenantScope } from "@repo/data-access"
import type { TenantRequest } from "../middleware/tenant.js"

const MAC_ADDRESS_PATTERN = /^([0-9A-F]{2}:){5}[0-9A-F]{2}$/i

function tenantDataAccessFor(req: TenantRequest) {
  if (!req.tenant) {
    throw new Error("No tenant in request")
  }

  return createTenantDataAccess(createTenantScope(req.tenant.id))
}

function normalizeMacAddress(value: string) {
  return value.trim().toUpperCase()
}

function parsePrintingBody(body: unknown) {
  const payload =
    typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {}
  const enabled = typeof payload.enabled === "boolean" ? payload.enabled : undefined
  const rawMacAddress = typeof payload.macAddress === "string" ? payload.macAddress : undefined
  const macAddress = rawMacAddress ? normalizeMacAddress(rawMacAddress) : ""

  if (enabled === undefined) {
    throw new Error("Printing enabled flag is required")
  }

  if (enabled && !macAddress) {
    throw new Error("Printer MAC address is required when automatic printing is enabled")
  }

  if (macAddress && !MAC_ADDRESS_PATTERN.test(macAddress)) {
    throw new Error("Printer MAC address must use the format XX:XX:XX:XX:XX:XX")
  }

  return {
    enabled,
    macAddress: macAddress || null,
  }
}

export function registerAdminPrintingRoutes(r: Router) {
  r.get("/admin/restaurant/printing", async (req: TenantRequest, res) => {
    try {
      const tenantDataAccess = tenantDataAccessFor(req)
      const settings = await tenantDataAccess.printing.getSettings()
      return res.json({
        enabled: settings.cloudPrntEnabled,
        macAddress: settings.cloudPrntMacAddress,
      })
    } catch (error) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : "Failed to load printing settings",
      })
    }
  })

  r.patch("/admin/restaurant/printing", async (req: TenantRequest, res) => {
    try {
      tenantDataAccessFor(req)
      parsePrintingBody(req.body)
      return res.status(409).json({
        error: "Printing is paused for the digital kiosk launch.",
      })
    } catch (error) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : "Failed to update printing settings",
      })
    }
  })
}
