import KanbanBoard from "@/components/KanbanBoard";
import SalesBadges from "@/components/SalesBadges";
import { getCurrentProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { JobWithTechnician, Technician } from "@/types/db";

export default async function DashboardPage() {
  const profile = await getCurrentProfile();
  const supabase = await createSupabaseServerClient();
  const [jobsResult, techsResult] = await Promise.all([
    supabase.from("jobs").select("*, technicians!jobs_technician_id_fkey(id,name,phone)").eq("company_id", profile.company_id).eq("is_demo", false).order("created_at", { ascending: false }),
    supabase.from("technicians").select("*").eq("company_id", profile.company_id).order("name"),
  ]);

  if (jobsResult.error) throw new Error(jobsResult.error.message);
  if (techsResult.error) throw new Error(techsResult.error.message);

  return (
    <main>
      <div className="mb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-slate-400">Operator dashboard</p>
        <h1 className="mt-0.5 text-2xl font-semibold tracking-tight text-slate-950">Dispatch Board</h1>
      </div>
      <div className="mb-6"><SalesBadges /></div>
      <KanbanBoard companyId={profile.company_id!} initialJobs={(jobsResult.data ?? []) as JobWithTechnician[]} technicians={(techsResult.data ?? []) as Technician[]} />
    </main>
  );
}
