import { createWorkerDataAccess } from '@repo/data-access'
import { formatOrderReadySms, sendSMS, type SmsConfig } from '@repo/notifications'

type NotificationWorkerDeps = {
  dataAccess: ReturnType<typeof createWorkerDataAccess>
  smsConfig: SmsConfig
  logger?: Pick<Console, 'log' | 'error'>
}

export async function processNotificationBatch(
  deps: NotificationWorkerDeps,
  batchSize: number
) {
  const jobs = await deps.dataAccess.claimNotificationJobs(batchSize)

  for (const job of jobs) {
    try {
      if (job.type !== 'ORDER_READY') {
        throw new Error(`Unsupported notification job type: ${job.type}`)
      }

      const phone =
        typeof job.payload === 'object' &&
        job.payload &&
        'customerPhone' in job.payload &&
        typeof job.payload.customerPhone === 'string'
          ? job.payload.customerPhone
          : job.customer?.phone ?? job.order?.customerPhoneSnapshot ?? null

      if (!phone) {
        throw new Error('Missing customer phone for notification job')
      }

      const orderNumber =
        job.order?.orderNumber ??
        (
          typeof job.payload === 'object' &&
          job.payload &&
          'orderNumber' in job.payload &&
          typeof job.payload.orderNumber === 'number'
            ? job.payload.orderNumber
            : null
        )

      if (!orderNumber) {
        throw new Error('Missing order number for notification job')
      }

      await sendSMS(deps.smsConfig, {
        to: phone,
        body: formatOrderReadySms({
          orderNumber,
          restaurantName: job.restaurant.name,
        }),
      })

      await deps.dataAccess.markNotificationSent(job.id)
      deps.logger?.log?.(`sent notification job ${job.id}`)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Notification send failed'
      await deps.dataAccess.markNotificationFailed(job.id, message)
      deps.logger?.error?.(`failed notification job ${job.id}: ${message}`)
    }
  }

  return jobs.length
}
