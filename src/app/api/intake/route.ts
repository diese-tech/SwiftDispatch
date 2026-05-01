import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { sendSms, firstSms } from '@/lib/twilio'
import jwt from 'jsonwebtoken'

const IntakeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().min(7, 'Valid phone number required'),
  address: z.string().min(5, 'Address is required'),
  problemDescription: z.string().min(5, 'Problem description is required'),
  urgency: z.enum(['emergency', 'same_day', 'scheduled']),
  smsConsent: z.literal(true, { message: 'SMS consent is required' }),
  companySlug: z.string().min(1),
})

function generateStatusToken(jobId: string): string {
  return jwt.sign({ jobId }, process.env.TECH_TOKEN_SECRET!, { expiresIn: '90d' })
}

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = IntakeSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', fields: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const { name, phone, address, problemDescription, urgency, companySlug } = parsed.data

  const supabase = createSupabaseAdminClient()

  // Resolve company by slug
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('id, name, sms_sender_name')
    .eq('slug', companySlug)
    .single()

  if (companyError || !company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 })
  }

  // Upsert customer
  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .upsert(
      { company_id: company.id, name, phone, sms_consent_type: 'intake_form' },
      { onConflict: 'company_id,phone', ignoreDuplicates: false }
    )
    .select('id')
    .single()

  if (customerError || !customer) {
    return NextResponse.json({ error: 'Failed to create customer record' }, { status: 500 })
  }

  // Create job
  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .insert({
      company_id: company.id,
      customer_id: customer.id,
      customer_name: name,
      phone,
      address,
      issue: problemDescription,
      problem_description: problemDescription,
      status: 'new',
      source: 'intake',
      sms_consent_type: 'intake_form',
      urgency,
    })
    .select('id')
    .single()

  if (jobError || !job) {
    return NextResponse.json({ error: 'Failed to create job' }, { status: 500 })
  }

  // Write status event
  await supabase.from('status_events').insert({
    job_id: job.id,
    from_status: null,
    to_status: 'new',
    actor_role: 'customer',
    note: 'Job submitted via intake form',
  })

  // Send confirmation SMS
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const statusToken = generateStatusToken(job.id)
  const shortId = job.id.slice(0, 8).toUpperCase()
  const senderName = company.sms_sender_name ?? company.name

  try {
    await sendSms(
      phone,
      firstSms(
        senderName,
        `We received your service request. A dispatcher will contact you shortly.\nReference: #${shortId}\nTrack your request: ${appUrl}/intake/status/${statusToken}`
      )
    )
  } catch (smsError) {
    // SMS failure is non-fatal — job was created successfully
    console.error('Intake confirmation SMS failed:', smsError)
  }

  return NextResponse.json({
    jobId: job.id,
    jobRef: shortId,
    statusToken,
  })
}
