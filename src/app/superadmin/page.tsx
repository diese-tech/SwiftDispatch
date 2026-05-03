import Link from 'next/link'
import { requireSuperAdminProfile } from '@/lib/auth'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export default async function SuperAdminDashboard() {
  await requireSuperAdminProfile()
  const supabase = createSupabaseAdminClient()

  const [companiesRes, jobsRes, techsRes, usersRes] = await Promise.all([
    supabase.from('companies').select('id,name,slug,suspended,created_at').order('created_at', { ascending: false }),
    supabase.from('jobs').select('company_id,status,created_at'),
    supabase.from('technicians').select('company_id,availability_status'),
    supabase.from('users').select('company_id,role,created_at'),
  ])

  const companies = companiesRes.data ?? []
  const jobs = jobsRes.data ?? []
  const techs = techsRes.data ?? []
  const users = usersRes.data ?? []

  const activeJobs = jobs.filter(j => !['completed', 'cancelled'].includes(j.status))
  const totalTechs = techs.length

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const newJobsThisMonth = jobs.filter(j => j.created_at > thirtyDaysAgo).length

  return (
    <main className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-widest text-teal-700">SwiftDispatch</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">Platform Overview</h1>
          <p className="mt-1 text-sm text-slate-500">Super admin - all tenants</p>
        </div>

        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: 'Total companies', value: companies.length },
            { label: 'Active jobs', value: activeJobs.length },
            { label: 'Total technicians', value: totalTechs },
            { label: 'Jobs this month', value: newJobsThisMonth },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-500">{label}</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
            </div>
          ))}
        </div>

        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="font-semibold text-slate-900">All Companies</h2>
            <Link
              href="/superadmin/companies/new"
              className="rounded-md bg-teal-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-teal-800"
            >
              + New company
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50">
                <tr>
                  <th className="px-5 py-3 font-semibold text-slate-600">Company</th>
                  <th className="px-5 py-3 font-semibold text-slate-600">Slug</th>
                  <th className="px-5 py-3 font-semibold text-slate-600">Jobs</th>
                  <th className="px-5 py-3 font-semibold text-slate-600">Techs</th>
                  <th className="px-5 py-3 font-semibold text-slate-600">Users</th>
                  <th className="px-5 py-3 font-semibold text-slate-600">Status</th>
                  <th className="px-5 py-3 font-semibold text-slate-600"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {companies.map((company) => {
                  const companyJobs = jobs.filter(j => j.company_id === company.id)
                  const companyTechs = techs.filter(t => t.company_id === company.id)
                  const companyUsers = users.filter(u => u.company_id === company.id)
                  return (
                    <tr key={company.id} className={company.suspended ? 'bg-red-50' : ''}>
                      <td className="px-5 py-3">
                        <p className="font-medium text-slate-900">{company.name}</p>
                        <p className="font-mono text-xs text-slate-400">{company.id.slice(0, 8)}</p>
                      </td>
                      <td className="px-5 py-3 font-mono text-xs text-slate-600">{company.slug ?? '-'}</td>
                      <td className="px-5 py-3 text-slate-700">{companyJobs.length}</td>
                      <td className="px-5 py-3 text-slate-700">{companyTechs.length}</td>
                      <td className="px-5 py-3 text-slate-700">{companyUsers.length}</td>
                      <td className="px-5 py-3">
                        {company.suspended ? (
                          <span className="inline-flex rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">Suspended</span>
                        ) : (
                          <span className="inline-flex rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-semibold text-teal-700">Active</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <Link
                          href={`/superadmin/companies/${company.id}`}
                          className="text-sm font-semibold text-teal-700 hover:underline"
                        >
                          Manage
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  )
}

