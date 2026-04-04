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
        body: "Your order #1003 at Joe's Pizza is ready for pickup! Come grab it 🎉",
      }
    )
    expect(markNotificationSent).toHaveBeenCalledWith('job_1')
    expect(markNotificationFailed).not.toHaveBeenCalled()
  })

  it('sends ORDER_STATUS confirmed jobs and marks them sent', async () => {
    const { processNotificationBatch } = await import('./notification-worker')

    const claimNotificationJobs = vi.fn().mockResolvedValue([
      {
        id: 'job_confirmed',
        type: 'ORDER_STATUS',
        payload: {
          customerPhone: '+15555550126',
          orderNumber: 1006,
          restaurantName: "Joe's Pizza",
          newStatus: 'CONFIRMED',
        },
        restaurant: { name: "Joe's Pizza" },
        order: { orderNumber: 1006, customerPhoneSnapshot: '+15555550126' },
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
      expect.any(Object),
      {
        to: '+15555550126',
        body: "Your order #1006 at Joe's Pizza is confirmed and being prepared! We'll text you when it's ready.",
      }
    )
    expect(markNotificationSent).toHaveBeenCalledWith('job_confirmed')
    expect(markNotificationFailed).not.toHaveBeenCalled()
  })

  it('sends ORDER_STATUS cancelled jobs and marks them sent', async () => {
    const { processNotificationBatch } = await import('./notification-worker')

    const claimNotificationJobs = vi.fn().mockResolvedValue([
      {
        id: 'job_cancelled',
        type: 'ORDER_STATUS',
        payload: {
          customerPhone: '+15555550127',
          orderNumber: 1007,
          restaurantName: 'Sunrise Cafe',
          newStatus: 'CANCELLED',
        },
        restaurant: { name: 'Sunrise Cafe' },
        order: { orderNumber: 1007, customerPhoneSnapshot: '+15555550127' },
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
      expect.any(Object),
      {
        to: '+15555550127',
        body: 'Your order #1007 at Sunrise Cafe has been cancelled. Please contact the restaurant for help.',
      }
    )
    expect(markNotificationSent).toHaveBeenCalledWith('job_cancelled')
    expect(markNotificationFailed).not.toHaveBeenCalled()
  })

  it('sends ORDER_STATUS ready jobs and marks them sent', async () => {
    const { processNotificationBatch } = await import('./notification-worker')

    const claimNotificationJobs = vi.fn().mockResolvedValue([
      {
        id: 'job_ready',
        type: 'ORDER_STATUS',
        payload: {
          customerPhone: '+15555550128',
          orderNumber: 1008,
          restaurantName: "Joe's Pizza",
          newStatus: 'READY',
        },
        restaurant: { name: "Joe's Pizza" },
        order: { orderNumber: 1008, customerPhoneSnapshot: '+15555550128' },
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
      expect.any(Object),
      {
        to: '+15555550128',
        body: "Your order #1008 at Joe's Pizza is ready for pickup! Come grab it 🎉",
      }
    )
    expect(markNotificationSent).toHaveBeenCalledWith('job_ready')
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
