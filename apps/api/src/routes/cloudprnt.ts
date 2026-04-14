import type { Request, Response, Router } from "express"
import { createPlatformDataAccess } from "@repo/data-access"

const STAR_MEDIA_TYPE = "application/vnd.star.starprnt"
const MAC_ADDRESS_PATTERN = /^([0-9A-F]{2}:){5}[0-9A-F]{2}$/i

function normalizeMacAddress(value: string) {
  return value.trim().toUpperCase()
}

function routeParam(req: Request, key: string) {
  const value = req.params[key]
  return Array.isArray(value) ? value[0] : value
}

function isValidMacAddress(value: string) {
  return MAC_ADDRESS_PATTERN.test(value)
}

async function respondToPoll(req: Request, res: Response) {
  const macAddress = normalizeMacAddress(routeParam(req, "mac"))
  if (!isValidMacAddress(macAddress)) {
    return res.status(400).json({ error: "Invalid printer MAC address" })
  }

  const platformDataAccess = createPlatformDataAccess()
  const restaurant = await platformDataAccess.findRestaurantByCloudPrntMacAddress(macAddress)
  if (!restaurant || !restaurant.cloudPrntEnabled) {
    return res.status(404).json({ error: "Printer not configured" })
  }

  if (restaurant.pendingPrintJob) {
    return res.json({
      jobReady: true,
      mediaTypes: [STAR_MEDIA_TYPE],
    })
  }

  return res.json({ jobReady: false })
}

export function registerCloudPrntRoutes(r: Router) {
  r.get("/cloudprnt/:mac", async (req, res) => {
    try {
      return await respondToPoll(req, res)
    } catch (error) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : "Failed to process CloudPRNT poll",
      })
    }
  })

  r.post("/cloudprnt/:mac", async (req, res) => {
    try {
      return await respondToPoll(req, res)
    } catch (error) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : "Failed to process CloudPRNT poll",
      })
    }
  })

  r.get("/cloudprnt/:mac/job", async (req, res) => {
    try {
      const macAddress = normalizeMacAddress(routeParam(req, "mac"))
      if (!isValidMacAddress(macAddress)) {
        return res.status(400).json({ error: "Invalid printer MAC address" })
      }

      const platformDataAccess = createPlatformDataAccess()
      const restaurant = await platformDataAccess.findRestaurantByCloudPrntMacAddress(macAddress)
      if (!restaurant || !restaurant.cloudPrntEnabled) {
        return res.status(404).json({ error: "Printer not configured" })
      }

      if (!restaurant.pendingPrintJob) {
        return res.status(404).json({ error: "No pending print job" })
      }

      return res
        .status(200)
        .type(STAR_MEDIA_TYPE)
        .send(Buffer.from(restaurant.pendingPrintJob, "latin1"))
    } catch (error) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : "Failed to fetch CloudPRNT job",
      })
    }
  })

  r.delete("/cloudprnt/:mac/job", async (req, res) => {
    try {
      const macAddress = normalizeMacAddress(routeParam(req, "mac"))
      if (!isValidMacAddress(macAddress)) {
        return res.status(400).json({ error: "Invalid printer MAC address" })
      }

      const platformDataAccess = createPlatformDataAccess()
      const restaurant = await platformDataAccess.findRestaurantByCloudPrntMacAddress(macAddress)
      if (!restaurant || !restaurant.cloudPrntEnabled) {
        return res.status(404).json({ error: "Printer not configured" })
      }

      await platformDataAccess.updateRestaurantPendingPrintJob(restaurant.id, null)
      return res.status(200).json({ cleared: true })
    } catch (error) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : "Failed to clear CloudPRNT job",
      })
    }
  })
}
