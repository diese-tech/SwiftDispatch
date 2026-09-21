import { isCompanySandboxDemo } from "@/lib/demo";
import type { createSupabaseServerClient } from "@/lib/supabase/server";
import type { JobStatus } from "@/lib/stateMachine";

// Mirrors dispatch/page.tsx's own TERMINAL_STATUSES -- a job in one of
// these is no longer active work for whichever technician was on it.
const TERMINAL_STATUSES: JobStatus[] = ["completed", "cancelled", "no_access"];

// supabase/migrations/202505010001_job_timestamp_columns.sql's check
// constraint still permits the pre-migration capitalized spellings
// ('New', 'Assigned', 'En Route', 'Completed' -- see LegacyJobStatus in
// src/types/db.ts), so a legacy-terminal row must be excluded at the query
// level too, not just via the client-side LEGACY_STATUS_MAP normalization
// KanbanBoard/TechPhoneModal apply for display. Only 'Completed' has a
// legacy terminal counterpart; the constraint has no legacy spelling for
// cancelled/no_access.
const TERMINAL_STATUS_FILTER = '("completed","cancelled","no_access","Completed")';

type SupabaseLike = Awaited<ReturnType<typeof createSupabaseServerClient>>;

/**
 * Release a technician from a job that just reached a terminal status --
 * or, if they hold another active (nonterminal) assignment, promote it
 * instead of reporting them available while real work remains assigned to
 * them. SwiftDispatch allows one technician to hold multiple simultaneous
 * nonterminal jobs (the demo seed does this deliberately, and nothing in
 * the assignment API prevents it for real tenants either), while
 * `technicians.current_job_id` tracks only one of them at a time.
 *
 * Shared by every path that can complete/cancel/no-access a job on a
 * technician's behalf: PATCH /api/jobs/[id] (status-only completion, e.g.
 * the real technician "Complete" button or a dispatcher's kanban drag) and
 * POST /api/quotes/[id]/accept (quote acceptance completes the job
 * directly, bypassing PATCH /api/jobs/[id] entirely). Both used to release
 * unconditionally; extracted here after finding the same gap in both
 * places rather than fixing it twice (issue #75).
 *
 * Scoped by `.eq('current_job_id', completedJobId)` at write time so a
 * pointer that moved concurrently (reassignment mid-request) is never
 * clobbered -- callers must not call this before their own job write has
 * already succeeded, or a rejected job update could still release a
 * technician whose job was never actually completed.
 *
 * The "next active job" candidate is also is_demo-scoped: for an ordinary
 * (non-sandbox) company, load-test/live-QA rows (is_demo=true, seeded by
 * scripts/load-tech-actions.mjs etc.) are otherwise-invisible to operators
 * -- promoting one of those as a real technician's current_job_id would
 * point the tech rail at a job no dispatcher can see.
 */
export async function reconcileTechnicianAfterTerminalJob(
  supabase: SupabaseLike,
  params: { technicianId: string; companyId: string; completedJobId: string },
): Promise<void> {
  const { technicianId, companyId, completedJobId } = params;
  const isSandbox = await isCompanySandboxDemo(supabase, companyId);

  let nextActiveJobQuery = supabase
    .from("jobs")
    .select("id")
    .eq("technician_id", technicianId)
    .eq("company_id", companyId)
    .not("status", "in", TERMINAL_STATUS_FILTER)
    .neq("id", completedJobId);
  if (!isSandbox) nextActiveJobQuery = nextActiveJobQuery.eq("is_demo", false);

  const { data: nextActiveJob } = await nextActiveJobQuery
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  await supabase
    .from("technicians")
    .update(
      nextActiveJob
        ? { availability_status: "on_job", current_job_id: nextActiveJob.id }
        : { availability_status: "available", current_job_id: null },
    )
    .eq("id", technicianId)
    .eq("current_job_id", completedJobId);
}

export { TERMINAL_STATUSES };
