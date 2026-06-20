import { redirect } from "next/navigation";
import KanbanBoard from "@/components/KanbanBoard";
import TechRail from "@/components/TechRail";
import TechPhoneModal from "@/components/TechPhoneModal";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DEMO_COMPANY_SLUG } from "@/lib/resetDemoTenant";
import { demoTechnicians } from "@/lib/demo-data";
import type { JobWithTechnician, Technician } from "@/types/db";

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
  const isDemo = !impersonating && (companyData?.demo_mode_enabled === true || companyData?.slug === DEMO_COMPANY_SLUG);
  const smsFailedJobIds = (failedSms ?? []).map((r: { job_id: string | null }) => r.job_id).filter(Boolean) as string[];
  const activeCount = allJobs.filter((j) => !["completed", "cancelled"].includes(j.status)).length;

  // For the demo tech phone modal — find Mia Torres (first demo tech) by name
  const demoTechName = demoTechnicians[0].name;
  const demoTech = isDemo ? techList.find((t) => t.name === demoTechName) : null;

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
          demoTechName={demoTechName}
          companyId={companyId}
        />
      )}
    </div>
  );
}
