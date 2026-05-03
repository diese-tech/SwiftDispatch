import Link from "next/link";
import { redirect } from "next/navigation";
import { AppPageIntro, SurfaceCard } from "@/components/DesignSystem";
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

const fieldClass = "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100";

export default async function NewCompanyPage() {
  await requireSuperAdminProfile();

  return (
    <main>
      <AppPageIntro
        eyebrow="Platform onboarding"
        title="Create a new company without leaving the platform shell."
        description="Start a company record for onboarding, demos, or live operations and route immediately into the company detail view."
        actions={<Link className="inline-flex items-center rounded-full border border-white/14 bg-white/8 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/12" href="/superadmin">Back to platform</Link>}
      />

      <SurfaceCard accent className="mx-auto max-w-3xl">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Create company</h2>
        <p className="mt-2 text-sm leading-7 text-slate-500">Basic company identity first. Operational setup continues on the company detail page.</p>
        <form action={createCompany} className="mt-6 grid gap-4">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Company name *</span>
            <input className={fieldClass} name="name" required />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Slug (for intake form URL)</span>
            <input className={fieldClass} name="slug" placeholder="e.g. cool-air-hvac" />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Email</span>
            <input className={fieldClass} name="email" type="email" />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Phone</span>
            <input className={fieldClass} name="phone" type="tel" />
          </label>
          <button className="mt-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800" type="submit">Create company</button>
        </form>
      </SurfaceCard>
    </main>
  );
}