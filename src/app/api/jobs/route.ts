import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireApiRole } from '@/lib/auth'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { queueCustomerStatusSms, queueTechnicianAssignmentSms } from '@/lib/jobNotifications'
import type { SmsConsentType } from '@/lib/smsGate'

const CreateJobSchema = z.object({
  customer_name: z.string().min(1, 'Customer name required'),
  phone: z.string().min(7, 'Phone required'),
  address: z.string().min(5, 'Address required'),
  issue: z.string().min(1, 'Issue required'),
  problem_description: z.string().optional(),
  urgency: z.enum(['emergency', 'same_day', 'scheduled']).default('scheduled'),
  technician_id: z.string().uuid().nullable().optional(),
  customer_id: z.string().uuid().nullable().optional(),
  sms_consent_type: z.enum(['intake_form', 'verbal_logged', 'none']).default('none'),
  source: z.enum(['manual', 'intake', 'call']).default('manual'),
})

export async function GET() {
  const { profile, response, supabase } = await requireApiRole(['dispatcher', 'admin'])
  if (response || !profile) return response

  const { data, error } = await supabase
    .from('jobs')
    .select('*, technicians!jobs_technician_id_fkey(id,name,phone)')
    .eq('company_id', profile.company_id)
    .not('status', 'in', '("completed","cancelled")')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ jobs: data ?? [] })
}

export async function POST(request: Request) {
  const { profile, response, supabase } = await requireApiRole(['dispatcher', 'admin'])
  if (response || !profile) return response

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = CreateJobSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', fields: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const { customer_name, phone, address, issue, problem_description, urgency, technician_id, customer_id, sms_consent_type, source } = parsed.data

  // jobs.technician_id is a plain FK with no (technician_id, company_id)
  // tenant constraint, and the jobs insert RLS policy only checks the new
  // job's own company_id -- neither stops a job from being created with a
  // technician_id belonging to a different company. Confirm the technician
  // is actually visible in this dispatcher's tenant (company-scoped, backed
  // by the technicians table's own RLS policy as defense-in-depth) before
  // ever writing it onto a job.
  if (technician_id) {
    const { data: technician, error: technicianError } = await supabase
      .from('technicians')
      .select('id')
      .eq('id', technician_id)
      .eq('company_id', profile.company_id)
      .maybeSingle()

    if (technicianError || !technician) {
      return NextResponse.json({ error: 'Technician not found' }, { status: 404 })
    }
  }

  // jobs.customer_id has no FK constraint at all (added as a bare uuid
  // column -- see supabase/migrations/202505010001_job_timestamp_columns.sql),
  // so unlike technician_id there's no RLS-on-the-referenced-table backstop
  // either. Same check, same reasoning as technician_id above.
  if (customer_id) {
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id')
      .eq('id', customer_id)
      .eq('company_id', profile.company_id)
      .maybeSingle()

    if (customerError || !customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }
  }

  const now = new Date().toISOString()
  const initialStatus = technician_id ? 'assigned' : 'new'

  const { data, error } = await supabase
    .from('jobs')
    .insert({
      customer_name,
      phone,
      address,
      issue,
      problem_description: problem_description ?? issue,
      urgency,
      status: initialStatus,
      assigned_at: technician_id ? now : null,
      company_id: profile.company_id,
      technician_id: technician_id ?? null,
      customer_id: customer_id ?? null,
      sms_consent_type,
      source,
    })
    .select('*, technicians!jobs_technician_id_fkey(id,name,phone)')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  if (technician_id) {
    await supabase
      .from('technicians')
      .update({ availability_status: 'on_job', current_job_id: data.id })
      .eq('id', technician_id)
  }

  // status_events has no INSERT RLS policy for the authenticated role (only
  // a SELECT policy exists -- confirmed against the live project for issue
  // #66: session-scoped inserts here were being silently rejected, with
  // zero status_events rows for any dispatcher/admin-created job). Route
  // this through the admin client, the same way intake/tech-action already
  // do for their own status_events writes.
  const { error: statusEventError } = await createSupabaseAdminClient()
    .from('status_events')
    .insert({
      job_id: data.id,
      from_status: null,
      to_status: initialStatus,
      actor_id: profile.id,
      actor_role: profile.role,
      note: technician_id ? `Job created and assigned via ${source}` : `Job created via ${source}`,
    })

  if (statusEventError) {
    console.error('Failed to record job-creation status event:', statusEventError)
  }

  if (technician_id) {
    const [{ data: company }, { data: technician }] = await Promise.all([
      supabase
        .from('companies')
        .select('name, sms_sender_name')
        .eq('id', profile.company_id)
        .single(),
      supabase
        .from('technicians')
        .select('id, name, phone')
        .eq('id', technician_id)
        .maybeSingle(),
    ])

    if (technician?.phone) {
      await queueTechnicianAssignmentSms({
        companyId: profile.company_id,
        senderName: company?.sms_sender_name,
        companyName: company?.name,
        technicianId: technician.id,
        technicianPhone: technician.phone,
        jobId: data.id,
        customerName: customer_name,
        address,
        issue,
      })
    }

    await queueCustomerStatusSms({
      companyId: profile.company_id,
      senderName: company?.sms_sender_name,
      companyName: company?.name,
      customerPhone: phone,
      smsConsentType: sms_consent_type as SmsConsentType,
      status: 'assigned',
      jobId: data.id,
      technicianName: technician?.name,
    })
  }

  return NextResponse.json({ job: data })
}
