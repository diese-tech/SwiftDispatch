import KanbanBoard from "@/components/KanbanBoard";
import SalesBadges from "@/components/SalesBadges";
import { getCurrentProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { JobWithTechnician, Technician } from "@/types/db";

export default async function DashboardPage() {
  const profile = await getCurrentProfile();
  const supabase = await createSupabaseServerClient();

  const [jobsResult, techsResult] = await Promise.all([
    supabase
      .from("jobs")
      .select("*, technicians(id,name,phone)")
      .eq("company_id", profile.company_id)
      .eq("is_demo", false)
      .order("created_at", { ascending: false }),
    supabase
      .from("technicians")
      .select("*")
      .eq("company_id", profile.company_id)
      .order("name"),
  ]);

  if (jobsResult.error) throw new Error(jobsResult.error.message);
  if (techsResult.error) throw new Error(techsResult.error.message);

  return (
    <main className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
            SwiftDispatch
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Dispatch Board
          </h1>
        </div>
      </div>
      <div className="mb-4">
        <SalesBadges />
      </div>
      <KanbanBoard
        initialJobs={(jobsResult.data ?? []) as JobWithTechnician[]}
        technicians={(techsResult.data ?? []) as Technician[]}
      />
    </main>
  );
}
