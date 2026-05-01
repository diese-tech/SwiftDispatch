import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { JobStatus } from '@/lib/stateMachine'
import { VALID_TRANSITIONS } from '@/lib/stateMachine'

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

type ActionButtonProps = {
  jobId: string
  label: string
  targetStatus: JobStatus
  currentStatus: string
  variant?: 'primary' | 'secondary'
}

function canTransition(current: string, target: JobStatus): boolean {
  const transitions = VALID_TRANSITIONS[current as JobStatus]
  return Array.isArray(transitions) && transitions.includes(target)
}

function ActionButton({ jobId, label, targetStatus, currentStatus, variant = 'secondary' }: ActionButtonProps) {
  const enabled = canTransition(currentStatus, targetStatus)
  const base =
    'inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-semibold transition disabled:opacity-40'
  const cls =
    variant === 'primary'
      ? `${base} bg-teal-700 text-white hover:bg-teal-800`
      : `${base} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`

  if (!enabled) {
    return (
      <button className={cls} disabled type="button">
        {label}
      </button>
    )
  }

  return (
    <form
      action={async () => {
        'use server'
        // Handled by client interaction — see TechActions component
      }}
    >
      <TechActionButton jobId={jobId} label={label} targetStatus={targetStatus} variant={variant} />
    </form>
  )
}

// Inline client component for PATCH calls
function TechActionButton({
  jobId,
  label,
  targetStatus,
  variant = 'secondary',
}: {
  jobId: string
  label: string
  targetStatus: JobStatus
  variant?: 'primary' | 'secondary'
}) {
  // This component needs to be client-side. We'll inline with a script approach.
  // Because we're in a server component file, we export a separate client component below.
  return null
}

export default async function TechDashboardPage() {
  const supabase = await createSupabaseServerClient()

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/tech/login')

  // Check role via users table
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
    .select('id, name, current_job_id, company_id')
    .eq('auth_user_id', user.id)
    .single()

  if (!tech) redirect('/tech/login')

  let activeJob: DbJob | null = null
  let latestEvent: StatusEvent | null = null

  if (tech.current_job_id) {
    const { data: job } = await supabase
      .from('jobs')
      .select('id, customer_name, phone, address, issue, problem_description, status, urgency, created_at, customers(name, phone)')
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

  // Check if active job has an accepted quote (for Mark Complete)
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

  // Last 5 completed jobs
  const { data: completedJobs } = await supabase
    .from('jobs')
    .select('id, customer_name, address, status, created_at, urgency')
    .eq('technician_id', tech.id)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(5)

  const urgency = activeJob?.urgency ?? 'scheduled'
  const badgeCls = URGENCY_BADGE[urgency] ?? URGENCY_BADGE.scheduled
  const urgencyLabel = URGENCY_LABEL[urgency] ?? urgency

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6">
      <div className="mx-auto max-w-lg">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-teal-700">
              SwiftDispatch
            </p>
            <h1 className="text-xl font-semibold text-slate-900">
              Hi, {tech.name.split(' ')[0]}
            </h1>
          </div>
          <form action="/api/auth/signout" method="POST">
            <SignOutButton />
          </form>
        </div>

        {activeJob ? (
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            {/* Job header */}
            <div className="border-b border-slate-100 p-5">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-lg font-semibold text-slate-900">
                  Active Job
                </h2>
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeCls}`}
                >
                  {urgencyLabel}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span className="inline-flex rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-semibold text-teal-800">
                  {STATUS_LABEL[activeJob.status] ?? activeJob.status}
                </span>
                {latestEvent && (
                  <span className="text-xs text-slate-400">
                    since {fmtTs(latestEvent.created_at)}
                  </span>
                )}
              </div>
            </div>

            {/* Customer info */}
            <div className="border-b border-slate-100 p-5">
              <p className="mb-0.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Customer
              </p>
              <p className="font-semibold text-slate-900">{activeJob.customer_name}</p>
              <a
                className="mt-1 inline-block text-sm text-teal-700 underline-offset-2 hover:underline"
                href={`tel:${activeJob.phone}`}
              >
                {activeJob.phone}
              </a>
            </div>

            {/* Address */}
            <div className="border-b border-slate-100 p-5">
              <p className="mb-0.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Address
              </p>
              <a
                className="text-sm font-medium text-teal-700 underline-offset-2 hover:underline"
                href={`https://maps.google.com/?q=${encodeURIComponent(activeJob.address)}`}
                rel="noopener noreferrer"
                target="_blank"
              >
                {activeJob.address}
              </a>
            </div>

            {/* Problem */}
            <div className="border-b border-slate-100 p-5">
              <p className="mb-0.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Problem
              </p>
              <p className="text-sm text-slate-700">
                {activeJob.problem_description ?? activeJob.issue}
              </p>
            </div>

            {/* Action buttons */}
            <div className="p-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Actions
              </p>
              <TechJobActions
                jobId={activeJob.id}
                status={activeJob.status}
                hasAcceptedQuote={hasAcceptedQuote}
              />
            </div>
          </section>
        ) : (
          <section className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
            <div className="mb-2 text-3xl">🔧</div>
            <h2 className="text-lg font-semibold text-slate-900">No active jobs</h2>
            <p className="mt-1 text-sm text-slate-500">
              Check back soon. Your dispatcher will assign your next job.
            </p>
          </section>
        )}

        {/* Completed jobs */}
        {(completedJobs?.length ?? 0) > 0 && (
          <section className="mt-6">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Recent Completed Jobs
            </h2>
            <div className="space-y-2">
              {completedJobs!.map((job) => (
                <Link
                  key={job.id}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm transition hover:border-teal-300"
                  href={`/tech/job/${job.id}`}
                >
                  <div>
                    <p className="font-medium text-slate-900">{job.customer_name}</p>
                    <p className="text-xs text-slate-500">{job.address}</p>
                  </div>
                  <span className="ml-3 shrink-0 text-xs text-slate-400">
                    {fmtTs(job.created_at)}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}

// ─── Client components ─────────────────────────────────────────────────────

function SignOutButton() {
  return <SignOutButtonClient />
}

function TechJobActions({
  jobId,
  status,
  hasAcceptedQuote,
}: {
  jobId: string
  status: string
  hasAcceptedQuote: boolean
}) {
  return <TechJobActionsClient jobId={jobId} status={status} hasAcceptedQuote={hasAcceptedQuote} />
}

// ─── Client component implementations live in the same file ────────────────
// We must mark them explicitly with 'use client' in a separate module.
// Since this file is a Server Component, we import them from a co-located file.
// They're declared here as pass-throughs that render the actual client components.
// However, Next.js 14 allows mixing by importing from a client-boundary file.

import { TechJobActionsClient, SignOutButtonClient } from './TechClientComponents'
