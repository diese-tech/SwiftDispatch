import Link from "next/link";
import { notFound } from "next/navigation";
import { AppPageIntro, MetricTile, StatusPill, SurfaceCard } from "@/components/DesignSystem";
import { requireSuperAdminProfile } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { addTechnicianToCompanyAction, createAdminForCompanyAction, createDispatcherForCompanyAction, suspendCompanyAction, unsuspendCompanyAction } from "./actions";

function Field({ label, name, type = "text", required = false }: { label: string; name: string; type?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <input className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100" name={name} required={required} type={type} />
    </label>
  );
}

export default async function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSuperAdminProfile();
  const { id } = await params;
  const supabase = createSupabaseAdminClient();

  const [companyRes, jobsRes, techsRes, usersRes] = await Promise.all([
    supabase.from("companies").select("*").eq("id", id).single(),
    supabase.from("jobs").select("id,status,created_at,customer_name,urgency").eq("company_id", id).order("created_at", { ascending: false }).limit(20),
    supabase.from("technicians").select("id,name,phone,availability_status").eq("company_id", id),
    supabase.from("users").select("id,email,role,created_at").eq("company_id", id),
  ]);

  if (!companyRes.data) notFound();

  const company = companyRes.data;
  const jobs = jobsRes.data ?? [];
  const techs = techsRes.data ?? [];
  const users = usersRes.data ?? [];
  const activeJobs = jobs.filter((j) => !["completed", "cancelled"].includes(j.status));
  const completedJobs = jobs.filter((j) => j.status === "completed");

  return (
    <main>
      <AppPageIntro
        eyebrow="Company detail"
        title={company.name}
        description="Manage suspension state, team setup, and recent operational activity from one platform-level company view."
        actions={
          <>
            {company.suspended ? <StatusPill tone="danger">Suspended</StatusPill> : <StatusPill tone="teal">Active</StatusPill>}
            <Link className="inline-flex items-center rounded-full border border-white/14 bg-white/8 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/12" href="/superadmin">Back to platform</Link>
            <a className="inline-flex items-center rounded-full bg-orange-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-orange-300" href={`/dispatch?impersonate=${company.id}`}>View dispatch board</a>
          </>
        }
      />

      {company.suspended ? <div className="mb-6"><StatusPill tone="danger">This company is suspended. Dispatchers cannot access the platform.</StatusPill></div> : null}

      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <MetricTile label="Total jobs" value={jobs.length} detail="Most recent company job volume snapshot" />
        <MetricTile label="Active jobs" value={activeJobs.length} detail="Jobs not yet completed or cancelled" />
        <MetricTile label="Completed jobs" value={completedJobs.length} detail="Completed jobs in the recent sample" />
        <MetricTile label="Technicians" value={techs.length} detail="Field-team records for this company" />
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        {company.suspended ? (
          <form action={unsuspendCompanyAction}>
            <input name="company_id" type="hidden" value={company.id} />
            <button className="rounded-full border border-teal-200 bg-teal-50 px-5 py-3 text-sm font-semibold text-teal-800 transition hover:bg-teal-100" type="submit">Unsuspend company</button>
          </form>
        ) : (
          <form action={suspendCompanyAction}>
            <input name="company_id" type="hidden" value={company.id} />
            <button className="rounded-full border border-red-200 bg-red-50 px-5 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-100" type="submit">Suspend company</button>
          </form>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SurfaceCard accent className="overflow-hidden p-0">
          <div className="border-b border-slate-200 px-6 py-5">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Users</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {users.length === 0 ? <p className="px-6 py-5 text-sm text-slate-500">No users yet.</p> : users.map((u) => (
              <div className="flex items-center justify-between px-6 py-4" key={u.id}>
                <div>
                  <p className="text-sm font-medium text-slate-900">{u.email}</p>
                </div>
                <StatusPill tone="neutral">{u.role}</StatusPill>
              </div>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard accent className="overflow-hidden p-0">
          <div className="border-b border-slate-200 px-6 py-5">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Technicians</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {techs.length === 0 ? <p className="px-6 py-5 text-sm text-slate-500">No technicians yet.</p> : techs.map((t) => (
              <div className="flex items-center justify-between px-6 py-4" key={t.id}>
                <div>
                  <p className="text-sm font-medium text-slate-900">{t.name}</p>
                  <p className="text-xs text-slate-500">{t.phone ?? "-"}</p>
                </div>
                <StatusPill tone={t.availability_status === "available" ? "success" : t.availability_status === "on_job" ? "warm" : "neutral"}>{t.availability_status ?? "offline"}</StatusPill>
              </div>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard accent>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Create company admin</h2>
          <p className="mt-2 text-sm leading-7 text-slate-500">Give the company a real owner/operator account so they can configure settings, invite dispatchers, and manage templates themselves.</p>
          <form action={createAdminForCompanyAction} className="mt-5 grid gap-3">
            <input name="company_id" type="hidden" value={company.id} />
            <Field label="Email" name="email" required type="email" />
            <Field label="Password" name="password" required type="password" />
            <button className="rounded-full bg-teal-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-800" type="submit">Create admin</button>
          </form>
        </SurfaceCard>

        <SurfaceCard accent>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Add dispatcher</h2>
          <form action={createDispatcherForCompanyAction} className="mt-5 grid gap-3">
            <input name="company_id" type="hidden" value={company.id} />
            <Field label="Email" name="email" required type="email" />
            <Field label="Password" name="password" required type="password" />
            <button className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800" type="submit">Create dispatcher</button>
          </form>
        </SurfaceCard>

        <SurfaceCard accent>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Add technician</h2>
          <form action={addTechnicianToCompanyAction} className="mt-5 grid gap-3">
            <input name="company_id" type="hidden" value={company.id} />
            <Field label="Name" name="name" required />
            <Field label="Phone" name="phone" required />
            <button className="rounded-full bg-teal-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-800" type="submit">Add technician</button>
          </form>
        </SurfaceCard>
      </div>

      <div className="mt-6">
        <SurfaceCard accent className="overflow-hidden p-0">
          <div className="border-b border-slate-200 px-6 py-5">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Recent jobs</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-5 py-3 font-semibold text-slate-600">Customer</th>
                  <th className="px-5 py-3 font-semibold text-slate-600">Status</th>
                  <th className="px-5 py-3 font-semibold text-slate-600">Urgency</th>
                  <th className="px-5 py-3 font-semibold text-slate-600">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {jobs.length === 0 ? (
                  <tr><td className="px-5 py-4 text-sm text-slate-500" colSpan={4}>No jobs yet.</td></tr>
                ) : jobs.map((job) => (
                  <tr key={job.id}>
                    <td className="px-5 py-3 font-medium text-slate-900">{job.customer_name}</td>
                    <td className="px-5 py-3 text-slate-600">{job.status}</td>
                    <td className="px-5 py-3 text-slate-600">{job.urgency ?? "-"}</td>
                    <td className="px-5 py-3 text-xs text-slate-500">{new Date(job.created_at).toLocaleDateString()}</td>
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
