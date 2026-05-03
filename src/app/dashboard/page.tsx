import KanbanBoard from "@/components/KanbanBoard";
import SalesBadges from "@/components/SalesBadges";
import { AppPageIntro } from "@/components/DesignSystem";
import { getCurrentProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { JobWithTechnician, Technician } from "@/types/db";

export default async function DashboardPage() {
  const profile = await getCurrentProfile();
  const supabase = await createSupabaseServerClient();
  const [jobsResult, techsResult] = await Promise.all([
    supabase.from("jobs").select("*, technicians(id,name,phone)").eq("company_id", profile.company_id).eq("is_demo", false).order("created_at", { ascending: false }),
    supabase.from("technicians").select("*").eq("company_id", profile.company_id).order("name"),
  ]);

  if (jobsResult.error) throw new Error(jobsResult.error.message);
  if (techsResult.error) throw new Error(techsResult.error.message);

  return (
    <main>
      <AppPageIntro
        eyebrow="Operator dashboard"
        title="Command the day without losing the details."
        description="Use the dashboard as the premium operator layer over dispatch, sales movement, and field coordination."
      />
      <div className="mb-6"><SalesBadges /></div>
      <KanbanBoard initialJobs={(jobsResult.data ?? []) as JobWithTechnician[]} technicians={(techsResult.data ?? []) as Technician[]} />
    </main>
  );
}