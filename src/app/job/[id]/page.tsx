import Link from "next/link";
import { notFound } from "next/navigation";
import QuoteBuilder from "@/components/QuoteBuilder";
import TechnicianDropdown from "@/components/TechnicianDropdown";
import WorkflowComparison from "@/components/WorkflowComparison";
import { AppPageIntro, SurfaceCard, StatusPill } from "@/components/DesignSystem";
import { getCurrentProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { JobWithTechnician, QuoteWithLineItems, Technician } from "@/types/db";

export default async function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  const supabase = await createSupabaseServerClient();
  const [jobResult, techsResult, quoteResult] = await Promise.all([
    supabase.from("jobs").select("*, technicians(id,name,phone)").eq("id", id).eq("company_id", profile.company_id).eq("is_demo", false).single(),
    supabase.from("technicians").select("*").eq("company_id", profile.company_id).order("name"),
    supabase.from("quotes").select("id,job_id,total,status,created_at,quote_sent_at,accepted_at,rejected_at,quote_line_items(id,quote_id,name,price,quantity),jobs!inner(company_id)").eq("job_id", id).eq("jobs.company_id", profile.company_id).eq("is_demo", false).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);

  if (jobResult.error || !jobResult.data) notFound();
  if (techsResult.error) throw new Error(techsResult.error.message);
  if (quoteResult.error) throw new Error(quoteResult.error.message);

  const job = jobResult.data as JobWithTechnician;
  const quote = quoteResult.data as QuoteWithLineItems | null;

  return (
    <main>
      <AppPageIntro
        eyebrow="Job detail"
        title={job.customer_name}
        description="Review the issue, coordinate the technician, and move the quote without leaving the same operating flow."
        actions={
          <>
            <StatusPill tone="teal">{job.status}</StatusPill>
            <Link className="inline-flex items-center rounded-full border border-white/14 bg-white/8 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/12" href="/dashboard">Back to board</Link>
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_420px]">
        <SurfaceCard accent className="p-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Customer</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{job.customer_name}</h2>
            </div>
            <a className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50" href={`tel:${job.phone}`}>{job.phone}</a>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[1.4rem] bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Address</p>
              <p className="mt-2 text-sm leading-7 text-slate-700">{job.address}</p>
            </div>
            <div className="rounded-[1.4rem] bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Issue</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-700">{job.issue}</p>
            </div>
          </div>
          <div className="mt-5"><TechnicianDropdown jobId={job.id} selectedId={job.technician_id} technicians={(techsResult.data ?? []) as Technician[]} /></div>
          <WorkflowComparison />
        </SurfaceCard>
        <QuoteBuilder initialQuote={quote} jobId={job.id} />
      </div>
    </main>
  );
}