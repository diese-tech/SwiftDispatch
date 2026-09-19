import type { JobWithTechnician } from "@/types/db";

export type AssignTechnicianOutcome =
  | { ok: true; job: JobWithTechnician }
  | { ok: false; error: string };

/**
 * Calls the real dispatcher mutation API and resolves to the canonical
 * server job on success, or an error the caller can use to roll back
 * optimistic UI. Extracted as a pure function so the response-handling
 * behavior is unit-testable without a DOM/component test harness.
 */
export async function assignTechnician(
  jobId: string,
  technicianId: string | null,
): Promise<AssignTechnicianOutcome> {
  let response: Response;
  try {
    response = await fetch(`/api/jobs/${jobId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        technician_id: technicianId,
        status: technicianId ? "assigned" : undefined,
      }),
    });
  } catch {
    // Network failure / aborted request: the request never reached the
    // server, so there's no canonical state to trust. Surface this as an
    // ordinary failure outcome (rather than a rejected promise) so callers
    // can roll back optimistic UI instead of silently leaving it stale.
    return { ok: false, error: "Couldn't reach the server. Check your connection and try again." };
  }

  const data = (await response.json().catch(() => ({}))) as {
    job?: JobWithTechnician;
    error?: string;
  };

  if (!response.ok || !data.job) {
    return { ok: false, error: data.error ?? "Couldn't update technician. Please try again." };
  }

  return { ok: true, job: data.job };
}
