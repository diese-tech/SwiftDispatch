import Link from "next/link";
import { addTechniciansAction, createDispatcherAction } from "./actions";
import { AppPageIntro, MetricTile, SurfaceCard, StatusPill } from "@/components/DesignSystem";
import { requireAdminProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type CompanyRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  slug: string | null;
  timezone: string;
  sms_sender_name: string | null;
  payment_provider: string;
};

type UserRow = {
  id: string;
  email: string;
  role: string;
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

export default async function AdminPage() {
  const profile = await requireAdminProfile();
  const supabase = await createSupabaseServerClient();
  const [companyResult, jobsResult, techsResult, usersResult] = await Promise.all([
    supabase.from("companies").select("id,name,email,phone,slug,timezone,sms_sender_name,payment_provider").eq("id", profile.company_id).single(),
    supabase.from("jobs").select("id,status").eq("company_id", profile.company_id).eq("is_demo", false).order("created_at", { ascending: false }),
    supabase.from("technicians").select("id,name,availability_status").eq("company_id", profile.company_id).order("name"),
    supabase.from("users").select("id,email,role").eq("company_id", profile.company_id).order("email"),
  ]);

  if (companyResult.error || !companyResult.data) throw new Error(companyResult.error?.message ?? "Company not found");
  if (jobsResult.error) throw new Error(jobsResult.error.message);
  if (techsResult.error) throw new Error(techsResult.error.message);
  if (usersResult.error) throw new Error(usersResult.error.message);

  const company = companyResult.data as CompanyRow;
  const jobs = jobsResult.data ?? [];
  const techs = techsResult.data ?? [];
  const users = (usersResult.data ?? []) as UserRow[];
  const activeJobs = jobs.filter((job) => !["completed", "cancelled"].includes(job.status)).length;
  const availableTechs = techs.filter((tech) => tech.availability_status === "available").length;

  return (
    <main>
      <AppPageIntro
        eyebrow="Company admin"
        title={`Run ${company.name} without leaving the operator workspace.`}
        description="Company admins stay scoped to their own tenant here: team setup, settings, templates, and dispatch-adjacent operations."
        actions={<Link className="inline-flex items-center rounded-full border border-white/14 bg-white/8 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/12" href="/dashboard">Dispatcher Portal</Link>}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile label="Open jobs" value={activeJobs} detail="Live jobs still moving through the board" />
        <MetricTile label="Technicians" value={techs.length} detail={`${availableTechs} currently available`} />
        <MetricTile label="Internal users" value={users.length} detail="Admins and dispatchers in this company" />
        <MetricTile label="Payment mode" value={company.payment_provider} detail="Current billing/invoicing posture" />
      </div>

      <nav className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {[["Company Settings", "/admin/settings"], ["Company Users", "/admin/users"], ["Technicians", "/admin/technicians"], ["Templates", "/admin/templates"], ["Dispatch Board", "/dispatch"]].map(([label, href]) => (
          <Link className="rounded-full border border-slate-200 bg-white px-4 py-3 text-center text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50" href={href} key={href}>{label}</Link>
        ))}
      </nav>

      <div className="grid gap-5 xl:grid-cols-2">
        <AdminSection id="company-overview" title="Company Overview" description="This section is scoped to your company only. Cross-company management now lives in the superadmin workspace.">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[1.4rem] bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Company</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{company.name}</p>
              <p className="mt-1 text-sm text-slate-500">{company.email ?? "No company email set"}</p>
              <p className="text-sm text-slate-500">{company.phone ?? "No company phone set"}</p>
            </div>
            <div className="rounded-[1.4rem] bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Defaults</p>
              <p className="mt-2 text-sm text-slate-700">Intake slug: <span className="font-mono">{company.slug ?? "not set"}</span></p>
              <p className="mt-1 text-sm text-slate-700">Timezone: {company.timezone}</p>
              <p className="mt-1 text-sm text-slate-700">SMS sender: {company.sms_sender_name ?? "not set"}</p>
            </div>
          </div>
        </AdminSection>

        <AdminSection id="create-dispatcher" title="Create Dispatcher User" description="Add an internal dispatcher for your company only.">
          <form action={createDispatcherAction} className="grid gap-3">
            <Field label="Email" name="email" required type="email" />
            <Field label="Password" name="password" required type="password" />
            <button className="rounded-full bg-slate-950 px-4 py-3 font-semibold text-white">Create Dispatcher</button>
          </form>
        </AdminSection>

        <AdminSection id="add-technicians" title="Add Technicians" description="Create a single technician or bulk import multiple field users at once.">
          <form action={addTechniciansAction} className="grid gap-3">
            <Field label="Single technician name" name="name" />
            <Field label="Single technician phone" name="phone" />
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Bulk technicians, one per line: name, phone</span>
              <textarea className="min-h-28 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100" name="bulk" />
            </label>
            <button className="rounded-full bg-slate-950 px-4 py-3 font-semibold text-white">Add Technicians</button>
          </form>
        </AdminSection>
      </div>

      <div className="mt-6" id="company-team">
        <SurfaceCard accent className="overflow-hidden p-0">
          <div className="border-b border-slate-200 px-6 py-5">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Company Team</h2>
            <p className="mt-2 text-sm text-slate-500">Admins and dispatchers currently attached to your company.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {users.length === 0 ? (
                  <tr><td className="px-4 py-6 text-center text-slate-400" colSpan={3}>No internal users yet.</td></tr>
                ) : users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-4 py-3 font-medium text-slate-900">{user.email}</td>
                    <td className="px-4 py-3"><StatusPill tone={user.role === "admin" ? "teal" : "neutral"}>{user.role}</StatusPill></td>
                    <td className="px-4 py-3 text-slate-500">-</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SurfaceCard>
      </div>
    </main>
  );
}
