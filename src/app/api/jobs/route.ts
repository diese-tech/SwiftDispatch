import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireApiProfile } from '@/lib/auth'

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

export async function POST(request: Request) {
  const { profile, response, supabase } = await requireApiProfile()
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

  const { data, error } = await supabase
    .from('jobs')
    .insert({
      customer_name,
      phone,
      address,
      issue,
      problem_description: problem_description ?? issue,
      urgency,
      status: 'new',
      company_id: profile.company_id,
      technician_id: technician_id ?? null,
      customer_id: customer_id ?? null,
      sms_consent_type,
      source,
    })
    .select('*, technicians(id,name,phone)')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // Write initial status event
  await supabase.from('status_events').insert({
    job_id: data.id,
    from_status: null,
    to_status: 'new',
    actor_id: profile.id,
    actor_role: profile.role === 'admin' ? 'admin' : 'dispatcher',
    note: `Job created via ${source}`,
  })

  return NextResponse.json({ job: data })
}
