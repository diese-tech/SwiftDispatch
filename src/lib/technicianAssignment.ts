import { fetchMutation } from "@/lib/apiMutation";
import type { JobWithTechnician } from "@/types/db";

export type AssignTechnicianOutcome =
  | { ok: true; job: JobWithTechnician }
  | { ok: false; error: string };

function extractJob(body: unknown): JobWithTechnician | undefined {
  return body && typeof body === "object" && "job" in body
    ? (body as { job: JobWithTechnician }).job
    : undefined;
}

/**
 * Calls the real dispatcher mutation API and resolves to the canonical
 * server job on success, or an error the caller can use to roll back
 * optimistic UI. Extracted as a pure function so the response-handling
 * behavior is unit-testable without a DOM/component test harness.
 *
 * Built on the shared fetchMutation() contract (issue #50) -- the
 * transport-failure handling this function introduced for #45/PR #48 is
 * now the shared default rather than a one-off.
 */
export async function assignTechnician(
  jobId: string,
  technicianId: string | null,
): Promise<AssignTechnicianOutcome> {
  const result = await fetchMutation(
    `/api/jobs/${jobId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        technician_id: technicianId,
        status: technicianId ? "assigned" : undefined,
      }),
    },
    extractJob,
  );

  if (!result.ok) return { ok: false, error: result.message };
  return { ok: true, job: result.data };
}
