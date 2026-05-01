import { redirect } from 'next/navigation'
import { getCurrentProfile } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import KanbanBoard from '@/components/KanbanBoard'
import type { JobWithTechnician, Technician } from '@/types/db'

export default async function DispatchPage() {
  const profile = await getCurrentProfile()
  const supabase = await createSupabaseServerClient()

  const [{ data: jobs }, { data: technicians }] = await Promise.all([
    supabase
      .from('jobs')
      .select('*, technicians(id,name,phone)')
      .eq('company_id', profile.company_id)
      .not('status', 'in', '("completed","cancelled")')
      .order('created_at', { ascending: false }),
    supabase
      .from('technicians')
      .select('id,name,phone')
      .eq('company_id', profile.company_id),
  ])

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-200 bg-white px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Dispatch Board</h1>
        <div className="flex items-center gap-4">
          <a href="/dispatch/jobs/new" className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800">
            + New Job
          </a>
          <a href="/analytics" className="text-sm text-slate-600 hover:underline">Analytics</a>
          {profile.role === 'admin' && (
            <a href="/admin" className="text-sm text-slate-600 hover:underline">Admin</a>
          )}
        </div>
      </div>
      <KanbanBoard
        initialJobs={(jobs ?? []) as JobWithTechnician[]}
        technicians={(technicians ?? []) as Technician[]}
      />
    </div>
  )
}
