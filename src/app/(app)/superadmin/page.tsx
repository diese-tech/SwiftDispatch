import Link from "next/link";
import { requireSuperAdminProfile } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export default async function SuperAdminDashboard() {
  await requireSuperAdminProfile();
  const supabase = createSupabaseAdminClient();

  const [companiesRes, jobsRes, techsRes, usersRes] = await Promise.all([
    supabase.from("companies").select("id,name,slug,suspended,created_at").order("created_at", { ascending: false }),
    supabase.from("jobs").select("company_id,status,created_at"),
    supabase.from("technicians").select("company_id,availability_status"),
    supabase.from("users").select("company_id,role,created_at"),
  ]);

  const companies = companiesRes.data ?? [];
  const jobs = jobsRes.data ?? [];
  const techs = techsRes.data ?? [];
  const users = usersRes.data ?? [];
  const activeJobs = jobs.filter((j) => !["completed", "cancelled"].includes(j.status));
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const newJobsThisMonth = jobs.filter((j) => j.created_at > thirtyDaysAgo).length;

  const platformMetrics = [
    { label: "Companies", value: companies.length },
    { label: "Active jobs", value: activeJobs.length },
    { label: "Technicians", value: techs.length },
    { label: "Jobs this month", value: newJobsThisMonth },
  ];

  return (
    <main>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-slate-400">Platform overview</p>
          <h1 className="mt-0.5 text-2xl font-semibold tracking-tight text-slate-950">Superadmin</h1>
        </div>
        <Link
          className="inline-flex items-center rounded-full bg-orange-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-orange-300"
          href="/superadmin/companies/new"
        >
          + New company
        </Link>
      </div>

      {/* Platform metrics strip */}
      <div className="mb-6 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 xl:grid-cols-4">
        {platformMetrics.map(({ label, value }) => (
          <div key={label} className="bg-white px-5 py-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-slate-400">{label}</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{value}</p>
          </div>
        ))}
      </div>

      {/* Companies table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-semibold tracking-tight text-slate-950">All companies</h2>
          <p className="mt-0.5 text-sm text-slate-500">Platform health and account status.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50">
              <tr>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-[0.06em] text-slate-400">Company</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-[0.06em] text-slate-400">Slug</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-[0.06em] text-slate-400">Jobs</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-[0.06em] text-slate-400">Techs</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-[0.06em] text-slate-400">Users</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-[0.06em] text-slate-400">Status</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {companies.map((company) => {
                const companyJobs = jobs.filter((j) => j.company_id === company.id);
                const companyTechs = techs.filter((t) => t.company_id === company.id);
                const companyUsers = users.filter((u) => u.company_id === company.id);
                return (
                  <tr key={company.id} className={company.suspended ? "bg-red-50/40" : ""}>
                    <td className="px-5 py-3">
                      <p className="font-medium text-slate-900">{company.name}</p>
                      <p className="font-mono text-xs text-slate-400">{company.id.slice(0, 8)}</p>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-slate-600">{company.slug ?? "—"}</td>
                    <td className="px-5 py-3 text-slate-700">{companyJobs.length}</td>
                    <td className="px-5 py-3 text-slate-700">{companyTechs.length}</td>
                    <td className="px-5 py-3 text-slate-700">{companyUsers.length}</td>
                    <td className="px-5 py-3">
                      <span className={`rounded border px-2 py-0.5 font-mono text-[10.5px] uppercase tracking-[0.06em] ${company.suspended ? "border-red-200 bg-red-50 text-red-700" : "border-teal-200 bg-teal-50 text-teal-700"}`}>
                        {company.suspended ? "Suspended" : "Active"}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <Link className="text-sm font-semibold text-teal-700 hover:underline" href={`/superadmin/companies/${company.id}`}>
                        Manage
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
