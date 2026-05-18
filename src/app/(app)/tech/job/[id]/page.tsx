import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, MapPin, Phone } from 'lucide-react'
import { StatusDot } from '@/components/DesignSystem'
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

const URGENCY_BADGE: Record<string, { label: string; cls: string }> = {
  emergency: { label: 'Emergency', cls: 'border-red-200 bg-red-50 text-red-700' },
  same_day: { label: 'Same day', cls: 'border-orange-200 bg-orange-50 text-orange-700' },
  scheduled: { label: 'Scheduled', cls: 'border-slate-200 bg-slate-50 text-slate-600' },
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

const QUOTE_STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  sent: 'Sent',
  accepted: 'Accepted',
  rejected: 'Declined',
}

function getStatusTone(status: string): 'neutral' | 'blue' | 'amber' | 'red' | 'green' | 'violet' {
  if (status === 'assigned') return 'blue'
  if (status === 'en_route' || status === 'in_progress') return 'amber'
  if (status === 'quote_pending') return 'violet'
  if (status === 'completed' || status === 'accepted') return 'green'
  if (status === 'no_access' || status === 'cancelled' || status === 'rejected') return 'red'
  return 'neutral'
}

function fmtTs(ts: string) {
  return new Date(ts).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default async function TechJobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/tech/login')

  const { data: userRecord } = await supabase
    .from('users')
    .select('role, company_id')
    .eq('id', user.id)
    .single()

  if (!userRecord || userRecord.role !== 'technician') redirect('/tech/login')

  const { data: tech } = await supabase
    .from('technicians')
    .select('id, name, company_id')
    .eq('auth_user_id', user.id)
    .single()

  if (!tech) redirect('/tech/login')

  const { data: job } = await supabase
    .from('jobs')
    .select(
      'id, customer_name, phone, address, issue, problem_description, status, urgency, created_at, technician_id'
    )
    .eq('id', id)
    .eq('company_id', tech.company_id)
    .single()

  if (!job) notFound()
  if (job.technician_id !== tech.id) redirect('/tech')

  const [eventsResult, quotesResult] = await Promise.all([
    supabase
      .from('status_events')
      .select('id, from_status, to_status, actor_role, note, created_at')
      .eq('job_id', id)
      .order('created_at', { ascending: true }),
    supabase
      .from('quotes')
      .select('id, status, total, created_at, quote_line_items(id, description, quantity, unit_price)')
      .eq('job_id', id)
      .order('created_at', { ascending: false }),
  ])

  const statusEvents = (eventsResult.data ?? []) as StatusEvent[]
  const quotes = (quotesResult.data ?? []) as Quote[]

  const urgency = job.urgency ?? 'scheduled'
  const urgencyBadge = URGENCY_BADGE[urgency] ?? URGENCY_BADGE.scheduled

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-lg">
        {/* Back */}
        <Link
          className="mb-6 inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.06em] text-slate-400 transition hover:text-slate-700"
          href="/tech"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Dashboard
        </Link>

        {/* Job card */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          {/* Header */}
          <div className="border-b border-slate-100 px-5 py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.06em] text-slate-400">
                  Job #{job.id.slice(0, 8).toUpperCase()}
                </p>
                <h1 className="mt-0.5 text-xl font-semibold tracking-tight text-slate-950">
                  {job.customer_name}
                </h1>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <span className={`rounded border px-2 py-0.5 font-mono text-[10.5px] uppercase tracking-[0.06em] ${urgencyBadge.cls}`}>
                  {urgencyBadge.label}
                </span>
                <StatusDot tone={getStatusTone(job.status)}>
                  {STATUS_LABEL[job.status] ?? job.status}
                </StatusDot>
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="divide-y divide-slate-100">
            <a
              className="flex items-center gap-3 px-5 py-4 transition hover:bg-slate-50"
              href={`https://maps.google.com/?q=${encodeURIComponent(job.address)}`}
              rel="noopener noreferrer"
              target="_blank"
            >
              <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.06em] text-slate-400">Address</p>
                <p className="mt-0.5 text-sm font-medium text-slate-950">{job.address}</p>
              </div>
            </a>
            <a
              className="flex items-center gap-3 px-5 py-4 transition hover:bg-slate-50"
              href={`tel:${job.phone}`}
            >
              <Phone className="h-4 w-4 shrink-0 text-slate-400" />
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.06em] text-slate-400">Customer phone</p>
                <p className="mt-0.5 text-sm font-medium text-teal-700">{job.phone}</p>
              </div>
            </a>
            <div className="px-5 py-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.06em] text-slate-400">Issue</p>
              <p className="mt-1 text-sm leading-6 text-slate-700">
                {job.problem_description ?? job.issue}
              </p>
            </div>
          </div>
        </div>

        {/* Quote history */}
        {quotes.length > 0 && (
          <div className="mt-6">
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.06em] text-slate-400">Quotes</p>
            <div className="space-y-3">
              {quotes.map((quote) => (
                <div
                  key={quote.id}
                  className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
                    <p className="text-base font-semibold text-slate-950">${quote.total.toFixed(2)}</p>
                    <span className={`font-mono text-[10.5px] uppercase tracking-[0.06em] ${
                      quote.status === 'accepted' ? 'text-green-700' :
                      quote.status === 'rejected' ? 'text-red-700' :
                      quote.status === 'sent' ? 'text-blue-700' : 'text-slate-500'
                    }`}>
                      {QUOTE_STATUS_LABEL[quote.status] ?? quote.status}
                    </span>
                  </div>
                  {quote.quote_line_items.length > 0 && (
                    <div className="divide-y divide-slate-100">
                      {quote.quote_line_items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between px-5 py-2.5 text-sm">
                          <span className="text-slate-700">{item.description}</span>
                          <span className="shrink-0 text-slate-950">
                            {item.quantity} × ${item.unit_price.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Status timeline */}
        {statusEvents.length > 0 && (
          <div className="mt-6">
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.06em] text-slate-400">Timeline</p>
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <ol className="divide-y divide-slate-100">
                {statusEvents.map((event, idx) => (
                  <li key={event.id} className="flex items-start gap-3 px-5 py-3.5">
                    <div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${idx === statusEvents.length - 1 ? 'bg-teal-600' : 'bg-slate-300'}`} />
                    <div>
                      <StatusDot tone={getStatusTone(event.to_status)}>
                        {STATUS_LABEL[event.to_status] ?? event.to_status}
                      </StatusDot>
                      <p className="mt-0.5 text-xs text-slate-500">{fmtTs(event.created_at)}</p>
                      {event.note && (
                        <p className="mt-1 text-sm leading-5 text-slate-600">{event.note}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
