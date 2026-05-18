import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSuperAdminProfile } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { addTechnicianToCompanyAction, createAdminForCompanyAction, createDispatcherForCompanyAction, suspendCompanyAction, unsuspendCompanyAction } from "./actions";

const fieldClass = "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-[#1f6feb] focus:ring-2 focus:ring-[#eaf2ff]";

function Field({ label, name, type = "text", required = false }: { label: string; name: string; type?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
      <input className={fieldClass} name={name} required={required} type={type} />
    </label>
  );
}

function statusBadgeCls(s: string | null) {
  if (s === "available") return "border-green-200 bg-green-50 text-green-700";
  if (s === "on_job") return "border-orange-200 bg-orange-50 text-orange-700";
  return "border-slate-200 bg-slate-50 text-slate-500";
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
      {/* Page header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-slate-400">Company detail</p>
          <div className="mt-0.5 flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950">{company.name}</h1>
            <span className={`rounded border px-2 py-0.5 font-mono text-[10.5px] uppercase tracking-[0.06em] ${company.suspended ? "border-red-200 bg-red-50 text-red-700" : "border-teal-200 bg-teal-50 text-teal-700"}`}>
              {company.suspended ? "Suspended" : "Active"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            className="inline-flex items-center rounded-full bg-orange-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-orange-300"
            href={`/dispatch?impersonate=${company.id}`}
          >
            View dispatch
          </a>
          <Link
            className="inline-flex items-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            href="/superadmin"
          >
            Back to platform
          </Link>
        </div>
      </div>

      {/* Suspension banner */}
      {company.suspended && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-medium text-red-800">
          This company is suspended. Dispatchers cannot access the platform.
        </div>
      )}

      {/* Metrics strip */}
      <div className="mb-5 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 xl:grid-cols-4">
        {[{ label: "Total jobs", value: jobs.length }, { label: "Active jobs", value: activeJobs.length }, { label: "Completed", value: completedJobs.length }, { label: "Technicians", value: techs.length }].map(({ label, value }) => (
          <div key={label} className="bg-white px-5 py-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-slate-400">{label}</p>
            <p className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-950">{value}</p>
          </div>
        ))}
      </div>

      {/* Suspend / unsuspend */}
      <div className="mb-5 flex flex-wrap gap-3">
        {company.suspended ? (
          <form action={unsuspendCompanyAction}>
            <input name="company_id" type="hidden" value={company.id} />
            <button className="rounded-full border border-teal-200 bg-teal-50 px-5 py-2.5 text-sm font-semibold text-teal-800 transition hover:bg-teal-100" type="submit">Unsuspend company</button>
          </form>
        ) : (
          <form action={suspendCompanyAction}>
            <input name="company_id" type="hidden" value={company.id} />
            <button className="rounded-full border border-red-200 bg-red-50 px-5 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-100" type="submit">Suspend company</button>
          </form>
        )}
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        {/* Users */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="border-b border-slate-100 px-6 py-4">
            <h2 className="text-lg font-semibold tracking-tight text-slate-950">Users</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {users.length === 0 ? (
              <p className="px-6 py-4 text-sm text-slate-500">No users yet.</p>
            ) : users.map((u) => (
              <div className="flex items-center justify-between px-6 py-3" key={u.id}>
                <p className="text-sm font-medium text-slate-900">{u.email}</p>
                <span className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[10.5px] uppercase tracking-[0.06em] text-slate-500">{u.role}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Technicians */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="border-b border-slate-100 px-6 py-4">
            <h2 className="text-lg font-semibold tracking-tight text-slate-950">Technicians</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {techs.length === 0 ? (
              <p className="px-6 py-4 text-sm text-slate-500">No technicians yet.</p>
            ) : techs.map((t) => (
              <div className="flex items-center justify-between px-6 py-3" key={t.id}>
                <div>
                  <p className="text-sm font-medium text-slate-900">{t.name}</p>
                  <p className="text-xs text-slate-500">{t.phone ?? "—"}</p>
                </div>
                <span className={`rounded border px-2 py-0.5 font-mono text-[10.5px] uppercase tracking-[0.06em] ${statusBadgeCls(t.availability_status)}`}>
                  {t.availability_status ?? "offline"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Create admin */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <h2 className="text-lg font-semibold tracking-tight text-slate-950">Create company admin</h2>
          <p className="mt-1 text-sm text-slate-500">Give the company an owner account to configure settings and invite dispatchers.</p>
          <form action={createAdminForCompanyAction} className="mt-4 grid gap-3">
            <input name="company_id" type="hidden" value={company.id} />
            <Field label="Email" name="email" required type="email" />
            <Field label="Password" name="password" required type="password" />
            <button className="rounded-full bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800" type="submit">Create admin</button>
          </form>
        </div>

        {/* Add dispatcher */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <h2 className="text-lg font-semibold tracking-tight text-slate-950">Add dispatcher</h2>
          <form action={createDispatcherForCompanyAction} className="mt-4 grid gap-3">
            <input name="company_id" type="hidden" value={company.id} />
            <Field label="Email" name="email" required type="email" />
            <Field label="Password" name="password" required type="password" />
            <button className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800" type="submit">Create dispatcher</button>
          </form>
        </div>

        {/* Add technician */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <h2 className="text-lg font-semibold tracking-tight text-slate-950">Add technician</h2>
          <form action={addTechnicianToCompanyAction} className="mt-4 grid gap-3">
            <input name="company_id" type="hidden" value={company.id} />
            <Field label="Name" name="name" required />
            <Field label="Phone" name="phone" required />
            <button className="rounded-full bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800" type="submit">Add technician</button>
          </form>
        </div>
      </div>

      {/* Recent jobs */}
      <div className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-semibold tracking-tight text-slate-950">Recent jobs</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[500px] text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50">
              <tr>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-[0.06em] text-slate-400">Customer</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-[0.06em] text-slate-400">Status</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-[0.06em] text-slate-400">Urgency</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-[0.06em] text-slate-400">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {jobs.length === 0 ? (
                <tr><td className="px-5 py-4 text-sm text-slate-500" colSpan={4}>No jobs yet.</td></tr>
              ) : jobs.map((job) => (
                <tr key={job.id}>
                  <td className="px-5 py-3 font-medium text-slate-900">{job.customer_name}</td>
                  <td className="px-5 py-3 font-mono text-xs text-slate-600">{job.status}</td>
                  <td className="px-5 py-3 text-slate-600">{job.urgency ?? "—"}</td>
                  <td className="px-5 py-3 text-xs text-slate-500">{new Date(job.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
