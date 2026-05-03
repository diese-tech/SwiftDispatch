import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentProfile } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import KanbanBoard from '@/components/KanbanBoard'
import type { JobWithTechnician, Technician } from '@/types/db'

export default async function DispatchPage({
  searchParams,
}: {
  searchParams: Promise<{ impersonate?: string }>
}) {
  const profile = await getCurrentProfile()
  const { impersonate } = await searchParams

  let companyId: string
  let impersonating = false

  if (profile.role === 'super_admin' && impersonate) {
    companyId = impersonate
    impersonating = true
  } else if (profile.role === 'super_admin') {
    redirect('/superadmin')
  } else {
    if (!profile.company_id) redirect('/login')
    companyId = profile.company_id
  }

  const supabase = impersonating
    ? createSupabaseAdminClient()
    : await createSupabaseServerClient()

  const [{ data: jobs }, { data: technicians }, companyRes] = await Promise.all([
    supabase
      .from('jobs')
      .select('*, technicians(id,name,phone)')
      .eq('company_id', companyId)
      .not('status', 'in', '("completed","cancelled")')
      .order('created_at', { ascending: false }),
    supabase
      .from('technicians')
      .select('id,name,phone')
      .eq('company_id', companyId),
    impersonating
      ? supabase.from('companies').select('name').eq('id', companyId).single()
      : Promise.resolve({ data: null }),
  ])

  return (
    <div className="px-6 py-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Dispatch Board</h1>
          {impersonating && (
            <p className="mt-1 text-sm font-semibold text-amber-600">
              Viewing as: {(companyRes as { data: { name: string } | null }).data?.name ?? companyId} - read-only context
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {!impersonating && (
            <a href="/dispatch/jobs/new" className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800">
              + New Job
            </a>
          )}
          {impersonating && (
            <Link href="/superadmin" className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              Back to platform
            </Link>
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

