export type SmsConfig = {
  accountSid: string
  authToken: string
  messagingServiceSid: string
}

export type SMS = { to: string; body: string }

function twilioAuthHeader(config: SmsConfig) {
  const credentials = Buffer.from(
    `${config.accountSid}:${config.authToken}`,
    'utf8'
  ).toString('base64')

  return `Basic ${credentials}`
}

export async function sendSMS(config: SmsConfig, sms: SMS): Promise<void> {
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: twilioAuthHeader(config),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: sms.to,
        Body: sms.body,
        MessagingServiceSid: config.messagingServiceSid,
      }),
    }
  )

  if (!response.ok) {
    const payload = (await response.json()) as { message?: string }
    throw new Error(payload.message ?? 'Twilio Messaging request failed')
  }
}

export function formatOrderConfirmedSms(input: {
  orderNumber: number
  restaurantName: string
}) {
  return `Your order #${input.orderNumber} at ${input.restaurantName} is confirmed and being prepared! We'll text you when it's ready.`
}

export function formatOrderReadySms(input: {
  orderNumber: number
  restaurantName: string
}) {
  return `Your order #${input.orderNumber} at ${input.restaurantName} is ready for pickup! Come grab it 🎉`
}

export function formatOrderCancelledSms(input: {
  orderNumber: number
  restaurantName: string
}) {
  return `Your order #${input.orderNumber} at ${input.restaurantName} has been cancelled. Please contact the restaurant for help.`
}

export function formatDeliveryEtaSms(input: {
  orderNumber: number
  restaurantName: string
  etaMinutes: number
}) {
  return `Your order #${input.orderNumber} from ${input.restaurantName} is on its way! Estimated arrival: ${input.etaMinutes} minutes.`
}
