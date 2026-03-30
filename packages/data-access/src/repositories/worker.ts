import { Prisma } from "@prisma/client"
import { getInternalPrismaClient } from "../prisma.js"

type ClaimedNotificationJobRow = {
  id: string
}

export function createWorkerDataAccess() {
  const prisma = getInternalPrismaClient()

  return {
    async claimNotificationJobs(limit: number) {
      if (limit <= 0) {
        return []
      }

      const claimedRows = await prisma.$transaction(async (transactionClient) => {
        return transactionClient.$queryRaw<ClaimedNotificationJobRow[]>(Prisma.sql`
          WITH claimed AS (
            SELECT id
            FROM "NotificationJob"
            WHERE status = 'PENDING'
              AND "availableAt" <= NOW()
            ORDER BY "createdAt" ASC
            LIMIT ${limit}
            FOR UPDATE SKIP LOCKED
          )
          UPDATE "NotificationJob" AS notification_job
          SET status = 'PROCESSING',
              "updatedAt" = NOW()
          FROM claimed
          WHERE notification_job.id = claimed.id
          RETURNING notification_job.id
        `)
      })

      if (claimedRows.length === 0) {
        return []
      }

      const jobs = await prisma.notificationJob.findMany({
        where: {
          id: {
            in: claimedRows.map((row) => row.id),
          },
        },
        include: {
          restaurant: true,
          order: true,
          customer: true,
        },
        orderBy: [{ createdAt: "asc" }],
      })

      return jobs
    },

    async markNotificationSent(jobId: string) {
      await prisma.notificationJob.update({
        where: { id: jobId },
        data: {
          status: "SENT",
          errorMessage: null,
          sentAt: new Date(),
        },
      })
    },

    async markNotificationFailed(jobId: string, errorMessage: string) {
      await prisma.notificationJob.update({
        where: { id: jobId },
        data: {
          status: "FAILED",
          errorMessage,
          retryCount: {
            increment: 1,
          },
        },
      })
    },
  }
}
