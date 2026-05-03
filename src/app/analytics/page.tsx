import { getCurrentProfile } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase/server'

function MetricCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
    </div>
  )
}

export default async function AnalyticsPage() {
  const profile = await getCurrentProfile()
  const supabase = await createSupabaseServerClient()
  const companyId = profile.company_id
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const { data: responseTimes } = await supabase
    .from('jobs')
    .select('created_at, en_route_at')
    .eq('company_id', companyId)
    .not('en_route_at', 'is', null)
    .gte('created_at', thirtyDaysAgo)

  const avgResponseMinutes = (() => {
    const valid = (responseTimes ?? []).filter(j => j.en_route_at)
    if (!valid.length) return null
    const sum = valid.reduce((s, j) => {
      const diff = new Date(j.en_route_at!).getTime() - new Date(j.created_at).getTime()
      return s + diff / 60000
    }, 0)
    return Math.round(sum / valid.length)
  })()

  const { count: completedCount } = await supabase
    .from('jobs')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .eq('status', 'completed')
    .gte('completed_at', thirtyDaysAgo)

  const { data: quotesForRate } = await supabase
    .from('quotes')
    .select('status, jobs!inner(company_id)')
    .eq('jobs.company_id', companyId)
    .gte('created_at', thirtyDaysAgo)

  const acceptanceRate = (() => {
    const all = (quotesForRate ?? []).filter(q => q.status !== 'draft')
    if (!all.length) return null
    const accepted = all.filter(q => q.status === 'accepted').length
    return Math.round((accepted / all.length) * 100)
  })()

  const { data: durations } = await supabase
    .from('jobs')
    .select('arrived_at, completed_at')
    .eq('company_id', companyId)
    .not('arrived_at', 'is', null)
    .not('completed_at', 'is', null)
    .gte('completed_at', thirtyDaysAgo)

  const avgDurationMinutes = (() => {
    const valid = (durations ?? []).filter(j => j.arrived_at && j.completed_at)
    if (!valid.length) return null
    const sum = valid.reduce((s, j) => {
      const diff = new Date(j.completed_at!).getTime() - new Date(j.arrived_at!).getTime()
      return s + diff / 60000
    }, 0)
    return Math.round(sum / valid.length)
  })()

  const { data: revenueData } = await supabase
    .from('jobs')
    .select('technician_id, quotes!inner(total_amount, total, status), technicians(name)')
    .eq('company_id', companyId)
    .gte('completed_at', thirtyDaysAgo)

  const revenueByTech: Record<string, { name: string; revenue: number }> = {}
  ;(revenueData ?? []).forEach(job => {
    if (!job.technician_id) return
    const techData = Array.isArray(job.technicians) ? job.technicians[0] : job.technicians
    const techName = techData?.name ?? 'Unknown'
    const quotes = Array.isArray(job.quotes) ? job.quotes : [job.quotes]
    const revenue = quotes
      .filter((q: { status: string }) => q?.status === 'accepted')
      .reduce((s: number, q: { total_amount?: number; total?: number }) => s + (q?.total_amount ?? q?.total ?? 0), 0)
    if (!revenueByTech[job.technician_id]) {
      revenueByTech[job.technician_id] = { name: techName, revenue: 0 }
    }
    revenueByTech[job.technician_id].revenue += revenue
  })

  const topTechs = Object.values(revenueByTech)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)

  const { count: totalJobs } = await supabase
    .from('jobs')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .gte('created_at', thirtyDaysAgo)

  const { count: noAccessCount } = await supabase
    .from('jobs')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .eq('status', 'no_access')
    .gte('created_at', thirtyDaysAgo)

  const noAccessRate = totalJobs ? Math.round(((noAccessCount ?? 0) / totalJobs) * 100) : null

  const fmt = (v: number | null | undefined, suffix = '') =>
    v != null ? `${v}${suffix}` : 'No data yet'

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-8">
        <p className="text-xs font-bold uppercase tracking-widest text-teal-700">SwiftDispatch</p>
        <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
        <p className="text-sm text-slate-500">Last 30 days</p>
      </div>

      <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          label="Avg Response Time"
          value={fmt(avgResponseMinutes, ' min')}
          sub="Time from job created to tech en route. Target: under 20 min"
        />
        <MetricCard
          label="Jobs Completed"
          value={fmt(completedCount)}
          sub="Completed in the last 30 days"
        />
        <MetricCard
          label="Quote Acceptance Rate"
          value={fmt(acceptanceRate, '%')}
          sub="Industry benchmark: above 75% is healthy"
        />
        <MetricCard
          label="Avg Job Duration"
          value={fmt(avgDurationMinutes, ' min')}
          sub="Time from arrival to completion"
        />
        <MetricCard
          label="No-Access Rate"
          value={fmt(noAccessRate, '%')}
          sub="Above 10% signals scheduling or address issues"
        />
        <MetricCard
          label="Total Jobs Created"
          value={fmt(totalJobs)}
          sub="All jobs opened in the last 30 days"
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Revenue Per Technician (last 30 days)</h2>
        {topTechs.length === 0 ? (
          <p className="text-sm text-slate-400">No revenue data yet.</p>
        ) : (
          <div className="space-y-3">
            {topTechs.map(({ name, revenue }) => (
              <div key={name} className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">{name}</span>
                <span className="text-sm font-bold text-teal-700">
                  ${revenue.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
