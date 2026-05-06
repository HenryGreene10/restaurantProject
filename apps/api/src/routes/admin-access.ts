import type { Router } from "express"
import { z } from "zod"
import { createPlatformDataAccess } from "@repo/data-access"
import { getClerkPrimaryEmail } from "../lib/clerk.js"

const UpdateOwnerEmailSchema = z.object({
  ownerEmail: z.string().trim().email(),
})

export function registerAdminAccessRoutes(r: Router) {
  r.get("/admin/restaurant/access", async (req, res) => {
    try {
      if (!req.adminUser) {
        return res.status(401).json({ error: "Missing admin identity" })
      }

      const clerkPrimaryEmail = await getClerkPrimaryEmail(req.adminUser.clerkUserId)

      return res.json({
        ownerEmail: req.adminUser.email,
        role: req.adminUser.role,
        transferPending:
          clerkPrimaryEmail !== null &&
          clerkPrimaryEmail.trim().toLowerCase() !== req.adminUser.email.trim().toLowerCase(),
      })
    } catch (error) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : "Failed to load admin access",
      })
    }
  })

  r.patch("/admin/restaurant/access", async (req, res) => {
    try {
      if (!req.adminUser) {
        return res.status(401).json({ error: "Missing admin identity" })
      }

      if (req.adminUser.role !== "owner") {
        return res.status(403).json({ error: "Only the restaurant owner can transfer admin access" })
      }

      const parsed = UpdateOwnerEmailSchema.safeParse(req.body)
      if (!parsed.success) {
        return res.status(400).json({ error: "A valid owner email is required" })
      }

      const platformDataAccess = createPlatformDataAccess()
      const clerkPrimaryEmail = await getClerkPrimaryEmail(req.adminUser.clerkUserId)
      const updatedAccess = await platformDataAccess.updateAdminAccessEmail({
        adminUserId: req.adminUser.id,
        restaurantId: req.adminUser.restaurantId,
        email: parsed.data.ownerEmail,
      })

      if (!updatedAccess) {
        return res.status(404).json({ error: "Admin access record was not found" })
      }

      return res.json({
        ownerEmail: updatedAccess.email,
        role: updatedAccess.role,
        transferPending:
          clerkPrimaryEmail !== null &&
          clerkPrimaryEmail.trim().toLowerCase() !== updatedAccess.email.trim().toLowerCase(),
        message:
          "Ask the new owner to sign up or sign in with this email. Their first login will claim the restaurant account.",
      })
    } catch (error) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : "Failed to update admin access",
      })
    }
  })
}
