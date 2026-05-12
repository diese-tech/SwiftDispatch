import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireApiProfile } from '@/lib/auth'
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
  const { profile, response, supabase } = await requireApiProfile()
  if (response || !profile) return response
  if (!profile.company_id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await supabase
    .from('jobs')
    .select('*, technicians!jobs_technician_id_fkey(id,name,phone)')
    .eq('company_id', profile.company_id)
    .eq('is_demo', false)
    .not('status', 'in', '("completed","cancelled")')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ jobs: data ?? [] })
}

export async function POST(request: Request) {
  const { profile, response, supabase } = await requireApiProfile()
  if (response || !profile) return response
  if (!profile.company_id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

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

  // Write initial status event
  await supabase.from('status_events').insert({
    job_id: data.id,
    from_status: null,
    to_status: initialStatus,
    actor_id: profile.id,
    actor_role: profile.role === 'admin' ? 'admin' : 'dispatcher',
    note: technician_id ? `Job created and assigned via ${source}` : `Job created via ${source}`,
  })

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
