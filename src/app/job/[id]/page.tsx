import Link from "next/link";
import { notFound } from "next/navigation";
import QuoteBuilder from "@/components/QuoteBuilder";
import TechnicianDropdown from "@/components/TechnicianDropdown";
import WorkflowComparison from "@/components/WorkflowComparison";
import { getCurrentProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { JobWithTechnician, Technician } from "@/types/db";

export default async function JobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  const supabase = await createSupabaseServerClient();

  const [jobResult, techsResult] = await Promise.all([
    supabase
      .from("jobs")
      .select("*, technicians(id,name,phone)")
      .eq("id", id)
      .eq("company_id", profile.company_id)
      .single(),
    supabase
      .from("technicians")
      .select("*")
      .eq("company_id", profile.company_id)
      .order("name"),
  ]);

  if (jobResult.error || !jobResult.data) notFound();
  if (techsResult.error) throw new Error(techsResult.error.message);

  const job = jobResult.data as JobWithTechnician;

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-6 sm:px-6">
      <Link className="text-sm font-semibold text-teal-700" href="/dashboard">
        Back to board
      </Link>
      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_420px]">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm text-slate-500">{job.status}</p>
              <h1 className="text-3xl font-semibold">{job.customer_name}</h1>
            </div>
            <a
              className="rounded-md border border-slate-300 px-3 py-2 text-center text-sm font-semibold"
              href={`tel:${job.phone}`}
            >
              {job.phone}
            </a>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">
                Address
              </p>
              <p>{job.address}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">
                Issue
              </p>
              <p className="whitespace-pre-wrap">{job.issue}</p>
            </div>
            <div>
              <TechnicianDropdown
                jobId={job.id}
                selectedId={job.technician_id}
                technicians={(techsResult.data ?? []) as Technician[]}
              />
            </div>
          </div>
          <WorkflowComparison />
        </section>
        <QuoteBuilder jobId={job.id} />
      </div>
    </main>
  );
}
