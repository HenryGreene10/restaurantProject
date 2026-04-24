import type { Request, Response, Router } from "express"
import { createPlatformDataAccess } from "@repo/data-access"
import {
  listCloudPrntMediaTypes,
  parseStoredCloudPrntJob,
  resolveCloudPrntJobResponse,
} from "../lib/cloudprnt.js"

const MAC_ADDRESS_PATTERN = /^([0-9A-F]{2}:){5}[0-9A-F]{2}$/i

function normalizeMacAddress(value: string) {
  return value.trim().toUpperCase()
}

function routeParam(req: Request, key: string) {
  const value = req.params[key]
  return Array.isArray(value) ? value[0] : value
}

function queryParam(req: Request, key: string) {
  const value = req.query[key]
  const candidate = Array.isArray(value) ? value[0] : value
  return typeof candidate === "string" ? candidate : undefined
}

function isValidMacAddress(value: string) {
  return MAC_ADDRESS_PATTERN.test(value)
}

function buildAbsoluteUrl(req: Request, path: string) {
  return `${req.protocol}://${req.get("host")}${path}`
}

async function loadConfiguredPrinter(req: Request, res: Response) {
  const rawMacAddress = routeParam(req, "mac")
  const macAddress = normalizeMacAddress(rawMacAddress)
  if (!isValidMacAddress(macAddress)) {
    res.status(400).json({ error: "Invalid printer MAC address" })
    return null
  }

  const platformDataAccess = createPlatformDataAccess()
  const restaurant = await platformDataAccess.findRestaurantByCloudPrntMacAddress(macAddress)
  if (!restaurant || !restaurant.cloudPrntEnabled) {
    res.status(404).json({ error: "Printer not configured" })
    return null
  }

  return { macAddress, platformDataAccess, restaurant }
}

async function respondToPoll(req: Request, res: Response) {
  const context = await loadConfiguredPrinter(req, res)
  if (!context) {
    return
  }

  if (!context.restaurant.pendingPrintJob) {
    return res.json({ jobReady: false })
  }

  const job = parseStoredCloudPrntJob(context.restaurant.pendingPrintJob)
  const jobPath = `/cloudprnt/${encodeURIComponent(context.macAddress)}`

  return res.json({
    jobReady: true,
    mediaTypes: listCloudPrntMediaTypes(job),
    jobToken: job.jobToken,
    deleteMethod: "DELETE",
    jobGetUrl: buildAbsoluteUrl(req, jobPath),
    jobConfirmationUrl: buildAbsoluteUrl(req, jobPath),
  })
}

async function respondWithJob(req: Request, res: Response) {
  const context = await loadConfiguredPrinter(req, res)
  if (!context) {
    return
  }

  if (!context.restaurant.pendingPrintJob) {
    return res.status(404).json({ error: "No pending print job" })
  }

  const job = parseStoredCloudPrntJob(context.restaurant.pendingPrintJob)
  const requestedToken = queryParam(req, "token")
  if (typeof requestedToken === "string" && requestedToken && requestedToken !== job.jobToken) {
    return res.status(404).json({ error: "Print job token not found" })
  }

  const response = resolveCloudPrntJobResponse(job, queryParam(req, "type"))
  if (!response) {
    return res.status(404).json({ error: "Requested print media type is not available" })
  }

  return res.status(200).set("Content-Type", response.mediaType).send(response.body)
}

async function acknowledgeJob(req: Request, res: Response) {
  const context = await loadConfiguredPrinter(req, res)
  if (!context) {
    return
  }

  if (!context.restaurant.pendingPrintJob) {
    return res.status(200).end()
  }

  const job = parseStoredCloudPrntJob(context.restaurant.pendingPrintJob)
  const requestedToken = queryParam(req, "token")
  if (typeof requestedToken === "string" && requestedToken && requestedToken !== job.jobToken) {
    return res.status(404).json({ error: "Print job token not found" })
  }

  const code = queryParam(req, "code")
  if (typeof code === "string" && code && !code.startsWith("2")) {
    console.warn("CloudPRNT job cleared with non-success printer code", {
      code,
      macAddress: context.macAddress,
      restaurantId: context.restaurant.id,
      retry: queryParam(req, "retry"),
    })
  }

  await context.platformDataAccess.updateRestaurantPendingPrintJob(context.restaurant.id, null)
  return res.status(200).end()
}

function isJobFetchRequest(req: Request) {
  return req.path.endsWith("/job") || typeof queryParam(req, "type") === "string"
}

export function registerCloudPrntRoutes(r: Router) {
  r.get("/cloudprnt/:mac", async (req, res) => {
    try {
      if (isJobFetchRequest(req)) {
        return await respondWithJob(req, res)
      }

      return await respondToPoll(req, res)
    } catch (error) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : "Failed to process CloudPRNT request",
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
      return await respondWithJob(req, res)
    } catch (error) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : "Failed to fetch CloudPRNT job",
      })
    }
  })

  r.delete("/cloudprnt/:mac", async (req, res) => {
    try {
      return await acknowledgeJob(req, res)
    } catch (error) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : "Failed to clear CloudPRNT job",
      })
    }
  })

  r.delete("/cloudprnt/:mac/job", async (req, res) => {
    try {
      return await acknowledgeJob(req, res)
    } catch (error) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : "Failed to clear CloudPRNT job",
      })
    }
  })
}
