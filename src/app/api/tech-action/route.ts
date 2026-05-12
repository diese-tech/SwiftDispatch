import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { verifyTechToken } from '@/lib/techToken'
import { assertValidTransition, type JobStatus } from '@/lib/stateMachine'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/rateLimit'
import { queueCustomerStatusSms } from '@/lib/jobNotifications'
import type { SmsConsentType } from '@/lib/smsGate'

const ACTION_TO_TRANSITION: Record<string, { from: JobStatus; to: JobStatus }> = {
  en_route: { from: 'assigned', to: 'en_route' },
  arrived:  { from: 'en_route', to: 'in_progress' },
  complete: { from: 'in_progress', to: 'quote_pending' },
}

const ACTION_LABELS: Record<string, string> = {
  en_route: 'En Route',
  arrived:  'Arrived on Site',
  complete: 'Job Complete — Quote Pending',
}

const TIMESTAMP_COLUMNS: Partial<Record<string, string>> = {
  en_route: 'en_route_at',
  arrived:  'arrived_at',
}

function htmlResponse(title: string, body: string, statusCode = 200): Response {
  return new Response(
    `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>SwiftDispatch</title>
  <style>body{font-family:sans-serif;padding:2rem;text-align:center;max-width:400px;margin:0 auto}</style>
</head>
<body>
  <h2>${title}</h2>
  ${body}
</body>
</html>`,
    {
      status: statusCode,
      headers: { 'Content-Type': 'text/html' },
    }
  )
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')

  if (!token) {
    return htmlResponse('❌ Invalid Request', '<p>No token provided.</p>', 400)
  }

  let payload: { jobId: string; action: string }
  try {
    payload = verifyTechToken(token)
  } catch (err: unknown) {
    const isExpired = err instanceof Error && err.message.includes('expired')
    if (isExpired) {
      return htmlResponse(
        '⏱ Link Expired',
        '<p>This action link has expired. Please use a fresh link from your assignment SMS.</p>',
        401
      )
    }
    return htmlResponse('❌ Invalid Link', '<p>This link is invalid or has been tampered with.</p>', 400)
  }

  const { jobId, action } = payload

  if (!(await checkRateLimit(`tech-action:${jobId}`, 20, 60_000))) {
    return htmlResponse('⚠️ Too Many Requests', '<p>Please wait before trying again.</p>', 429)
  }

  const transition = ACTION_TO_TRANSITION[action]
  if (!transition) {
    return htmlResponse('❌ Invalid Action', '<p>Unknown action type.</p>', 400)
  }

  const supabase = createSupabaseAdminClient()

  const { data: job, error: fetchError } = await supabase
    .from('jobs')
    .select('id, status, technician_id, company_id, customer_name, phone, sms_consent_type')
    .eq('id', jobId)
    .single()

  if (fetchError || !job) {
    return htmlResponse('❌ Job Not Found', '<p>This job could not be found.</p>', 404)
  }

  try {
    assertValidTransition(job.status as JobStatus, transition.to)
  } catch {
    return htmlResponse(
      '⚠️ Already Updated',
      `<p>This job is already at status: <strong>${job.status}</strong>. No action needed.</p>`,
      409
    )
  }

  const now = new Date().toISOString()
  const updatePayload: Record<string, unknown> = {
    status: transition.to,
  }
  const timestampColumn = TIMESTAMP_COLUMNS[action]
  if (timestampColumn) updatePayload[timestampColumn] = now

  const { error: updateError } = await supabase
    .from('jobs')
    .update(updatePayload)
    .eq('id', jobId)
    .eq('company_id', job.company_id)

  if (updateError) {
    return htmlResponse('❌ Update Failed', '<p>Could not update job status. Please try again.</p>', 500)
  }

  // Write status event
  await supabase.from('status_events').insert({
    job_id: jobId,
    from_status: transition.from,
    to_status: transition.to,
    actor_role: 'technician',
    note: `Status updated via SMS link: ${action}`,
  })

  // Update technician availability
  if (job.technician_id) {
    await supabase
      .from('technicians')
      .update({
        availability_status: 'on_job',
        current_job_id: jobId,
      })
      .eq('id', job.technician_id)
  }

  const [{ data: companyData }, { data: techData }] = await Promise.all([
    supabase
      .from('companies')
      .select('name, sms_sender_name')
      .eq('id', job.company_id)
      .maybeSingle(),
    job.technician_id
      ? supabase
          .from('technicians')
          .select('name')
          .eq('id', job.technician_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  if (job.phone) {
    await queueCustomerStatusSms({
      companyId: job.company_id,
      senderName: companyData?.sms_sender_name,
      companyName: companyData?.name,
      customerPhone: job.phone,
      smsConsentType: job.sms_consent_type as SmsConsentType,
      status: transition.to,
      jobId,
      technicianName: techData?.name,
    })
  }

  const label = ACTION_LABELS[action] ?? action
  const shortId = jobId.slice(0, 8).toUpperCase()

  return htmlResponse(
    '✅ Status Updated',
    `<p>Job #${shortId} — <strong>${label}</strong></p>
     <p style="color:#666;font-size:14px">You can close this window.</p>`
  )
}
