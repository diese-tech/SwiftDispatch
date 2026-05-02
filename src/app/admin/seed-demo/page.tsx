import Link from "next/link";
import { notFound } from "next/navigation";
import { seedDemoAction } from "@/app/admin/actions";
import { requireAdminProfile } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export default async function SeedDemoPage() {
  // Only available when ENABLE_SEED_DEMO=true is explicitly set.
  // Never enable in production without a deliberate override.
  if (!process.env.ENABLE_SEED_DEMO) notFound();

  await requireAdminProfile();
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("companies")
    .select("id,name")
    .order("name");

  if (error) throw new Error(error.message);

  return (
    <main className="mx-auto min-h-screen max-w-xl px-4 py-6">
      <Link className="text-sm font-semibold text-teal-700" href="/admin">
        Back to admin
      </Link>
      <section className="mt-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-semibold">Seed Demo / Pilot Data</h1>
        <form action={seedDemoAction} className="mt-4 grid gap-3">
          <select
            className="rounded-md border border-slate-300 bg-white px-3 py-3"
            name="company_id"
            required
          >
            <option value="">Select company</option>
            {(data ?? []).map((company) => (
              <option key={company.id} value={company.id}>
                {company.name} - {company.id}
              </option>
            ))}
          </select>
          <button
            className="rounded-md bg-teal-700 px-4 py-3 font-semibold text-white"
            id="seed_demo"
          >
            Seed Demo
          </button>
        </form>
      </section>
    </main>
  );
}
