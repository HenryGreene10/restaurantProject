export type SMS = { to: string; body: string }

export async function sendSMS(sms: SMS): Promise<void> {
  // Stub: integrate Twilio here using env creds
  console.log('sendSMS', sms)
}

export type PushMessage = { endpoint: string; title: string; body: string }

export async function sendPush(msg: PushMessage): Promise<void> {
  // Stub: use web-push library with VAPID keys
  console.log('sendPush', msg)
}
