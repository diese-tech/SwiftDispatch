import { notFound, redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/auth'

export default async function InvoicePage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params
  const profile = await getCurrentProfile()
  const supabase = await createSupabaseServerClient()

  const { data: job, error } = await supabase
    .from('jobs')
    .select('*, technicians(id,name,phone), companies(name,phone,email)')
    .eq('id', jobId)
    .eq('company_id', profile.company_id)
    .single()

  if (error || !job) notFound()

  const { data: quote } = await supabase
    .from('quotes')
    .select('*, quote_line_items(*)')
    .eq('job_id', jobId)
    .eq('status', 'accepted')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  const { data: events } = await supabase
    .from('status_events')
    .select('from_status, to_status, created_at, actor_role')
    .eq('job_id', jobId)
    .order('created_at', { ascending: true })

  const { data: invoice } = await supabase
    .from('invoices')
    .select('invoice_number, created_at, total_amount, status')
    .eq('job_id', jobId)
    .limit(1)
    .single()

  const techData = Array.isArray(job.technicians) ? job.technicians[0] : job.technicians
  const companyData = Array.isArray(job.companies) ? job.companies[0] : job.companies
  const lineItems = quote?.quote_line_items ?? []
  const total = lineItems.reduce((s: number, li: { price?: number; unit_price?: number; quantity?: number; qty?: number }) => s + (li.price ?? li.unit_price ?? 0) * (li.quantity ?? li.qty ?? 1), 0)

  const invoiceNumber = invoice?.invoice_number
    ?? `INV-${new Date().getFullYear()}-${jobId.slice(0, 6).toUpperCase()}`

  const arrivedEvent = events?.find(e => e.to_status === 'in_progress')
  const completedEvent = events?.find(e => e.to_status === 'completed')

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { font-size: 12px; }
        }
      `}</style>

      <div className="min-h-screen bg-slate-50 py-10 px-4">
        <div className="mx-auto max-w-2xl bg-white border border-slate-200 rounded-xl shadow-sm p-8">
          {/* Header */}
          <div className="flex justify-between items-start border-b border-slate-100 pb-6 mb-6">
            <div>
              <p className="text-2xl font-bold text-teal-700">{companyData?.name ?? 'SwiftDispatch'}</p>
              {companyData?.phone && <p className="text-sm text-slate-500 mt-1">{companyData.phone}</p>}
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-slate-900">INVOICE</p>
              <p className="text-sm text-slate-500 mt-1">{invoiceNumber}</p>
              <p className="text-sm text-slate-500">{new Date().toLocaleDateString()}</p>
            </div>
          </div>

          {/* Customer + Job Info */}
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-1">Bill To</p>
              <p className="font-semibold text-slate-800">{job.customer_name}</p>
              <p className="text-sm text-slate-600">{job.address}</p>
              <p className="text-sm text-slate-600">{job.phone}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-1">Job Details</p>
              <p className="text-sm text-slate-600">Ref: #{jobId.slice(0, 8).toUpperCase()}</p>
              {techData && <p className="text-sm text-slate-600">Tech: {techData.name}</p>}
              {arrivedEvent && <p className="text-sm text-slate-600">Arrived: {new Date(arrivedEvent.created_at).toLocaleString()}</p>}
              {completedEvent && <p className="text-sm text-slate-600">Completed: {new Date(completedEvent.created_at).toLocaleString()}</p>}
            </div>
          </div>

          {/* Line Items */}
          <table className="w-full text-sm mb-6">
            <thead className="bg-slate-50 border-y border-slate-200">
              <tr>
                <th className="text-left px-3 py-2 font-semibold text-slate-700">Description</th>
                <th className="text-right px-3 py-2 font-semibold text-slate-700">Qty</th>
                <th className="text-right px-3 py-2 font-semibold text-slate-700">Unit Price</th>
                <th className="text-right px-3 py-2 font-semibold text-slate-700">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {lineItems.length === 0 ? (
                <tr><td colSpan={4} className="px-3 py-4 text-center text-slate-400">No line items</td></tr>
              ) : lineItems.map((li: { id: string; name?: string; description?: string; price?: number; unit_price?: number; quantity?: number; qty?: number }, i: number) => (
                <tr key={li.id ?? i}>
                  <td className="px-3 py-2">{li.name ?? li.description}</td>
                  <td className="px-3 py-2 text-right">{li.quantity ?? li.qty}</td>
                  <td className="px-3 py-2 text-right">${(li.price ?? li.unit_price ?? 0).toFixed(2)}</td>
                  <td className="px-3 py-2 text-right">${((li.price ?? li.unit_price ?? 0) * (li.quantity ?? li.qty ?? 1)).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="border-t border-slate-200 pt-4 flex justify-end">
            <div className="space-y-1 text-sm min-w-40">
              <div className="flex justify-between gap-8">
                <span className="text-slate-600">Subtotal</span>
                <span>${total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between gap-8 text-slate-400">
                <span>Tax (0%)</span>
                <span>$0.00</span>
              </div>
              <div className="flex justify-between gap-8 font-bold text-base border-t border-slate-200 pt-2 mt-2">
                <span>Total</span>
                <span className="text-teal-700">${total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Timeline */}
          {events && events.length > 0 && (
            <div className="mt-8 border-t border-slate-100 pt-6">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">Job History</p>
              <div className="space-y-2">
                {events.map((ev, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <span className="text-slate-400 text-xs w-32 flex-shrink-0">
                      {new Date(ev.created_at).toLocaleString()}
                    </span>
                    <span className="text-slate-600 capitalize">{ev.to_status.replace(/_/g, ' ')}</span>
                    <span className="text-xs text-slate-400">({ev.actor_role})</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Print */}
          <div className="mt-8 flex justify-center no-print">
            <button
              onClick={() => window.print()}
              className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              🖨️ Print Invoice
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
