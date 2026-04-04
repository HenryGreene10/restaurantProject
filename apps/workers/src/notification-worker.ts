import { createWorkerDataAccess } from '@repo/data-access'
import {
  formatOrderCancelledSms,
  formatOrderConfirmedSms,
  formatOrderReadySms,
  sendSMS,
  type SmsConfig
} from '@repo/notifications'

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
      if (job.type !== 'ORDER_READY' && job.type !== 'ORDER_STATUS') {
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

      const restaurantName =
        typeof job.payload === 'object' &&
        job.payload &&
        'restaurantName' in job.payload &&
        typeof job.payload.restaurantName === 'string'
          ? job.payload.restaurantName
          : job.restaurant.name

      const body =
        job.type === 'ORDER_READY'
          ? formatOrderReadySms({
              orderNumber,
              restaurantName,
            })
          : (() => {
              const nextStatus =
                typeof job.payload === 'object' &&
                job.payload &&
                'newStatus' in job.payload &&
                typeof job.payload.newStatus === 'string'
                  ? job.payload.newStatus
                  : null

              if (nextStatus === 'CONFIRMED') {
                return formatOrderConfirmedSms({
                  orderNumber,
                  restaurantName,
                })
              }

              if (nextStatus === 'READY') {
                return formatOrderReadySms({
                  orderNumber,
                  restaurantName,
                })
              }

              if (nextStatus === 'CANCELLED') {
                return formatOrderCancelledSms({
                  orderNumber,
                  restaurantName,
                })
              }

              throw new Error(`Unsupported ORDER_STATUS notification status: ${nextStatus}`)
            })()

      await sendSMS(deps.smsConfig, {
        to: phone,
        body,
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
