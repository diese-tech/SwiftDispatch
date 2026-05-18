import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSuperAdminProfile } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

async function createCompany(formData: FormData) {
  "use server";
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const slug = String(formData.get("slug") ?? "").trim() || null;
  if (!name) return;
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("companies").insert({ name, email, phone, slug }).select("id").single();
  if (error || !data) throw new Error(error?.message ?? "Failed to create company");
  redirect(`/superadmin/companies/${data.id}`);
}

const fieldClass = "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-[#1f6feb] focus:ring-2 focus:ring-[#eaf2ff]";

export default async function NewCompanyPage() {
  await requireSuperAdminProfile();

  return (
    <main>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-slate-400">Platform onboarding</p>
          <h1 className="mt-0.5 text-2xl font-semibold tracking-tight text-slate-950">Create company</h1>
        </div>
        <Link
          className="inline-flex items-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          href="/superadmin"
        >
          Back to platform
        </Link>
      </div>

      <div className="mx-auto max-w-3xl">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <p className="text-sm text-slate-500">Basic company identity first. Operational setup continues on the company detail page.</p>
          <form action={createCompany} className="mt-5 grid gap-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Company name *</span>
              <input className={fieldClass} name="name" required />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Slug (for intake form URL)</span>
              <input className={fieldClass} name="slug" placeholder="e.g. cool-air-hvac" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Email</span>
              <input className={fieldClass} name="email" type="email" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Phone</span>
              <input className={fieldClass} name="phone" type="tel" />
            </label>
            <button className="mt-2 rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800" type="submit">
              Create company
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
