import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { assertValidTransition, type JobStatus } from '@/lib/stateMachine'
import { verifyQuoteApprovalToken } from '@/lib/quoteTokens'

const DeclineSchema = z.object({
  reason: z.string().optional(),
  token: z.string().min(1, 'Token required'),
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = DeclineSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', fields: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const { reason, token } = parsed.data

  // Verify customer token
  try {
    const payload = verifyQuoteApprovalToken(token)
    if (payload.quoteId !== id) {
      return NextResponse.json({ error: 'Quote token does not match this quote' }, { status: 403 })
    }
  } catch {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
  }

  const supabase = createSupabaseAdminClient()

  // Fetch quote and associated job
  const { data: quote, error: quoteError } = await supabase
    .from('quotes')
    .select('id, status, job_id')
    .eq('id', id)
    .single()

  if (quoteError || !quote) {
    return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
  }

  if (quote.status !== 'sent') {
    return NextResponse.json({ error: 'Quote is not in sent status' }, { status: 409 })
  }

  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select('id, status, company_id')
    .eq('id', quote.job_id)
    .single()

  if (jobError || !job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

  assertValidTransition(job.status as JobStatus, 'in_progress')

  // Update quote to declined
  await supabase
    .from('quotes')
    .update({
      status: 'declined',
      declined_at: new Date().toISOString(),
      decline_reason: reason ?? null,
    })
    .eq('id', id)

  // Transition job back to in_progress
  await supabase
    .from('jobs')
    .update({ status: 'in_progress' })
    .eq('id', job.id)
    .eq('company_id', job.company_id)

  // Write status event
  await supabase.from('status_events').insert({
    job_id: job.id,
    from_status: 'quote_pending',
    to_status: 'in_progress',
    actor_role: 'customer',
    note: reason ? `Quote declined: ${reason}` : 'Quote declined by customer',
  })

  return NextResponse.json({ ok: true, message: "We've notified your technician. They'll be in touch shortly." })
}
