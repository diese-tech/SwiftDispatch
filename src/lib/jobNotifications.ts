import { enqueueSms } from '@/lib/smsOutbox'
import { canSendSms, type SmsConsentType } from '@/lib/smsGate'
import { generateTechToken } from '@/lib/techToken'
import { subsequentSms } from '@/lib/twilio'
import type { JobStatus } from '@/lib/stateMachine'

function getAppUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '')
}

function getSenderName(senderName: string | null | undefined, companyName: string | null | undefined) {
  return senderName?.trim() || companyName?.trim() || 'SwiftDispatch'
}

function toAbsoluteUrl(pathOrUrl: string) {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl
  const normalizedPath = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`
  return `${getAppUrl()}${normalizedPath}`
}

export async function queueTechnicianAssignmentSms(input: {
  companyId: string
  senderName?: string | null
  companyName?: string | null
  technicianId: string
  technicianPhone: string | null
  jobId: string
  customerName: string
  address: string
  issue: string
}) {
  if (!input.technicianPhone?.trim()) return

  const appUrl = getAppUrl()
  const sender = getSenderName(input.senderName, input.companyName)
  const shortId = input.jobId.slice(0, 8).toUpperCase()
  const enRoute = `${appUrl}/api/tech-action?token=${encodeURIComponent(generateTechToken({ jobId: input.jobId, action: 'en_route' }))}`
  const arrived = `${appUrl}/api/tech-action?token=${encodeURIComponent(generateTechToken({ jobId: input.jobId, action: 'arrived' }))}`
  const complete = `${appUrl}/api/tech-action?token=${encodeURIComponent(generateTechToken({ jobId: input.jobId, action: 'complete' }))}`

  await enqueueSms({
    companyId: input.companyId,
    jobId: input.jobId,
    to: input.technicianPhone,
    messageType: 'technician_assignment',
    dedupeKey: `tech-assignment:${input.jobId}:${input.technicianId}:${Date.now()}`,
    body: subsequentSms(
      sender,
      `New job #${shortId} for ${input.customerName}\n${input.address}\n${input.issue}\nEn Route: ${enRoute}\nArrived: ${arrived}\nComplete: ${complete}`,
    ),
  })
}

function getCustomerStatusBody(status: JobStatus, jobRef: string, technicianName?: string | null) {
  switch (status) {
    case 'assigned':
      return technicianName
        ? `Your request #${jobRef} has been assigned to ${technicianName}.`
        : `Your request #${jobRef} has been assigned to a technician.`
    case 'en_route':
      return technicianName
        ? `${technicianName} is on the way for request #${jobRef}.`
        : `Your technician is on the way for request #${jobRef}.`
    case 'in_progress':
      return technicianName
        ? `${technicianName} is on site for request #${jobRef}.`
        : `Your technician is on site for request #${jobRef}.`
    case 'completed':
      return `Your service request #${jobRef} is complete. Thank you for choosing us.`
    case 'cancelled':
      return `Your service request #${jobRef} has been cancelled. Please contact us if you need to reschedule.`
    case 'no_access':
      return `We could not access the property for request #${jobRef}. We will reach out to reschedule.`
    default:
      return null
  }
}

export async function queueCustomerStatusSms(input: {
  companyId: string
  senderName?: string | null
  companyName?: string | null
  customerPhone: string
  smsConsentType: SmsConsentType
  status: JobStatus
  jobId: string
  technicianName?: string | null
}) {
  if (!canSendSms(input.smsConsentType)) return

  const body = getCustomerStatusBody(
    input.status,
    input.jobId.slice(0, 8).toUpperCase(),
    input.technicianName,
  )
  if (!body) return

  await enqueueSms({
    companyId: input.companyId,
    jobId: input.jobId,
    to: input.customerPhone,
    messageType: `customer_status_${input.status}`,
    dedupeKey: `customer-status:${input.jobId}:${input.status}:${Date.now()}`,
    body: subsequentSms(getSenderName(input.senderName, input.companyName), body),
  })
}

export async function queueCustomerInvoiceSms(input: {
  companyId: string
  senderName?: string | null
  companyName?: string | null
  customerPhone: string
  smsConsentType: SmsConsentType
  jobId: string
  invoiceUrl: string
}) {
  if (!canSendSms(input.smsConsentType)) return

  const jobRef = input.jobId.slice(0, 8).toUpperCase()
  const absoluteInvoiceUrl = toAbsoluteUrl(input.invoiceUrl)

  await enqueueSms({
    companyId: input.companyId,
    jobId: input.jobId,
    to: input.customerPhone,
    messageType: 'customer_invoice_ready',
    dedupeKey: `customer-invoice:${input.jobId}:${absoluteInvoiceUrl}`,
    body: subsequentSms(
      getSenderName(input.senderName, input.companyName),
      `Your invoice and service summary for request #${jobRef} are ready: ${absoluteInvoiceUrl}`,
    ),
  })
}
