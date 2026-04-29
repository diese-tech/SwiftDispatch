import KanbanBoard from "@/components/KanbanBoard";
import CloseStatusSelect from "@/components/CloseStatusSelect";
import DemoModeToggle from "@/components/DemoModeToggle";
import SalesBadges from "@/components/SalesBadges";
import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CloseStatus, JobWithTechnician, Technician } from "@/types/db";

export default async function DashboardPage() {
  const profile = await getCurrentProfile();
  const supabase = await createSupabaseServerClient();

  const [jobsResult, techsResult, companyResult] = await Promise.all([
    supabase
      .from("jobs")
      .select("*, technicians(id,name,phone)")
      .eq("company_id", profile.company_id)
      .order("created_at", { ascending: false }),
    supabase
      .from("technicians")
      .select("*")
      .eq("company_id", profile.company_id)
      .order("name"),
    supabase
      .from("companies")
      .select("close_status,demo_mode_enabled")
      .eq("id", profile.company_id)
      .single(),
  ]);

  if (jobsResult.error) throw new Error(jobsResult.error.message);
  if (techsResult.error) throw new Error(techsResult.error.message);
  if (companyResult.error) throw new Error(companyResult.error.message);

  const company = companyResult.data as {
    close_status: CloseStatus;
    demo_mode_enabled: boolean;
  };

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
            SwiftDispatch
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Dispatch Board
          </h1>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <CloseStatusSelect initialStatus={company.close_status} />
          <DemoModeToggle enabled={company.demo_mode_enabled} />
          <Link
            className="rounded-md border border-slate-300 bg-white px-4 py-3 text-center text-base font-semibold"
            href="/roi"
          >
            ROI
          </Link>
          <Link
            className="rounded-md border border-slate-300 bg-white px-4 py-3 text-center text-base font-semibold"
            href="/analytics"
          >
            Analytics
          </Link>
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
