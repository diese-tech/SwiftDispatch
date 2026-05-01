import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'

type StatusEvent = {
  id: string
  from_status: string | null
  to_status: string
  actor_role: string | null
  note: string | null
  created_at: string
}

type QuoteLineItem = {
  id: string
  description: string
  quantity: number
  unit_price: number
}

type Quote = {
  id: string
  status: string
  total: number
  created_at: string
  quote_line_items: QuoteLineItem[]
}

const URGENCY_BADGE: Record<string, string> = {
  emergency: 'bg-red-100 text-red-800',
  same_day: 'bg-amber-100 text-amber-800',
  scheduled: 'bg-slate-100 text-slate-700',
}

const URGENCY_LABEL: Record<string, string> = {
  emergency: 'Emergency',
  same_day: 'Same Day',
  scheduled: 'Scheduled',
}

const STATUS_LABEL: Record<string, string> = {
  new: 'New',
  assigned: 'Assigned',
  en_route: 'En Route',
  in_progress: 'In Progress',
  quote_pending: 'Quote Pending',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_access: 'No Access',
}

function fmtTs(ts: string) {
  return new Date(ts).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    new: 'bg-slate-100 text-slate-700',
    assigned: 'bg-blue-100 text-blue-800',
    en_route: 'bg-indigo-100 text-indigo-800',
    in_progress: 'bg-amber-100 text-amber-800',
    quote_pending: 'bg-purple-100 text-purple-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    no_access: 'bg-orange-100 text-orange-800',
    // quote statuses
    draft: 'bg-slate-100 text-slate-700',
    sent: 'bg-blue-100 text-blue-800',
    accepted: 'bg-green-100 text-green-800',
    declined: 'bg-red-100 text-red-800',
  }
  const cls = colorMap[status] ?? 'bg-slate-100 text-slate-700'
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
      {STATUS_LABEL[status] ?? status}
    </span>
  )
}

