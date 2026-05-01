import twilio from 'twilio'

let client: ReturnType<typeof twilio> | null = null

const DISCLOSURE = 'Reply STOP to opt out. Msg & data rates may apply.'

export function getTwilioClient() {
  if (!client) {
    client = twilio(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!
    )
  }
  return client
}

export async function sendSms(to: string, body: string): Promise<string> {
  try {
    const message = await getTwilioClient().messages.create({
      from: process.env.TWILIO_PHONE_NUMBER!,
      to,
      body,
    })
    return message.sid
  } catch (error) {
    console.error(`SMS failed to ${to}:`, error)
    throw new Error(`Failed to send SMS to ${to}`)
  }
}

export function withDisclosure(body: string): string {
  return `${body}\n${DISCLOSURE}`
}

export function firstSms(senderName: string, body: string): string {
  return `${senderName}: ${body}\n${DISCLOSURE}`
}

export function subsequentSms(senderName: string, body: string): string {
  return `${senderName}: ${body}`
}
