import Link from "next/link";
import {
  addTechniciansAction,
  createCompanyAction,
  createDispatcherAction,
  resetCompanyDataAction,
  seedDemoAction,
} from "@/app/admin/actions";
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

function AdminSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
      id={id}
    >
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  name,
  type = "text",
  required = false,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </span>
      <input
        className="w-full rounded-md border border-slate-300 px-3 py-2"
        name={name}
        required={required}
        type={type}
      />
    </label>
  );
}

function CompanySelect({ companies }: { companies: CompanyRow[] }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">
        Company
      </span>
      <select
        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2"
        name="company_id"
        required
      >
        <option value="">Select company</option>
        {companies.map((company) => (
          <option key={company.id} value={company.id}>
            {company.name} - {company.id}
          </option>
        ))}
      </select>
    </label>
  );
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ created_company_id?: string }>;
}) {
  await requireAdminProfile();
  const { created_company_id } = await searchParams;
  const supabase = createSupabaseAdminClient();

  const [companiesResult, jobsResult, techsResult] = await Promise.all([
    supabase
      .from("companies")
      .select("id,name,email,phone,close_status,demo_mode_enabled")
      .order("created_at", { ascending: false }),
    supabase.from("jobs").select("company_id,is_demo"),
    supabase.from("technicians").select("company_id"),
  ]);

  if (companiesResult.error) throw new Error(companiesResult.error.message);
  if (jobsResult.error) throw new Error(jobsResult.error.message);
  if (techsResult.error) throw new Error(techsResult.error.message);

  const companies = (companiesResult.data ?? []) as CompanyRow[];
  const jobs = jobsResult.data ?? [];
  const techs = techsResult.data ?? [];
  const activePilots = companies.filter((company) =>
    ["contacted", "demo_done", "interested"].includes(company.close_status),
  ).length;

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
            SwiftDispatch Internal
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Admin Operations
          </h1>
        </div>
        <Link
          className="rounded-md border border-slate-300 bg-white px-4 py-3 text-center text-base font-semibold"
          href="/dashboard"
        >
          Dispatcher Portal
        </Link>
      </div>

      <nav className="mb-5 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {[
          ["Create Company", "#create-company"],
          ["Create Dispatcher User", "#create-dispatcher"],
          ["Add Technicians", "#add-technicians"],
          ["Seed Demo / Pilot Data", "#seed-demo"],
          ["Reset Company Data", "#reset-company"],
          ["View Companies Overview", "#companies-overview"],
        ].map(([label, href]) => (
          <a
            className="rounded-md border border-slate-200 bg-white px-3 py-3 text-center text-sm font-semibold"
            href={href}
            key={href}
          >
            {label}
          </a>
        ))}
      </nav>

      {created_company_id ? (
        <div className="mb-5 rounded-lg border border-teal-200 bg-teal-50 p-4 font-semibold text-teal-900">
          Company created: <span className="font-mono">{created_company_id}</span>
        </div>
      ) : null}

      <section className="mb-5 grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Total companies</p>
          <p className="mt-2 text-3xl font-semibold">{companies.length}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Active pilots</p>
          <p className="mt-2 text-3xl font-semibold">{activePilots}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Demo environments</p>
          <p className="mt-2 text-3xl font-semibold">
            {companies.filter((company) => company.demo_mode_enabled).length}
          </p>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <AdminSection id="create-company" title="Create Company">
          <form action={createCompanyAction} className="grid gap-3">
            <Field label="Company name" name="company_name" required />
            <Field label="Email" name="email" type="email" required />
            <Field label="Phone" name="phone" />
            <button className="rounded-md bg-slate-900 px-4 py-3 font-semibold text-white">
              Create Company
            </button>
          </form>
        </AdminSection>

        <AdminSection id="create-dispatcher" title="Create Dispatcher User">
          <form action={createDispatcherAction} className="grid gap-3">
            <CompanySelect companies={companies} />
            <Field label="Email" name="email" type="email" required />
            <Field label="Password" name="password" type="password" required />
            <button className="rounded-md bg-slate-900 px-4 py-3 font-semibold text-white">
              Create Dispatcher
            </button>
          </form>
        </AdminSection>

        <AdminSection id="add-technicians" title="Add Technicians">
          <form action={addTechniciansAction} className="grid gap-3">
            <CompanySelect companies={companies} />
            <Field label="Single technician name" name="name" />
            <Field label="Single technician phone" name="phone" />
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Bulk technicians, one per line: name, phone
              </span>
              <textarea
                className="min-h-28 w-full rounded-md border border-slate-300 px-3 py-2"
                name="bulk"
              />
            </label>
            <button className="rounded-md bg-slate-900 px-4 py-3 font-semibold text-white">
              Add Technicians
            </button>
          </form>
        </AdminSection>

        <AdminSection id="seed-demo" title="Seed Demo / Pilot Data">
          <form action={seedDemoAction} className="grid gap-3">
            <CompanySelect companies={companies} />
            <button
              className="rounded-md bg-teal-700 px-4 py-3 font-semibold text-white"
              id="seed_demo"
            >
              Seed Demo / Pilot Data
            </button>
          </form>
        </AdminSection>

        <AdminSection id="reset-company" title="Reset Company Data">
          <form action={resetCompanyDataAction} className="grid gap-3">
            <CompanySelect companies={companies} />
            <button
              className="rounded-md bg-red-700 px-4 py-3 font-semibold text-white"
              id="reset_company"
            >
              Reset Company Data
            </button>
          </form>
        </AdminSection>
      </div>

      <section
        className="mt-5 overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm"
        id="companies-overview"
      >
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
              const companyJobs = jobs.filter(
                (job) => job.company_id === company.id,
              );
              const demoJobs = companyJobs.filter((job) => job.is_demo);

              return (
                <tr key={company.id}>
                  <td className="px-4 py-3">
                    <p className="font-semibold">{company.name}</p>
                    <p className="text-xs text-slate-500">{company.email}</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{company.id}</td>
                  <td className="px-4 py-3">{company.close_status}</td>
                  <td className="px-4 py-3">{companyJobs.length}</td>
                  <td className="px-4 py-3">
                    {techs.filter((tech) => tech.company_id === company.id).length}
                  </td>
                  <td className="px-4 py-3">
                    {demoJobs.length ? "demo/test" : "real"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </main>
  );
}
