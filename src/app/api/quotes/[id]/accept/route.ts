import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { assertValidTransition, type JobStatus } from '@/lib/stateMachine'
import { getPaymentProvider } from '@/lib/payments'
import { verifyQuoteApprovalToken } from '@/lib/quoteTokens'
import { requireRole } from '@/lib/supabase/withCompany'
import { queueCustomerInvoiceSms, queueCustomerStatusSms } from '@/lib/jobNotifications'
import type { SmsConsentType } from '@/lib/smsGate'

// Accepts PATCH (authenticated dispatcher) or token-gated customer accept
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  let customerToken: string | undefined
  try {
    const body = await request.json()
    customerToken = body?.token
  } catch {
    // No body is fine for authenticated dispatcher calls
  }

  const supabase = createSupabaseAdminClient()

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
    .select('id, status, company_id, technician_id, customer_name, phone, address, sms_consent_type, companies(name,sms_sender_name,payment_provider,payment_config), technicians!jobs_technician_id_fkey(name)')
    .eq('id', quote.job_id)
    .single()

  if (jobError || !job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

  if (customerToken) {
    try {
      const payload = verifyQuoteApprovalToken(customerToken)
      if (payload.quoteId !== id) {
        return NextResponse.json({ error: 'Quote token does not match this quote' }, { status: 403 })
      }
    } catch {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    }
  } else {
    const serverSupabase = await createSupabaseServerClient()

    let caller: { companyId: string }
    try {
      caller = await requireRole(serverSupabase, ['admin', 'dispatcher'])
    } catch {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (caller.companyId !== job.company_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  assertValidTransition(job.status as JobStatus, 'completed')

  const now = new Date().toISOString()

  await supabase
    .from('quotes')
    .update({ status: 'accepted', accepted_at: now })
    .eq('id', id)

  await supabase
    .from('jobs')
    .update({ status: 'completed', completed_at: now })
    .eq('id', job.id)
    .eq('company_id', job.company_id)

  await supabase.from('status_events').insert({
    job_id: job.id,
    from_status: 'quote_pending',
    to_status: 'completed',
    actor_role: customerToken ? 'customer' : 'dispatcher',
    note: 'Quote accepted',
  })

  if (job.technician_id) {
    await supabase
      .from('technicians')
      .update({ availability_status: 'available', current_job_id: null })
      .eq('id', job.technician_id)
  }

  const companyData = Array.isArray(job.companies) ? job.companies[0] : job.companies
  const technicianData = Array.isArray(job.technicians) ? job.technicians[0] : job.technicians
  const paymentProvider = companyData?.payment_provider ?? 'manual'
  const { data: lineItems } = await supabase
    .from('quote_line_items')
    .select('*')
    .eq('quote_id', id)

  const lineItemsTotal = (lineItems ?? []).reduce(
    (sum, item) => sum + Number(item.price ?? 0) * Number(item.quantity ?? 0),
    0,
  )
  const effectiveQuoteTotal =
    lineItemsTotal > 0
      ? lineItemsTotal
      : Number(quote.total_amount ?? 0) > 0
        ? Number(quote.total_amount)
        : Number(quote.total ?? 0)

  if (
    Number(quote.total ?? 0) !== effectiveQuoteTotal ||
    Number(quote.total_amount ?? 0) !== effectiveQuoteTotal
  ) {
    await supabase
      .from('quotes')
      .update({ total: effectiveQuoteTotal, total_amount: effectiveQuoteTotal })
      .eq('id', id)
  }

  let invoiceUrl: string | undefined

  try {
    const provider = getPaymentProvider(paymentProvider)
    const invoiceResult = await provider.createInvoice({
      job: { id: job.id, ref: job.id.slice(0, 8).toUpperCase() },
      company: {
        id: job.company_id,
        paymentConfig: companyData?.payment_config ?? null,
      },
      customer: { name: job.customer_name, phone: job.phone },
      lineItems: (lineItems ?? []).map(li => ({
        description: li.name ?? '',
        unit_price: li.price ?? 0,
        qty: li.quantity ?? 1,
        optional: false,
      })),
      totalAmount: effectiveQuoteTotal,
    })
    invoiceUrl = invoiceResult.invoiceUrl
  } catch (invoiceErr) {
    // Invoice generation failure is non-fatal - job is still completed
    console.error('Invoice generation failed:', invoiceErr)
  }

  if (job.phone) {
    await queueCustomerStatusSms({
      companyId: job.company_id,
      senderName: companyData?.sms_sender_name,
      companyName: companyData?.name,
      customerPhone: job.phone,
      smsConsentType: job.sms_consent_type as SmsConsentType,
      status: 'completed',
      jobId: job.id,
      technicianName: technicianData?.name,
    })

    if (invoiceUrl) {
      await queueCustomerInvoiceSms({
        companyId: job.company_id,
        senderName: companyData?.sms_sender_name,
        companyName: companyData?.name,
        customerPhone: job.phone,
        smsConsentType: job.sms_consent_type as SmsConsentType,
        jobId: job.id,
        invoiceUrl,
      })
    }
  }

  return NextResponse.json({ ok: true, status: 'completed' })
}
