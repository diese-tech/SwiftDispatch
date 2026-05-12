import Link from "next/link";
import { AppPageIntro, MetricTile, StatusPill, SurfaceCard } from "@/components/DesignSystem";
import { requireSuperAdminProfile } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export default async function SuperAdminDispatchChooserPage() {
  await requireSuperAdminProfile();
  const supabase = createSupabaseAdminClient();

  const [companiesRes, jobsRes] = await Promise.all([
    supabase.from("companies").select("id,name,slug,suspended,created_at").order("name", { ascending: true }),
    supabase.from("jobs").select("company_id,status"),
  ]);

  const companies = companiesRes.data ?? [];
  const jobs = jobsRes.data ?? [];

  const activeCompanies = companies.filter((company) => !company.suspended).length;
  const suspendedCompanies = companies.filter((company) => company.suspended).length;

  return (
    <main>
      <AppPageIntro
        eyebrow="Platform dispatch"
        title="Choose a company before entering dispatch."
        description="Superadmin dispatch access is read-only and company-specific. Pick a tenant below to open the dispatch board from that company's point of view."
        actions={
          <Link
            className="inline-flex items-center rounded-full border border-white/14 bg-white/8 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/12"
            href="/superadmin"
          >
            Back to platform
          </Link>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <MetricTile label="Total companies" value={companies.length} detail="Available tenant workspaces" />
        <MetricTile label="Active companies" value={activeCompanies} detail="Can be opened in dispatch impersonation" />
        <MetricTile label="Suspended companies" value={suspendedCompanies} detail="Blocked from normal access" />
        <MetricTile label="Tracked jobs" value={jobs.length} detail="Operational volume across all tenants" />
      </div>

      <SurfaceCard accent className="overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Company dispatch entry</h2>
            <p className="mt-2 text-sm text-slate-500">Open the live board in a read-only superadmin context for any tenant.</p>
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          {companies.length === 0 ? (
            <p className="px-6 py-6 text-sm text-slate-500">No companies found.</p>
          ) : (
            companies.map((company) => {
              const companyJobs = jobs.filter((job) => job.company_id === company.id);
              const openJobs = companyJobs.filter((job) => !["completed", "cancelled"].includes(job.status)).length;

              return (
                <div className="flex flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:justify-between" key={company.id}>
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="text-lg font-semibold text-slate-950">{company.name}</p>
                      {company.suspended ? <StatusPill tone="danger">Suspended</StatusPill> : <StatusPill tone="teal">Active</StatusPill>}
                    </div>
                    <p className="mt-2 text-sm text-slate-500">
                      {company.slug ? `/${company.slug}` : "No intake slug yet"} · {openJobs} open jobs · {companyJobs.length} tracked jobs
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Link
                      className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      href={`/superadmin/companies/${company.id}`}
                    >
                      Manage company
                    </Link>
                    <Link
                      className="inline-flex items-center rounded-full bg-orange-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-orange-300"
                      href={`/dispatch?impersonate=${company.id}`}
                    >
                      Open dispatch board
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </SurfaceCard>
    </main>
  );
}
