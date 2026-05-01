import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { assertValidTransition, type JobStatus } from '@/lib/stateMachine'
import { getPaymentProvider } from '@/lib/payments'
import jwt from 'jsonwebtoken'

function getSecret(): string {
  return process.env.TECH_TOKEN_SECRET!
}

// Accepts PATCH (authenticated dispatcher) or token-gated customer accept
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // Parse optional customer token from body
  let customerToken: string | undefined
  try {
    const body = await request.json()
    customerToken = body?.token
  } catch {
    // No body is fine for authenticated dispatcher calls
  }

  const supabase = createSupabaseAdminClient()

  // Fetch quote + job
  const { data: quote, error: quoteError } = await supabase
    .from('quotes')
    .select('id, status, job_id, total_amount, total')
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
    .select('id, status, company_id, technician_id, customer_name, phone, address, companies(payment_provider)')
    .eq('id', quote.job_id)
    .single()

  if (jobError || !job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

  // If customer token provided, verify it
  if (customerToken) {
    try {
      jwt.verify(customerToken, getSecret())
    } catch {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    }
  }

  // State machine: quote_pending → completed
  assertValidTransition(job.status as JobStatus, 'completed')

  const now = new Date().toISOString()

  // Update quote
  await supabase
    .from('quotes')
    .update({ status: 'accepted', accepted_at: now })
    .eq('id', id)

  // Update job
  await supabase
    .from('jobs')
    .update({ status: 'completed', completed_at: now })
    .eq('id', job.id)
    .eq('company_id', job.company_id)

  // Write status event
  await supabase.from('status_events').insert({
    job_id: job.id,
    from_status: 'quote_pending',
    to_status: 'completed',
    actor_role: customerToken ? 'customer' : 'dispatcher',
    note: 'Quote accepted',
  })

  // Update technician availability
  if (job.technician_id) {
    await supabase
      .from('technicians')
      .update({ availability_status: 'available', current_job_id: null })
      .eq('id', job.technician_id)
  }

  // Generate invoice
  const companyData = Array.isArray(job.companies) ? job.companies[0] : job.companies
  const paymentProvider = companyData?.payment_provider ?? 'manual'

  try {
    const { data: lineItems } = await supabase
      .from('quote_line_items')
      .select('*')
      .eq('quote_id', id)

    const provider = getPaymentProvider(paymentProvider)
    await provider.createInvoice({
      job: { id: job.id, ref: job.id.slice(0, 8).toUpperCase() },
      customer: { name: job.customer_name, phone: job.phone },
      lineItems: (lineItems ?? []).map(li => ({
        description: li.name ?? '',
        unit_price: li.price ?? 0,
        qty: li.quantity ?? 1,
        optional: false,
      })),
      totalAmount: quote.total_amount ?? quote.total ?? 0,
    })
  } catch (invoiceErr) {
    // Invoice generation failure is non-fatal — job is still completed
    console.error('Invoice generation failed:', invoiceErr)
  }

  return NextResponse.json({ ok: true, status: 'completed' })
}
