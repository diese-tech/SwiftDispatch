import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { AppPageIntro, StatusPill, SurfaceCard } from '@/components/DesignSystem'
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

const URGENCY_BADGE: Record<string, { label: string; tone: 'danger' | 'warm' | 'neutral' }> = {
  emergency: { label: 'Emergency', tone: 'danger' },
  same_day: { label: 'Same day', tone: 'warm' },
  scheduled: { label: 'Scheduled', tone: 'neutral' },
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

function getStatusTone(status: string): 'neutral' | 'teal' | 'warm' | 'danger' | 'success' {
  if (status === 'completed') return 'success'
  if (status === 'cancelled' || status === 'no_access' || status === 'declined') return 'danger'
  if (status === 'quote_pending' || status === 'in_progress') return 'warm'
  if (status === 'assigned' || status === 'en_route' || status === 'sent') return 'teal'
  if (status === 'accepted') return 'success'
  return 'neutral'
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

  if (!userRecord || userRecord.role !== 'technician') {
    redirect('/tech/login')
  }

  const { data: tech } = await supabase
    .from('technicians')
    .select('id, name, company_id')
    .eq('auth_user_id', user.id)
    .single()

  if (!tech) redirect('/tech/login')

  const { data: job } = await supabase
    .from('jobs')
    .select(
      'id, customer_name, phone, address, issue, problem_description, status, urgency, created_at, technician_id, customers(name, phone)'
    )
    .eq('id', id)
    .eq('company_id', tech.company_id)
    .single()

  if (!job) notFound()

  if (job.technician_id !== tech.id) {
    redirect('/tech')
  }

  const { data: statusEvents } = await supabase
    .from('status_events')
    .select('id, from_status, to_status, actor_role, note, created_at')
    .eq('job_id', id)
    .order('created_at', { ascending: true })

  const { data: quotes } = await supabase
    .from('quotes')
    .select('id, status, total, created_at, quote_line_items(id, description, quantity, unit_price)')
    .eq('job_id', id)
    .order('created_at', { ascending: false })

  const typedJob = job as typeof job & {
    customers?: { name: string; phone: string } | null
  }

  const urgency = typedJob.urgency ?? 'scheduled'
  const urgencyBadge = URGENCY_BADGE[urgency] ?? URGENCY_BADGE.scheduled

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <AppPageIntro
          eyebrow="Technician detail"
          title={`Job detail for ${typedJob.customer_name}`}
          description="Everything needed for the service visit, quote context, and status history lives here in one clean field view."
          actions={
            <Link
              className="inline-flex items-center rounded-full border border-white/14 bg-white/8 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/12"
              href="/tech"
            >
              Back to dashboard
            </Link>
          }
        />

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.95fr)]">
          <SurfaceCard accent className="space-y-6">
            <div className="flex flex-col gap-4 border-b border-slate-100 pb-6 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Job reference
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                  #{typedJob.id.slice(0, 8).toUpperCase()}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Created {fmtTs(typedJob.created_at)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusPill tone={urgencyBadge.tone}>{urgencyBadge.label}</StatusPill>
                <StatusPill tone={getStatusTone(typedJob.status)}>
                  {STATUS_LABEL[typedJob.status] ?? typedJob.status}
                </StatusPill>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Customer</p>
                <p className="mt-3 text-lg font-semibold text-slate-950">{typedJob.customer_name}</p>
                <a
                  href={`tel:${typedJob.phone}`}
                  className="mt-3 inline-flex text-sm font-medium text-teal-700 underline-offset-4 hover:underline"
                >
                  {typedJob.phone}
                </a>
              </div>
              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Address</p>
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(typedJob.address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex text-base font-semibold text-slate-950 underline-offset-4 hover:text-teal-700 hover:underline"
                >
                  {typedJob.address}
                </a>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Open directions quickly when you are heading to or revisiting the site.
                </p>
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Problem description
              </p>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                {typedJob.problem_description ?? typedJob.issue}
              </p>
            </div>
          </SurfaceCard>

          <SurfaceCard className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Quote posture
                </p>
                <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
                  Sales context for this visit
                </h3>
              </div>
              <StatusPill tone={(quotes?.length ?? 0) > 0 ? 'teal' : 'neutral'}>
                {(quotes?.length ?? 0) > 0 ? `${quotes?.length} quote${quotes?.length === 1 ? '' : 's'}` : 'No quotes yet'}
              </StatusPill>
            </div>

            <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50/70 px-4 py-4 text-sm leading-6 text-slate-500">
              Build quotes from the technician workflow once diagnosis is complete. Accepted quotes unlock clean handoff into completion and invoicing.
            </div>

            {typedJob.status === 'in_progress' ? (
              <Link
                href={`/dispatch/jobs/${typedJob.id}`}
                className="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Open quote builder
              </Link>
            ) : null}
          </SurfaceCard>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,1fr)]">
          <SurfaceCard>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Quotes</p>
                <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                  Pricing history
                </h3>
              </div>
            </div>

            {(quotes?.length ?? 0) === 0 ? (
              <div className="mt-5 rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50/70 px-5 py-8 text-sm leading-7 text-slate-500">
                No quotes have been created for this job yet.
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                {(quotes as Quote[]).map((quote) => (
                  <div key={quote.id} className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
                    <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="text-lg font-semibold text-slate-950">
                          ${(quote.total / 100).toFixed(2)}
                        </p>
                        <StatusPill tone={getStatusTone(quote.status)}>
                          {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
                        </StatusPill>
                      </div>
                      <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
                        {fmtTs(quote.created_at)}
                      </p>
                    </div>

                    {quote.quote_line_items.length > 0 ? (
                      <div className="mt-4 overflow-x-auto">
                        <table className="w-full min-w-[420px] text-sm">
                          <thead>
                            <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                              <th className="pb-3">Description</th>
                              <th className="pb-3 text-right">Qty</th>
                              <th className="pb-3 text-right">Unit</th>
                              <th className="pb-3 text-right">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {quote.quote_line_items.map((item) => (
                              <tr key={item.id}>
                                <td className="py-3 text-slate-700">{item.description}</td>
                                <td className="py-3 text-right text-slate-500">{item.quantity}</td>
                                <td className="py-3 text-right text-slate-500">
                                  ${(item.unit_price / 100).toFixed(2)}
                                </td>
                                <td className="py-3 text-right font-semibold text-slate-950">
                                  ${((item.quantity * item.unit_price) / 100).toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </SurfaceCard>

          <div className="space-y-6">
            <SurfaceCard>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Photos</p>
                <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                  Documentation
                </h3>
              </div>
              <div className="mt-5 rounded-[1.5rem] border-2 border-dashed border-slate-200 bg-slate-50/70 px-5 py-10 text-center">
                <p className="text-sm font-medium text-slate-500">Photo upload is staged for a future pass.</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  This space is reserved for before-and-after evidence, install snapshots, and service documentation.
                </p>
              </div>
            </SurfaceCard>

            {(statusEvents?.length ?? 0) > 0 ? (
              <SurfaceCard>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Timeline</p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                    Job history
                  </h3>
                </div>
                <ol className="mt-6 relative space-y-5 border-l border-slate-200 pl-6">
                  {(statusEvents as StatusEvent[]).map((event, idx) => (
                    <li key={event.id} className="relative">
                      <span
                        className={`absolute -left-[31px] h-4 w-4 rounded-full border-4 border-white ${
                          idx === (statusEvents?.length ?? 0) - 1 ? 'bg-teal-600' : 'bg-slate-300'
                        }`}
                      />
                      <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50/70 px-4 py-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusPill tone={getStatusTone(event.to_status)}>
                            {STATUS_LABEL[event.to_status] ?? event.to_status}
                          </StatusPill>
                          {event.actor_role ? (
                            <span className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
                              {event.actor_role}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-3 text-sm font-medium text-slate-950">{fmtTs(event.created_at)}</p>
                        {event.note ? <p className="mt-2 text-sm leading-6 text-slate-500">{event.note}</p> : null}
                      </div>
                    </li>
                  ))}
                </ol>
              </SurfaceCard>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  )
}
