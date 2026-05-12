import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AppPageIntro, MetricTile, StatusPill, SurfaceCard } from '@/components/DesignSystem'
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
  if (status === 'cancelled' || status === 'no_access') return 'danger'
  if (status === 'quote_pending' || status === 'in_progress') return 'warm'
  if (status === 'assigned' || status === 'en_route') return 'teal'
  return 'neutral'
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
    <main className="min-h-screen px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <AppPageIntro
          eyebrow="Technician workspace"
          title={`Stay on top of today's field work, ${firstName}.`}
          description="See your active assignment, move the job forward, and keep the office aligned without bouncing between calls and text threads."
          actions={<SignOutButtonClient />}
        />

        <div className="grid gap-4 md:grid-cols-3">
          <MetricTile
            label="Current assignment"
            value={activeJob ? '1 live job' : 'No live job'}
            detail={
              activeJob
                ? `${STATUS_LABEL[activeJob.status] ?? activeJob.status} for ${activeJob.customer_name}`
                : 'Your dispatcher will assign the next call here.'
            }
          />
          <MetricTile
            label="Recent completions"
            value={completedJobs?.length ?? 0}
            detail="Last five completed jobs assigned to your technician account."
          />
          <MetricTile
            label="Response mode"
            value={urgencyBadge.label}
            detail="Urgency helps you prioritize travel, arrival, and quote timing."
          />
        </div>

        {activeJob ? (
          <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.95fr)]">
            <SurfaceCard accent className="space-y-6">
              <div className="flex flex-col gap-4 border-b border-slate-100 pb-6 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Active job
                  </p>
                  <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                    {activeJob.customer_name}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Job #{activeJob.id.slice(0, 8).toUpperCase()}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <StatusPill tone={urgencyBadge.tone}>{urgencyBadge.label}</StatusPill>
                  <StatusPill tone={getStatusTone(activeJob.status)}>
                    {STATUS_LABEL[activeJob.status] ?? activeJob.status}
                  </StatusPill>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Customer
                  </p>
                  <p className="mt-3 text-lg font-semibold text-slate-950">{activeJob.customer_name}</p>
                  <a
                    className="mt-3 inline-flex text-sm font-medium text-teal-700 underline-offset-4 hover:underline"
                    href={`tel:${activeJob.phone}`}
                  >
                    {activeJob.phone}
                  </a>
                </div>
                <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Last status update
                  </p>
                  <p className="mt-3 text-lg font-semibold text-slate-950">
                    {latestEvent ? fmtTs(latestEvent.created_at) : 'No timeline updates yet'}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    {latestEvent
                      ? `Most recent transition: ${STATUS_LABEL[latestEvent.to_status] ?? latestEvent.to_status}.`
                      : 'Once the job changes state, timing will appear here automatically.'}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Address</p>
                  <a
                    className="mt-3 inline-flex text-base font-semibold text-slate-950 underline-offset-4 hover:text-teal-700 hover:underline"
                    href={`https://maps.google.com/?q=${encodeURIComponent(activeJob.address)}`}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    {activeJob.address}
                  </a>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Open directions quickly before heading out.
                  </p>
                </div>
                <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Problem summary
                  </p>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    {activeJob.problem_description ?? activeJob.issue}
                  </p>
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-950 px-5 py-5 text-white">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-300">
                      Next action
                    </p>
                    <p className="mt-2 text-lg font-semibold">
                      Move the job forward with one clear field workflow.
                    </p>
                  </div>
                  <Link
                    className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
                    href={`/tech/job/${activeJob.id}`}
                  >
                    Open full job detail
                  </Link>
                </div>
                <div className="mt-5">
                  <TechJobActionsClient
                    jobId={activeJob.id}
                    status={activeJob.status}
                    hasAcceptedQuote={hasAcceptedQuote}
                  />
                </div>
              </div>
            </SurfaceCard>

            <div className="space-y-6">
              <SurfaceCard className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                      Workbench
                    </p>
                    <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
                      Field-ready flow
                    </h3>
                  </div>
                  <StatusPill tone="teal">Live</StatusPill>
                </div>
                <ul className="space-y-3 text-sm leading-6 text-slate-600">
                  <li className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                    Update arrival status so dispatch and the customer stay aligned.
                  </li>
                  <li className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                    Build the quote once diagnosis is complete and pricing is ready.
                  </li>
                  <li className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                    Mark complete after an approved quote and completed work.
                  </li>
                </ul>
              </SurfaceCard>

              <SurfaceCard>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                      Recent completed jobs
                    </p>
                    <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
                      Your last finished calls
                    </h3>
                  </div>
                  <StatusPill tone="success">{completedJobs?.length ?? 0} logged</StatusPill>
                </div>

                {(completedJobs?.length ?? 0) > 0 ? (
                  <div className="mt-5 space-y-3">
                    {completedJobs!.map((job) => (
                      <Link
                        key={job.id}
                        className="block rounded-[1.35rem] border border-slate-200 px-4 py-4 transition hover:border-teal-300 hover:bg-slate-50/80"
                        href={`/tech/job/${job.id}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-slate-950">{job.customer_name}</p>
                            <p className="mt-1 text-sm text-slate-500">{job.address}</p>
                          </div>
                          <span className="text-xs font-medium text-slate-400">{fmtTs(job.created_at)}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="mt-5 rounded-[1.35rem] border border-dashed border-slate-200 bg-slate-50/70 px-4 py-6 text-sm leading-6 text-slate-500">
                    Completed work will appear here once your first call closes out.
                  </div>
                )}
              </SurfaceCard>
            </div>
          </div>
        ) : (
          <SurfaceCard accent className="mt-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-teal-200 bg-teal-50 text-3xl text-teal-700">
              W
            </div>
            <h2 className="mt-5 text-2xl font-semibold tracking-tight text-slate-950">No active jobs right now</h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-500">
              You are clear for the moment. As soon as dispatch assigns your next visit, it will appear here with the address, customer contact, and status controls.
            </p>
          </SurfaceCard>
        )}
      </div>
    </main>
  )
}
