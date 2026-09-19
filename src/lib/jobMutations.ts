import { fetchMutation, type MutationResult } from "@/lib/apiMutation";
import type { JobStatus, JobWithTechnician } from "@/types/db";

function extractJob(body: unknown): JobWithTechnician | undefined {
  return body && typeof body === "object" && "job" in body
    ? (body as { job: JobWithTechnician }).job
    : undefined;
}

/**
 * The real dispatcher job-movement mutation (issue #50), extracted so
 * KanbanBoard's optimistic move/rollback logic can be driven by a pure,
 * unit-testable function instead of an inline unguarded fetch().
 */
export async function moveJobStatus(
  jobId: string,
  status: JobStatus,
): Promise<MutationResult<JobWithTechnician>> {
  return fetchMutation(
    `/api/jobs/${jobId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    },
    extractJob,
  );
}

export type CreateJobInput = {
  customer_name: FormDataEntryValue | null;
  phone: FormDataEntryValue | null;
  address: FormDataEntryValue | null;
  issue: FormDataEntryValue | null;
};

/**
 * The real job-creation mutation. Resolving instead of throwing on a
 * transport failure means the caller's "saving" flag can always be cleared
 * unconditionally after awaiting this, rather than only on the success/
 * HTTP-error paths.
 */
export async function createJobRequest(
  input: CreateJobInput,
): Promise<MutationResult<JobWithTechnician>> {
  return fetchMutation(
    "/api/jobs",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
    extractJob,
  );
}
