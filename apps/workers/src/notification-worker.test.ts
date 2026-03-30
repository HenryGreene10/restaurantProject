import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockSendSMS = vi.fn()

vi.mock('@repo/notifications', async () => {
  const actual =
    await vi.importActual<typeof import('@repo/notifications')>('@repo/notifications')

  return {
    ...actual,
    sendSMS: mockSendSMS,
  }
})

describe('notification worker', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('sends ORDER_READY jobs and marks them sent', async () => {
    const { processNotificationBatch } = await import('./notification-worker')

    const claimNotificationJobs = vi.fn().mockResolvedValue([
      {
        id: 'job_1',
        type: 'ORDER_READY',
        payload: {
          customerPhone: '+15555550123',
          orderNumber: 1003,
        },
        restaurant: { name: "Joe's Pizza" },
        order: { orderNumber: 1003, customerPhoneSnapshot: '+15555550123' },
        customer: null,
      },
    ])
    const markNotificationSent = vi.fn().mockResolvedValue(undefined)
    const markNotificationFailed = vi.fn().mockResolvedValue(undefined)

    const processedCount = await processNotificationBatch(
      {
        dataAccess: {
          claimNotificationJobs,
          markNotificationSent,
          markNotificationFailed,
        },
        smsConfig: {
          accountSid: 'AC_test',
          authToken: 'token',
          messagingServiceSid: 'MG_test',
        },
      },
      10
    )

    expect(processedCount).toBe(1)
    expect(mockSendSMS).toHaveBeenCalledWith(
      {
        accountSid: 'AC_test',
        authToken: 'token',
        messagingServiceSid: 'MG_test',
      },
      {
        to: '+15555550123',
        body: "Your order #1003 from Joe's Pizza is ready for pickup!",
      }
    )
    expect(markNotificationSent).toHaveBeenCalledWith('job_1')
    expect(markNotificationFailed).not.toHaveBeenCalled()
  })

  it('marks failed jobs with the error message', async () => {
    const { processNotificationBatch } = await import('./notification-worker')

    mockSendSMS.mockRejectedValue(new Error('Twilio is down'))

    const claimNotificationJobs = vi.fn().mockResolvedValue([
      {
        id: 'job_2',
        type: 'ORDER_READY',
        payload: {
          customerPhone: '+15555550124',
          orderNumber: 1004,
        },
        restaurant: { name: 'Sunrise Cafe' },
        order: { orderNumber: 1004, customerPhoneSnapshot: '+15555550124' },
        customer: null,
      },
    ])
    const markNotificationSent = vi.fn().mockResolvedValue(undefined)
    const markNotificationFailed = vi.fn().mockResolvedValue(undefined)

    const processedCount = await processNotificationBatch(
      {
        dataAccess: {
          claimNotificationJobs,
          markNotificationSent,
          markNotificationFailed,
        },
        smsConfig: {
          accountSid: 'AC_test',
          authToken: 'token',
          messagingServiceSid: 'MG_test',
        },
      },
      10
    )

    expect(processedCount).toBe(1)
    expect(markNotificationSent).not.toHaveBeenCalled()
    expect(markNotificationFailed).toHaveBeenCalledWith('job_2', 'Twilio is down')
  })

  it('marks jobs permanently failed after the third attempt', async () => {
    const { processNotificationBatch } = await import('./notification-worker')

    mockSendSMS.mockRejectedValue(new Error('Invalid destination'))

    const claimNotificationJobs = vi.fn().mockResolvedValue([
      {
        id: 'job_3',
        type: 'ORDER_READY',
        payload: {
          customerPhone: '+15555550125',
          orderNumber: 1005,
        },
        restaurant: { name: 'Joe\'s Pizza' },
        order: { orderNumber: 1005, customerPhoneSnapshot: '+15555550125' },
        customer: null,
        retryCount: 2,
      },
    ])
    const markNotificationSent = vi.fn().mockResolvedValue(undefined)
    const markNotificationFailed = vi.fn().mockResolvedValue(undefined)

    await processNotificationBatch(
      {
        dataAccess: {
          claimNotificationJobs,
          markNotificationSent,
          markNotificationFailed,
        },
        smsConfig: {
          accountSid: 'AC_test',
          authToken: 'token',
          messagingServiceSid: 'MG_test',
        },
      },
      10
    )

    expect(markNotificationSent).not.toHaveBeenCalled()
    expect(markNotificationFailed).toHaveBeenCalledWith('job_3', 'Invalid destination')
  })
})
