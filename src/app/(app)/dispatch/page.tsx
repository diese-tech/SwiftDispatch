import { redirect } from "next/navigation";
import KanbanBoard from "@/components/KanbanBoard";
import TechRail from "@/components/TechRail";
import TechPhoneModal from "@/components/TechPhoneModal";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isDemoCompany } from "@/lib/demo";
import { demoTechnicians } from "@/lib/demo-data";
import type { JobWithTechnician, Technician } from "@/types/db";

const TERMINAL_STATUSES = ["completed", "cancelled", "no_access"];

/**
 * Pick a single stable technician to surface in the demo "tech view" modal.
 * Resilient to how the tenant was seeded — never depends on an exact name.
 */
function pickDemoTech(techs: Technician[], jobs: JobWithTechnician[]): Technician | null {
  if (techs.length === 0) return null;
  // 1. The tech the seed pinned an active job to.
  const withCurrent = techs.find((t) => t.current_job_id);
  if (withCurrent) return withCurrent;
  // 2. Any tech currently assigned to a non-terminal job.
  const activeJob = jobs.find(
    (j) => j.technician_id && !TERMINAL_STATUSES.includes(j.status),
  );
  if (activeJob) {
    const assigned = techs.find((t) => t.id === activeJob.technician_id);
    if (assigned) return assigned;
  }
  // 3. The canonical demo tech name, if present.
  const byName = techs.find((t) => t.name === demoTechnicians[0]?.name);
  if (byName) return byName;
  // 4. Fall back to the first technician.
  return techs[0];
}

export default async function DispatchPage({ searchParams }: { searchParams: Promise<{ impersonate?: string }> }) {
  const profile = await getCurrentProfile();
  const { impersonate } = await searchParams;

  let companyId: string;
  let impersonating = false;

  if (profile.role === "super_admin" && impersonate) {
    companyId = impersonate;
    impersonating = true;
  } else if (profile.role === "super_admin") {
    redirect("/superadmin");
  } else {
    if (!profile.company_id) redirect("/login");
    companyId = profile.company_id;
  }

  const supabase = impersonating ? createSupabaseAdminClient() : await createSupabaseServerClient();
  const [{ data: jobs }, { data: technicians }, companyRes, { data: failedSms }] = await Promise.all([
    supabase.from("jobs").select("*, technicians!jobs_technician_id_fkey(id,name,phone)").eq("company_id", companyId).order("created_at", { ascending: false }),
    supabase.from("technicians").select("id,name,phone,availability_status,current_job_id").eq("company_id", companyId),
    supabase.from("companies").select("name,slug,demo_mode_enabled").eq("id", companyId).single(),
    supabase.from("sms_outbox").select("job_id").eq("company_id", companyId).eq("status", "failed"),
  ]);

  const allJobs = (jobs ?? []) as JobWithTechnician[];
  const techList = (technicians ?? []) as Technician[];
  const companyData = (companyRes as { data: { name: string; slug: string | null; demo_mode_enabled: boolean } | null }).data;
  const companyName = companyData?.name ?? companyId;
  const isDemo = !impersonating && isDemoCompany(companyData);
  const smsFailedJobIds = (failedSms ?? []).map((r: { job_id: string | null }) => r.job_id).filter(Boolean) as string[];
  const activeCount = allJobs.filter((j) => !["completed", "cancelled"].includes(j.status)).length;

  // For the demo tech phone modal — pick a stable tech (resilient to seeding).
  const demoTech = isDemo ? pickDemoTech(techList, allJobs) : null;

  return (
    <div className="pb-4">
      {/* Page header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-slate-400">
            {impersonating ? `Platform view · ${companyName}` : "Dispatch workspace"}
          </p>
          <h1 className="mt-0.5 text-2xl font-semibold tracking-tight text-slate-950">
            Dispatch Board
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-[11px] text-slate-500">
            {activeCount} active
          </span>
          <span className="rounded border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-[11px] text-slate-500">
            {techList.length} techs
          </span>
          {impersonating ? (
            <a
              className="inline-flex items-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              href="/superadmin"
            >
              Back to platform
            </a>
          ) : (
            <a
              className="inline-flex items-center rounded-full bg-orange-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-orange-300"
              href="/dispatch/jobs/new"
            >
              + New Job
            </a>
          )}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_260px]">
        <KanbanBoard companyId={companyId} initialJobs={allJobs} readOnly={impersonating} smsFailedJobIds={smsFailedJobIds} technicians={techList} />
        {!impersonating && <TechRail companyId={companyId} initialTechnicians={techList} />}
      </div>

      {demoTech && (
        <TechPhoneModal
          demoTechId={demoTech.id}
          demoTechName={demoTech.name}
          companyId={companyId}
        />
      )}
    </div>
  );
}
