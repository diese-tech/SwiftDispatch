import Link from "next/link";
import { addTechniciansAction, createDispatcherAction } from "./actions";
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

type UserRow = { id: string; email: string; role: string };

const fieldClass = "w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-[#1f6feb] focus:ring-2 focus:ring-[#eaf2ff]";

function Field({ label, name, type = "text", required = false }: { label: string; name: string; type?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
      <input className={fieldClass} name={name} required={required} type={type} />
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

  const metrics = [
    { label: "Open jobs", value: activeJobs },
    { label: "Technicians", value: techs.length },
    { label: "Internal users", value: users.length },
    { label: "Payment mode", value: company.payment_provider },
  ];

  return (
    <main>
      {/* Page header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-slate-400">Company admin</p>
          <h1 className="mt-0.5 text-2xl font-semibold tracking-tight text-slate-950">{company.name}</h1>
        </div>
        <Link
          className="inline-flex items-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          href="/dispatch"
        >
          Dispatch board
        </Link>
      </div>

      {/* Metrics strip */}
      <div className="mb-6 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 xl:grid-cols-4">
        {metrics.map(({ label, value }) => (
          <div key={label} className="bg-white px-5 py-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-slate-400">{label}</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{value}</p>
          </div>
        ))}
      </div>

      {/* Quick nav */}
      <nav className="mb-6 grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {([["Company Settings", "/admin/settings"], ["Company Users", "/admin/users"], ["Technicians", "/admin/technicians"], ["Templates", "/admin/templates"], ["Dispatch Board", "/dispatch"]] as [string, string][]).map(([label, href]) => (
          <Link
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-center text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
            href={href}
            key={href}
          >
            {label}
          </Link>
        ))}
      </nav>

      <div className="grid gap-5 xl:grid-cols-2">
        {/* Company overview */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <h2 className="text-lg font-semibold tracking-tight text-slate-950">Company overview</h2>
          <p className="mt-1 text-sm text-slate-500">Company details scoped to your tenant.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.06em] text-slate-400">Company</p>
              <p className="mt-1.5 text-base font-semibold text-slate-900">{company.name}</p>
              <p className="mt-0.5 text-sm text-slate-500">{company.email ?? "No email set"}</p>
              <p className="text-sm text-slate-500">{company.phone ?? "No phone set"}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.06em] text-slate-400">Defaults</p>
              <p className="mt-1.5 text-sm text-slate-700">Intake slug: <span className="font-mono">{company.slug ?? "not set"}</span></p>
              <p className="mt-1 text-sm text-slate-700">Timezone: {company.timezone}</p>
              <p className="mt-1 text-sm text-slate-700">SMS sender: {company.sms_sender_name ?? "not set"}</p>
            </div>
          </div>
        </div>

        {/* Create dispatcher */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <h2 className="text-lg font-semibold tracking-tight text-slate-950">Create dispatcher</h2>
          <p className="mt-1 text-sm text-slate-500">Add an internal dispatcher for your company.</p>
          <form action={createDispatcherAction} className="mt-4 grid gap-3">
            <Field label="Email" name="email" required type="email" />
            <Field label="Password" name="password" required type="password" />
            <button className="rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">
              Create Dispatcher
            </button>
          </form>
        </div>

        {/* Add technicians */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <h2 className="text-lg font-semibold tracking-tight text-slate-950">Add technicians</h2>
          <p className="mt-1 text-sm text-slate-500">Create a single technician or bulk import field users.</p>
          <form action={addTechniciansAction} className="mt-4 grid gap-3">
            <Field label="Single technician name" name="name" />
            <Field label="Single technician phone" name="phone" />
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Bulk technicians, one per line: name, phone</span>
              <textarea className={`${fieldClass} min-h-24`} name="bulk" />
            </label>
            <button className="rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">
              Add Technicians
            </button>
          </form>
        </div>
      </div>

      {/* Company team */}
      <div className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-semibold tracking-tight text-slate-950">Company team</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Admins and dispatchers · {availableTechs} of {techs.length} techs available
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.06em] text-slate-400">Email</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.06em] text-slate-400">Role</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.06em] text-slate-400">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.length === 0 ? (
                <tr><td className="px-4 py-6 text-center text-slate-400" colSpan={3}>No internal users yet.</td></tr>
              ) : users.map((user) => (
                <tr key={user.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">{user.email}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded border px-2 py-0.5 font-mono text-[10.5px] uppercase tracking-[0.06em] ${user.role === "admin" ? "border-teal-200 bg-teal-50 text-teal-700" : "border-slate-200 bg-slate-50 text-slate-500"}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">—</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
