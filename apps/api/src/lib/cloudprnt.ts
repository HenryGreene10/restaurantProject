import { randomUUID } from "node:crypto"
import {
  buildKitchenReceiptText,
  buildKitchenTicket,
  type KitchenTicketOrder,
} from "@repo/notifications"

export const STAR_PRNT_MEDIA_TYPE = "application/vnd.star.starprnt"
export const TEXT_PLAIN_MEDIA_TYPE = "text/plain"

export type CloudPrntStoredJobVariant = {
  content: string
  encoding: "base64" | "utf8"
}

export type CloudPrntStoredJob = {
  version: 1
  defaultMediaType: string
  jobToken: string
  mediaTypes: Record<string, CloudPrntStoredJobVariant>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function buildCloudPrntReceiptJob(order: KitchenTicketOrder): string {
  const starPrnt = Buffer.from(buildKitchenTicket(order), "latin1").toString("base64")
  const plainText = buildKitchenReceiptText(order)

  const payload: CloudPrntStoredJob = {
    version: 1,
    defaultMediaType: STAR_PRNT_MEDIA_TYPE,
    jobToken: randomUUID(),
    mediaTypes: {
      [STAR_PRNT_MEDIA_TYPE]: {
        content: starPrnt,
        encoding: "base64",
      },
      [TEXT_PLAIN_MEDIA_TYPE]: {
        content: plainText,
        encoding: "utf8",
      },
    },
  }

  return JSON.stringify(payload)
}

export function parseStoredCloudPrntJob(rawValue: string): CloudPrntStoredJob {
  try {
    const parsed = JSON.parse(rawValue) as unknown
    if (!isRecord(parsed)) {
      throw new Error("Invalid CloudPRNT job payload")
    }

    const defaultMediaType =
      typeof parsed.defaultMediaType === "string" ? parsed.defaultMediaType : null
    const jobToken = typeof parsed.jobToken === "string" ? parsed.jobToken : null
    const mediaTypes = parsed.mediaTypes

    if (!defaultMediaType || !jobToken || !isRecord(mediaTypes)) {
      throw new Error("Invalid CloudPRNT job payload")
    }

    const variants = Object.entries(mediaTypes).reduce<Record<string, CloudPrntStoredJobVariant>>(
      (accumulator, [mediaType, value]) => {
        if (!isRecord(value)) {
          return accumulator
        }

        const content = typeof value.content === "string" ? value.content : null
        const encoding =
          value.encoding === "base64" || value.encoding === "utf8" ? value.encoding : null

        if (!content || !encoding) {
          return accumulator
        }

        accumulator[mediaType] = { content, encoding }
        return accumulator
      },
      {},
    )

    if (!variants[defaultMediaType]) {
      throw new Error("Missing default CloudPRNT media type")
    }

    return {
      version: 1,
      defaultMediaType,
      jobToken,
      mediaTypes: variants,
    }
  } catch {
    return {
      version: 1,
      defaultMediaType: STAR_PRNT_MEDIA_TYPE,
      jobToken: "legacy",
      mediaTypes: {
        [STAR_PRNT_MEDIA_TYPE]: {
          content: Buffer.from(rawValue, "latin1").toString("base64"),
          encoding: "base64",
        },
      },
    }
  }
}

export function listCloudPrntMediaTypes(job: CloudPrntStoredJob) {
  return Object.keys(job.mediaTypes)
}

export function normalizeRequestedMediaType(value: unknown) {
  if (typeof value !== "string") {
    return null
  }

  const normalized = value.split(";")[0]?.trim()
  return normalized ? normalized.toLowerCase() : null
}

export function resolveCloudPrntJobResponse(
  job: CloudPrntStoredJob,
  requestedMediaType?: string | null,
) {
  const normalizedRequestedMediaType = normalizeRequestedMediaType(requestedMediaType)
  const requestedMatch = normalizedRequestedMediaType
    ? Object.keys(job.mediaTypes).find(
        (candidate) => candidate.toLowerCase() === normalizedRequestedMediaType,
      )
    : null
  const mediaType = requestedMatch ?? job.defaultMediaType

  if (normalizedRequestedMediaType && !requestedMatch) {
    return null
  }

  const variant = job.mediaTypes[mediaType]
  if (!variant) {
    return null
  }

  return {
    mediaType,
    body:
      variant.encoding === "base64"
        ? Buffer.from(variant.content, "base64")
        : Buffer.from(variant.content, "utf8"),
  }
}
