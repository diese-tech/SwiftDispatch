import Link from "next/link";
import { addTechniciansAction, createCompanyAction, createDispatcherAction, resetCompanyDataAction, seedDemoAction } from "@/app/admin/actions";
import { AppPageIntro, MetricTile, SurfaceCard, StatusPill } from "@/components/DesignSystem";
import { requireAdminProfile } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type CompanyRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  close_status: string;
  demo_mode_enabled: boolean;
};

function AdminSection({ id, title, description, children }: { id: string; title: string; description: string; children: React.ReactNode }) {
  return (
    <SurfaceCard accent className="h-full" >
      <section id={id}>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-950">{title}</h2>
        <p className="mt-2 text-sm leading-7 text-slate-500">{description}</p>
        <div className="mt-5">{children}</div>
      </section>
    </SurfaceCard>
  );
}

function Field({ label, name, type = "text", required = false }: { label: string; name: string; type?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <input className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100" name={name} required={required} type={type} />
    </label>
  );
}

function CompanySelect({ companies }: { companies: CompanyRow[] }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700">Company</span>
      <select className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100" name="company_id" required>
        <option value="">Select company</option>
        {companies.map((company) => <option key={company.id} value={company.id}>{company.name} - {company.id}</option>)}
      </select>
    </label>
  );
}

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ created_company_id?: string }> }) {
  await requireAdminProfile();
  const { created_company_id } = await searchParams;
  const supabase = createSupabaseAdminClient();
  const [companiesResult, jobsResult, techsResult] = await Promise.all([
    supabase.from("companies").select("id,name,email,phone,close_status,demo_mode_enabled").order("created_at", { ascending: false }),
    supabase.from("jobs").select("company_id,is_demo"),
    supabase.from("technicians").select("company_id"),
  ]);

  if (companiesResult.error) throw new Error(companiesResult.error.message);
  if (jobsResult.error) throw new Error(jobsResult.error.message);
  if (techsResult.error) throw new Error(techsResult.error.message);

  const companies = (companiesResult.data ?? []) as CompanyRow[];
  const jobs = jobsResult.data ?? [];
  const techs = techsResult.data ?? [];
  const activePilots = companies.filter((company) => ["contacted", "demo_done", "interested"].includes(company.close_status)).length;

  return (
    <main>
      <AppPageIntro
        eyebrow="Admin operations"
        title="Manage companies, demo environments, and dispatch users."
        description="This workspace keeps internal setup and pilot support organized without breaking the operating feel of the rest of the product."
        actions={<Link className="inline-flex items-center rounded-full border border-white/14 bg-white/8 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/12" href="/dashboard">Dispatcher Portal</Link>}
      />

      {created_company_id ? (
        <div className="mb-6"><StatusPill tone="success">Company created: {created_company_id}</StatusPill></div>
      ) : null}

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <MetricTile label="Total companies" value={companies.length} detail="All company records in the system" />
        <MetricTile label="Active pilots" value={activePilots} detail="Companies in active contact or demo stages" />
        <MetricTile label="Demo environments" value={companies.filter((company) => company.demo_mode_enabled).length} detail="Companies with demo mode switched on" />
      </div>

      <nav className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {[["Create Company", "#create-company"], ["Dispatcher User", "#create-dispatcher"], ["Add Technicians", "#add-technicians"], ["Seed Demo", "#seed-demo"], ["Reset Data", "#reset-company"], ["Companies", "#companies-overview"]].map(([label, href]) => (
          <a className="rounded-full border border-slate-200 bg-white px-4 py-3 text-center text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50" href={href} key={href}>{label}</a>
        ))}
      </nav>

      <div className="grid gap-5 xl:grid-cols-2">
        <AdminSection id="create-company" title="Create Company" description="Start a new company record for onboarding, pilots, or live accounts.">
          <form action={createCompanyAction} className="grid gap-3">
            <Field label="Company name" name="company_name" required />
            <Field label="Email" name="email" required type="email" />
            <Field label="Phone" name="phone" />
            <button className="rounded-full bg-slate-950 px-4 py-3 font-semibold text-white">Create Company</button>
          </form>
        </AdminSection>

        <AdminSection id="create-dispatcher" title="Create Dispatcher User" description="Add an internal user with dispatcher access for a selected company.">
          <form action={createDispatcherAction} className="grid gap-3">
            <CompanySelect companies={companies} />
            <Field label="Email" name="email" required type="email" />
            <Field label="Password" name="password" required type="password" />
            <button className="rounded-full bg-slate-950 px-4 py-3 font-semibold text-white">Create Dispatcher</button>
          </form>
        </AdminSection>

        <AdminSection id="add-technicians" title="Add Technicians" description="Create a single technician or bulk import multiple field users at once.">
          <form action={addTechniciansAction} className="grid gap-3">
            <CompanySelect companies={companies} />
            <Field label="Single technician name" name="name" />
            <Field label="Single technician phone" name="phone" />
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Bulk technicians, one per line: name, phone</span>
              <textarea className="min-h-28 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100" name="bulk" />
            </label>
            <button className="rounded-full bg-slate-950 px-4 py-3 font-semibold text-white">Add Technicians</button>
          </form>
        </AdminSection>

        <AdminSection id="seed-demo" title="Seed Demo or Pilot Data" description="Populate a selected company with sample operational data for demos or pilot readiness.">
          <form action={seedDemoAction} className="grid gap-3">
            <CompanySelect companies={companies} />
            <button className="rounded-full bg-teal-700 px-4 py-3 font-semibold text-white" id="seed_demo">Seed Demo / Pilot Data</button>
          </form>
        </AdminSection>

        <AdminSection id="reset-company" title="Reset Company Data" description="Wipe operational data for a selected company when you need a clean testing state.">
          <form action={resetCompanyDataAction} className="grid gap-3">
            <CompanySelect companies={companies} />
            <button className="rounded-full bg-red-700 px-4 py-3 font-semibold text-white" id="reset_company">Reset Company Data</button>
          </form>
        </AdminSection>
      </div>

      <div className="mt-6" id="companies-overview">
        <SurfaceCard accent className="overflow-hidden p-0">
          <div className="border-b border-slate-200 px-6 py-5">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Companies overview</h2>
            <p className="mt-2 text-sm text-slate-500">Review usage patterns, demo environments, and company health from one table.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Company ID</th>
                  <th className="px-4 py-3">Close status</th>
                  <th className="px-4 py-3">Jobs</th>
                  <th className="px-4 py-3">Technicians</th>
                  <th className="px-4 py-3">Usage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {companies.map((company) => {
                  const companyJobs = jobs.filter((job) => job.company_id === company.id);
                  const demoJobs = companyJobs.filter((job) => job.is_demo);
                  return (
                    <tr key={company.id}>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900">{company.name}</p>
                        <p className="text-xs text-slate-500">{company.email}</p>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{company.id}</td>
                      <td className="px-4 py-3">{company.close_status}</td>
                      <td className="px-4 py-3">{companyJobs.length}</td>
                      <td className="px-4 py-3">{techs.filter((tech) => tech.company_id === company.id).length}</td>
                      <td className="px-4 py-3">{demoJobs.length ? "demo/test" : "real"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </SurfaceCard>
      </div>
    </main>
  );
}