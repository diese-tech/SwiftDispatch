import Link from "next/link";
import { redirect } from "next/navigation";
import { AppPageIntro, MetricTile, StatusPill } from "@/components/DesignSystem";
import KanbanBoard from "@/components/KanbanBoard";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
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
  const [{ data: jobs }, { data: technicians }, companyRes] = await Promise.all([
    supabase.from("jobs").select("*, technicians(id,name,phone)").eq("company_id", companyId).not("status", "in", '("completed","cancelled")').order("created_at", { ascending: false }),
    supabase.from("technicians").select("id,name,phone").eq("company_id", companyId),
    impersonating ? supabase.from("companies").select("name").eq("id", companyId).single() : Promise.resolve({ data: null }),
  ]);

  const activeJobs = (jobs ?? []) as JobWithTechnician[];
  const techList = (technicians ?? []) as Technician[];
  const companyName = (companyRes as { data: { name: string } | null }).data?.name ?? companyId;

  return (
    <div className="pb-4">
      <AppPageIntro
        eyebrow="Dispatch workspace"
        title="Dispatch Board"
        description={impersonating ? `Viewing ${companyName} in read-only platform context.` : "Coordinate the live board, assign technicians fast, and keep the office and field moving from one view."}
        actions={
          <>
            {impersonating ? <StatusPill tone="warm">Platform view</StatusPill> : null}
            {!impersonating ? (
              <a className="inline-flex items-center rounded-full bg-orange-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-orange-300" href="/dispatch/jobs/new">+ New Job</a>
            ) : (
              <Link className="inline-flex items-center rounded-full border border-white/14 bg-white/8 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/12" href="/superadmin">Back to platform</Link>
            )}
          </>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <MetricTile label="Active jobs" value={activeJobs.length} detail="Everything currently visible on the board" />
        <MetricTile label="Technicians" value={techList.length} detail="Available crew records in this workspace" />
        <MetricTile label="Context" value={impersonating ? companyName : "Live company"} detail={impersonating ? "Platform-side read-only view" : "Direct operational view"} />
      </div>

      <KanbanBoard initialJobs={activeJobs} technicians={techList} />
    </div>
  );
}