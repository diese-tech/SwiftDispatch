import Link from "next/link";
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

  const activeCompanies = companies.filter((c) => !c.suspended).length;
  const suspendedCompanies = companies.filter((c) => c.suspended).length;

  return (
    <main>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-slate-400">Platform dispatch</p>
          <h1 className="mt-0.5 text-2xl font-semibold tracking-tight text-slate-950">Choose a company</h1>
        </div>
        <Link
          className="inline-flex items-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          href="/superadmin"
        >
          Back to platform
        </Link>
      </div>

      {/* Metrics strip */}
      <div className="mb-5 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 xl:grid-cols-4">
        {[{ label: "Companies", value: companies.length }, { label: "Active", value: activeCompanies }, { label: "Suspended", value: suspendedCompanies }, { label: "Total jobs", value: jobs.length }].map(({ label, value }) => (
          <div key={label} className="bg-white px-5 py-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-slate-400">{label}</p>
            <p className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-950">{value}</p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-semibold tracking-tight text-slate-950">Company dispatch entry</h2>
          <p className="mt-0.5 text-sm text-slate-500">Open the live board in read-only context for any tenant.</p>
        </div>
        <div className="divide-y divide-slate-100">
          {companies.length === 0 ? (
            <p className="px-6 py-6 text-sm text-slate-500">No companies found.</p>
          ) : companies.map((company) => {
            const companyJobs = jobs.filter((job) => job.company_id === company.id);
            const openJobs = companyJobs.filter((job) => !["completed", "cancelled"].includes(job.status)).length;
            return (
              <div className="flex flex-col gap-4 px-6 py-4 lg:flex-row lg:items-center lg:justify-between" key={company.id}>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-950">{company.name}</p>
                    <span className={`rounded border px-2 py-0.5 font-mono text-[10.5px] uppercase tracking-[0.06em] ${company.suspended ? "border-red-200 bg-red-50 text-red-700" : "border-teal-200 bg-teal-50 text-teal-700"}`}>
                      {company.suspended ? "Suspended" : "Active"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    {company.slug ? `/${company.slug}` : "No intake slug"} · {openJobs} open · {companyJobs.length} total
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    href={`/superadmin/companies/${company.id}`}
                  >
                    Manage
                  </Link>
                  <Link
                    className="inline-flex items-center rounded-full bg-orange-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-orange-300"
                    href={`/dispatch?impersonate=${company.id}`}
                  >
                    Open dispatch
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
