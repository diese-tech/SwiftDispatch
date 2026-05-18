import Link from 'next/link'
import { redirect } from 'next/navigation'
import { MapPin, Phone } from 'lucide-react'
import type { JobStatus } from '@/lib/stateMachine'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { TechJobActionsClient, SignOutButtonClient } from './TechClientComponents'

type DbJob = {
  id: string
  customer_name: string
  phone: string
  address: string
  issue: string
  problem_description: string | null
  status: string
  urgency: string | null
  created_at: string
  customers?: { name: string; phone: string } | null
}

type StatusEvent = {
  id: string
  to_status: string
  created_at: string
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

const URGENCY_BADGE: Record<string, { label: string; cls: string }> = {
  emergency: { label: 'Emergency', cls: 'border-red-200 bg-red-50 text-red-700' },
  same_day: { label: 'Same day', cls: 'border-orange-200 bg-orange-50 text-orange-700' },
  scheduled: { label: 'Scheduled', cls: 'border-slate-200 bg-slate-50 text-slate-600' },
}

function fmtTs(ts: string) {
  return new Date(ts).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default async function TechDashboardPage() {
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
    .select('id, name, current_job_id, company_id')
    .eq('auth_user_id', user.id)
    .single()

  if (!tech) redirect('/tech/login')

  let activeJob: DbJob | null = null
  let latestEvent: StatusEvent | null = null

  if (tech.current_job_id) {
    const { data: job } = await supabase
      .from('jobs')
      .select(
        'id, customer_name, phone, address, issue, problem_description, status, urgency, created_at, customers(name, phone)'
      )
      .eq('id', tech.current_job_id)
      .single()

    if (job && !['completed', 'cancelled'].includes(job.status)) {
      activeJob = job as unknown as DbJob

      const { data: events } = await supabase
        .from('status_events')
        .select('id, to_status, created_at')
        .eq('job_id', job.id)
        .order('created_at', { ascending: false })
        .limit(1)

      latestEvent = events?.[0] ?? null
    }
  }

  let hasAcceptedQuote = false
  if (activeJob) {
    const { data: quotes } = await supabase
      .from('quotes')
      .select('id, status')
      .eq('job_id', activeJob.id)
      .eq('status', 'accepted')
      .limit(1)
    hasAcceptedQuote = (quotes?.length ?? 0) > 0
  }

  const { data: completedJobs } = await supabase
    .from('jobs')
    .select('id, customer_name, address, status, created_at, urgency')
    .eq('technician_id', tech.id)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(5)

  const firstName = tech.name.split(' ')[0]
  const urgency = activeJob?.urgency ?? 'scheduled'
  const urgencyBadge = URGENCY_BADGE[urgency] ?? URGENCY_BADGE.scheduled

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-lg">

        {/* Top bar */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-slate-400">Technician</p>
            <p className="mt-0.5 text-base font-semibold text-slate-950">{tech.name}</p>
          </div>
          <SignOutButtonClient />
        </div>

        {activeJob ? (
          <>
            {/* Now card */}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
              {/* Header */}
              <div className="border-b border-slate-100 px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-slate-400">Active job</p>
                    <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">{activeJob.customer_name}</h1>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <span className={`rounded border px-2 py-0.5 font-mono text-[10.5px] uppercase tracking-[0.06em] ${urgencyBadge.cls}`}>
                      {urgencyBadge.label}
                    </span>
                    <span className="font-mono text-[10.5px] uppercase tracking-[0.06em] text-slate-500">
                      {STATUS_LABEL[activeJob.status] ?? activeJob.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="divide-y divide-slate-100">
                <a
                  className="flex items-center gap-3 px-5 py-4 transition hover:bg-slate-50"
                  href={`https://maps.google.com/?q=${encodeURIComponent(activeJob.address)}`}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.06em] text-slate-400">Address</p>
                    <p className="mt-0.5 text-sm font-medium text-slate-950">{activeJob.address}</p>
                  </div>
                </a>
                <a
                  className="flex items-center gap-3 px-5 py-4 transition hover:bg-slate-50"
                  href={`tel:${activeJob.phone}`}
                >
                  <Phone className="h-4 w-4 shrink-0 text-slate-400" />
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.06em] text-slate-400">Customer phone</p>
                    <p className="mt-0.5 text-sm font-medium text-teal-700">{activeJob.phone}</p>
                  </div>
                </a>
                <div className="px-5 py-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.06em] text-slate-400">Issue</p>
                  <p className="mt-1 text-sm leading-6 text-slate-700">{activeJob.problem_description ?? activeJob.issue}</p>
                </div>
                {latestEvent && (
                  <div className="px-5 py-4">
                    <p className="font-mono text-[10px] uppercase tracking-[0.06em] text-slate-400">Last update</p>
                    <p className="mt-0.5 text-sm text-slate-600">
                      {STATUS_LABEL[latestEvent.to_status] ?? latestEvent.to_status} · {fmtTs(latestEvent.created_at)}
                    </p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="border-t border-slate-100 bg-slate-50 px-5 py-4">
                <TechJobActionsClient
                  jobId={activeJob.id}
                  status={activeJob.status}
                  hasAcceptedQuote={hasAcceptedQuote}
                />
                <Link
                  className="mt-3 block w-full rounded-xl border border-slate-200 bg-white py-2.5 text-center text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  href={`/tech/job/${activeJob.id}`}
                >
                  Full job detail
                </Link>
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
            <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-slate-400">Status</p>
            <h1 className="mt-3 text-xl font-semibold tracking-tight text-slate-950">No active job</h1>
            <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-slate-500">
              When dispatch assigns your next call, it will appear here.
            </p>
          </div>
        )}

        {/* Recent completed */}
        {(completedJobs?.length ?? 0) > 0 && (
          <div className="mt-6">
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.06em] text-slate-400">Recent completions</p>
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
              {completedJobs!.map((job, i) => (
                <Link
                  key={job.id}
                  className={`flex items-center justify-between gap-3 px-5 py-3.5 transition hover:bg-slate-50 ${i > 0 ? 'border-t border-slate-100' : ''}`}
                  href={`/tech/job/${job.id}`}
                >
                  <div>
                    <p className="text-sm font-medium text-slate-950">{job.customer_name}</p>
                    <p className="text-xs text-slate-500">{job.address}</p>
                  </div>
                  <span className="shrink-0 text-xs text-slate-400">{fmtTs(job.created_at)}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
