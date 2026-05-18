import { notFound } from 'next/navigation'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { verifyQuoteApprovalToken, decodeQuoteApprovalToken } from '@/lib/quoteTokens'
import QuoteApprovalForm from './QuoteApprovalForm'
import { TokenExpiredError } from 'jsonwebtoken'
import { Phone } from 'lucide-react'

type LineItem = { description: string; unit_price: number; qty: number; unit?: string; optional: boolean }

export default async function QuoteApprovalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  let quoteId: string
  let expired = false

  try {
    const decoded = verifyQuoteApprovalToken(token)
    quoteId = decoded.quoteId
  } catch (err) {
    if (err instanceof TokenExpiredError) {
      expired = true
      const decoded = decodeQuoteApprovalToken(token)
      if (!decoded) notFound()
      quoteId = decoded.quoteId
    } else {
      notFound()
    }
  }

  const supabase = createSupabaseAdminClient()

  const { data: quote, error } = await supabase
    .from('quotes')
    .select('id, status, total_amount, estimated_duration_minutes, job_id, jobs(id, customer_name, address, issue, company_id, companies(name, phone), technicians!jobs_technician_id_fkey(name))')
    .eq('id', quoteId)
    .single()

  if (error || !quote) notFound()

  const jobData = Array.isArray(quote.jobs) ? quote.jobs[0] : quote.jobs
  const companyData = jobData?.companies && (Array.isArray(jobData.companies) ? jobData.companies[0] : jobData.companies)
  const techData = jobData?.technicians && (Array.isArray(jobData.technicians) ? jobData.technicians[0] : jobData.technicians)

  if (expired) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-teal-700">
              {companyData?.name ?? 'SwiftDispatch'}
            </p>
            <h1 className="mt-2 text-xl font-semibold text-slate-900">Quote link expired</h1>
          </div>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
            <div className="px-6 py-5">
              <p className="text-sm leading-7 text-slate-600">
                This quote link is no longer valid. Quote links expire after 7 days for security.
              </p>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                Contact {companyData?.name ?? 'your service provider'} to request a new quote link.
              </p>
            </div>
            {companyData?.phone ? (
              <div className="border-t border-slate-100 px-6 py-4">
                <a
                  className="inline-flex items-center gap-2 rounded-full bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800"
                  href={`tel:${companyData.phone}`}
                >
                  <Phone className="h-4 w-4" />
                  Call {companyData.name}
                </a>
              </div>
            ) : null}
          </div>
          <p className="mt-4 text-center font-mono text-[10px] uppercase tracking-[0.06em] text-slate-400">
            Quote ref: {jobData?.address}
          </p>
        </div>
      </main>
    )
  }

  // Fetch line items
  const { data: lineItems } = await supabase
    .from('quote_line_items')
    .select('*')
    .eq('quote_id', quoteId)
    .order('id', { ascending: true })

  const items: LineItem[] = lineItems?.map(li => ({
    description: li.name ?? li.description ?? '',
    unit_price: li.price ?? li.unit_price ?? 0,
    qty: li.quantity ?? li.qty ?? 1,
    unit: li.unit,
    optional: li.optional ?? false,
  })) ?? []

  const total = items.reduce((sum, item) => sum + item.unit_price * item.qty, 0)

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-teal-700">
            {companyData?.name ?? 'SwiftDispatch'}
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">Quote for Approval</h1>
          {techData?.name && (
            <p className="text-sm text-slate-500 mt-1">Technician: {techData.name}</p>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
            <p className="text-sm font-medium text-slate-700">{jobData?.address}</p>
            <p className="text-sm text-slate-500">{jobData?.issue}</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Description</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600">Qty</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600">Unit Price</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3 text-slate-800">
                      {item.description}
                      {item.unit && <span className="text-slate-400 text-xs ml-1">/{item.unit}</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">{item.qty}</td>
                    <td className="px-4 py-3 text-right text-slate-600">${item.unit_price.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-semibold">${(item.unit_price * item.qty).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-slate-200">
                <tr>
                  <td colSpan={3} className="px-4 py-4 text-right font-semibold text-slate-900">Total</td>
                  <td className="px-4 py-4 text-right font-bold text-xl text-teal-700">${total.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {quote.status === 'accepted' ? (
            <div className="px-6 py-8 text-center border-t border-slate-100">
              <p className="font-semibold text-teal-700 text-lg">Quote accepted. Thank you!</p>
              <p className="text-slate-500 text-sm mt-1">Your invoice is being prepared.</p>
            </div>
          ) : quote.status === 'declined' ? (
            <div className="px-6 py-8 text-center border-t border-slate-100">
              <p className="font-medium text-slate-700">Quote declined.</p>
              <p className="text-slate-500 text-sm mt-1">Your technician will be in touch shortly.</p>
            </div>
          ) : (
            <QuoteApprovalForm quoteId={quoteId} jobId={quote.job_id} token={token} />
          )}
        </div>
      </div>
    </main>
  )
}