export default async function TechJobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/tech/login')

  const { data: userRecord } = await supabase
    .from('users')
    .select('role, company_id')
    .eq('id', user.id)
    .single()

  if (!userRecord || userRecord.role !== 'technician') {
    redirect('/tech/login')
  }

  // Load technician record
  const { data: tech } = await supabase
    .from('technicians')
    .select('id, name, company_id')
    .eq('auth_user_id', user.id)
    .single()

  if (!tech) redirect('/tech/login')

  // Load job — must belong to this technician
  const { data: job } = await supabase
    .from('jobs')
    .select(
      'id, customer_name, phone, address, issue, problem_description, status, urgency, created_at, technician_id, customers(name, phone)'
    )
    .eq('id', id)
    .eq('company_id', tech.company_id)
    .single()

  if (!job) notFound()

  // Verify the technician is assigned to this job
  if (job.technician_id !== tech.id) {
    redirect('/tech')
  }

  // Load status events
  const { data: statusEvents } = await supabase
    .from('status_events')
    .select('id, from_status, to_status, actor_role, note, created_at')
    .eq('job_id', id)
    .order('created_at', { ascending: true })

  // Load quotes with line items
  const { data: quotes } = await supabase
    .from('quotes')
    .select('id, status, total, created_at, quote_line_items(id, description, quantity, unit_price)')
    .eq('job_id', id)
    .order('created_at', { ascending: false })

  const typedJob = job as typeof job & {
    customers?: { name: string; phone: string } | null
  }

  const urgency = typedJob.urgency ?? 'scheduled'
  const badgeCls = URGENCY_BADGE[urgency] ?? URGENCY_BADGE.scheduled
  const urgencyLabel = URGENCY_LABEL[urgency] ?? urgency

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6">
      <div className="mx-auto max-w-lg space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link
            href="/tech"
            className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 shadow-sm transition hover:bg-slate-50"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-teal-700">SwiftDispatch</p>
            <h1 className="text-xl font-semibold text-slate-900">Job Detail</h1>
          </div>
        </div>

        {/* Job card */}
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          {/* Job header */}
          <div className="border-b border-slate-100 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-slate-400">Job #{typedJob.id.slice(0, 8).toUpperCase()}</p>
                <h2 className="mt-0.5 text-lg font-semibold text-slate-900">{typedJob.customer_name}</h2>
              </div>
              <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeCls}`}>
                {urgencyLabel}
              </span>
            </div>
            <div className="mt-2">
              <StatusBadge status={typedJob.status} />
            </div>
          </div>

          {/* Customer info */}
          <div className="border-b border-slate-100 p-5">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Customer</p>
            <p className="font-medium text-slate-900">{typedJob.customer_name}</p>
            <a
              href={`tel:${typedJob.phone}`}
              className="mt-1 inline-block text-sm text-teal-700 underline-offset-2 hover:underline"
            >
              {typedJob.phone}
            </a>
          </div>

          {/* Address */}
          <div className="border-b border-slate-100 p-5">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Address</p>
            <a
              href={`https://maps.google.com/?q=${encodeURIComponent(typedJob.address)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-teal-700 underline-offset-2 hover:underline"
            >
              {typedJob.address}
            </a>
          </div>

          {/* Problem */}
          <div className="p-5">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Problem Description</p>
            <p className="text-sm text-slate-700">{typedJob.problem_description ?? typedJob.issue}</p>
          </div>
        </section>

        {/* Quote builder section */}
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5">
            <h2 className="text-base font-semibold text-slate-900">Quotes</h2>
          </div>

          {(quotes?.length ?? 0) === 0 ? (
            <div className="p-5">
              <p className="mb-4 text-sm text-slate-500">No quotes have been created for this job yet.</p>
              {typedJob.status === 'in_progress' && (
                <Link
                  href={`/dispatch/jobs/${typedJob.id}`}
                  className="inline-flex items-center rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800"
                >
                  Build Quote
                </Link>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {(quotes as Quote[]).map((quote) => (
                <div key={quote.id} className="p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900">
                        ${(quote.total / 100).toFixed(2)}
                      </span>
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                          quote.status === 'accepted'
                            ? 'bg-green-100 text-green-800'
                            : quote.status === 'declined'
                            ? 'bg-red-100 text-red-800'
                            : quote.status === 'sent'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400">{fmtTs(quote.created_at)}</span>
                  </div>

                  {quote.quote_line_items.length > 0 && (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-100">
                          <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Description
                          </th>
                          <th className="pb-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Qty
                          </th>
                          <th className="pb-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Unit
                          </th>
                          <th className="pb-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {quote.quote_line_items.map((item) => (
                          <tr key={item.id}>
                            <td className="py-1.5 text-slate-700">{item.description}</td>
                            <td className="py-1.5 text-right text-slate-600">{item.quantity}</td>
                            <td className="py-1.5 text-right text-slate-600">
                              ${(item.unit_price / 100).toFixed(2)}
                            </td>
                            <td className="py-1.5 text-right font-medium text-slate-900">
                              ${((item.quantity * item.unit_price) / 100).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Photo upload note */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-2 text-base font-semibold text-slate-900">Photos</h2>
          <p className="text-sm text-slate-500">
            Upload photos via the form below (stored securely). Photos help document the work performed and
            support the quote approval process.
          </p>
          <div className="mt-4 rounded-lg border-2 border-dashed border-slate-200 p-6 text-center">
            <p className="text-sm text-slate-400">Photo upload coming soon.</p>
          </div>
        </section>

        {/* Status event timeline */}
        {(statusEvents?.length ?? 0) > 0 && (
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-5">
              <h2 className="text-base font-semibold text-slate-900">Job Timeline</h2>
            </div>
            <div className="p-5">
              <ol className="relative space-y-4 border-l border-slate-200 pl-6">
                {(statusEvents as StatusEvent[]).map((event, idx) => (
                  <li key={event.id} className="relative">
                    <span
                      className={`absolute -left-[25px] flex h-3 w-3 items-center justify-center rounded-full ${
                        idx === (statusEvents?.length ?? 0) - 1
                          ? 'bg-teal-600 ring-2 ring-teal-100'
                          : 'bg-slate-300'
                      }`}
                    />
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-semibold text-slate-900">
                          {STATUS_LABEL[event.to_status] ?? event.to_status}
                        </span>
                        {event.actor_role && (
                          <span className="text-xs text-slate-400">by {event.actor_role}</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400">{fmtTs(event.created_at)}</p>
                      {event.note && (
                        <p className="mt-0.5 text-xs text-slate-500">{event.note}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
