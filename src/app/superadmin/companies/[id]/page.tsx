import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireSuperAdminProfile } from '@/lib/auth'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import {
  suspendCompanyAction,
  unsuspendCompanyAction,
  createDispatcherForCompanyAction,
  addTechnicianToCompanyAction,
} from './actions'

function Field({ label, name, type = 'text', required = false }: { label: string; name: string; type?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      <input className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" name={name} type={type} required={required} />
    </label>
  )
}

export default async function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSuperAdminProfile()
  const { id } = await params
  const supabase = createSupabaseAdminClient()

  const [companyRes, jobsRes, techsRes, usersRes, eventsRes] = await Promise.all([
    supabase.from('companies').select('*').eq('id', id).single(),
    supabase.from('jobs').select('id,status,created_at,customer_name,urgency').eq('company_id', id).order('created_at', { ascending: false }).limit(20),
    supabase.from('technicians').select('id,name,phone,availability_status').eq('company_id', id),
    supabase.from('users').select('id,email,role,created_at').eq('company_id', id),
    supabase.from('status_events').select('id,to_status,created_at').eq('company_id' as never, id).order('created_at', { ascending: false }).limit(10),
  ])

  if (!companyRes.data) notFound()

  const company = companyRes.data
  const jobs = jobsRes.data ?? []
  const techs = techsRes.data ?? []
  const users = usersRes.data ?? []

  const activeJobs = jobs.filter(j => !['completed', 'cancelled'].includes(j.status))
  const completedJobs = jobs.filter(j => j.status === 'completed')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

  return (
    <main className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        {/* Breadcrumb */}
        <div className="mb-6 flex items-center gap-2 text-sm">
          <Link href="/superadmin" className="text-teal-700 hover:underline">Platform</Link>
          <span className="text-slate-400">/</span>
          <span className="text-slate-700 font-medium">{company.name}</span>
        </div>

        {/* Header */}
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">{company.name}</h1>
            <p className="mt-0.5 font-mono text-xs text-slate-400">{company.id}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {/* Impersonate — opens dispatch board in context of this company */}
            <a
              href={`/dispatch?impersonate=${company.id}`}
              className="rounded-md border border-teal-700 px-3 py-2 text-sm font-semibold text-teal-700 hover:bg-teal-50"
            >
              View dispatch board
            </a>
            {company.suspended ? (
              <form action={unsuspendCompanyAction}>
                <input type="hidden" name="company_id" value={company.id} />
                <button type="submit" className="rounded-md border border-teal-700 bg-white px-3 py-2 text-sm font-semibold text-teal-700 hover:bg-teal-50">
                  Unsuspend
                </button>
              </form>
            ) : (
              <form action={suspendCompanyAction}>
                <input type="hidden" name="company_id" value={company.id} />
                <button type="submit" className="rounded-md border border-red-300 bg-white px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50">
                  Suspend
                </button>
              </form>
            )}
          </div>
        </div>

        {company.suspended && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            This company is suspended. Dispatchers cannot access the platform.
          </div>
        )}

        {/* Stats */}
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: 'Total jobs', value: jobs.length },
            { label: 'Active jobs', value: activeJobs.length },
            { label: 'Completed jobs', value: completedJobs.length },
            { label: 'Technicians', value: techs.length },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-500">{label}</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Users */}
          <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <h2 className="border-b border-slate-100 px-5 py-3 font-semibold text-slate-900">Users</h2>
            <div className="divide-y divide-slate-100">
              {users.length === 0 && (
                <p className="px-5 py-4 text-sm text-slate-500">No users yet.</p>
              )}
              {users.map(u => (
                <div key={u.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{u.email}</p>
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{u.role}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Technicians */}
          <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <h2 className="border-b border-slate-100 px-5 py-3 font-semibold text-slate-900">Technicians</h2>
            <div className="divide-y divide-slate-100">
              {techs.length === 0 && (
                <p className="px-5 py-4 text-sm text-slate-500">No technicians yet.</p>
              )}
              {techs.map(t => (
                <div key={t.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{t.name}</p>
                    <p className="text-xs text-slate-500">{t.phone ?? '—'}</p>
                  </div>
                  <span className={`text-xs font-semibold uppercase tracking-wide ${
                    t.availability_status === 'available' ? 'text-teal-600' :
                    t.availability_status === 'on_job' ? 'text-amber-600' : 'text-slate-400'
                  }`}>{t.availability_status}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Add dispatcher */}
          <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <h2 className="border-b border-slate-100 px-5 py-3 font-semibold text-slate-900">Add Dispatcher</h2>
            <form action={createDispatcherForCompanyAction} className="grid gap-3 p-5">
              <input type="hidden" name="company_id" value={company.id} />
              <Field label="Email" name="email" type="email" required />
              <Field label="Password" name="password" type="password" required />
              <button type="submit" className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
                Create Dispatcher
              </button>
            </form>
          </section>

          {/* Add technician */}
          <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <h2 className="border-b border-slate-100 px-5 py-3 font-semibold text-slate-900">Add Technician</h2>
            <form action={addTechnicianToCompanyAction} className="grid gap-3 p-5">
              <input type="hidden" name="company_id" value={company.id} />
              <Field label="Name" name="name" required />
              <Field label="Phone" name="phone" required />
              <button type="submit" className="rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800">
                Add Technician
              </button>
            </form>
          </section>
        </div>

        {/* Recent jobs */}
        <section className="mt-6 rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
          <h2 className="border-b border-slate-100 px-5 py-3 font-semibold text-slate-900">Recent Jobs</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px] text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3 font-semibold text-slate-600">Customer</th>
                  <th className="px-5 py-3 font-semibold text-slate-600">Status</th>
                  <th className="px-5 py-3 font-semibold text-slate-600">Urgency</th>
                  <th className="px-5 py-3 font-semibold text-slate-600">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {jobs.length === 0 && (
                  <tr><td colSpan={4} className="px-5 py-4 text-sm text-slate-500">No jobs yet.</td></tr>
                )}
                {jobs.map(job => (
                  <tr key={job.id}>
                    <td className="px-5 py-3 font-medium text-slate-900">{job.customer_name}</td>
                    <td className="px-5 py-3 text-slate-600">{job.status}</td>
                    <td className="px-5 py-3 text-slate-600">{job.urgency ?? '—'}</td>
                    <td className="px-5 py-3 text-slate-500 text-xs">
                      {new Date(job.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  )
}

