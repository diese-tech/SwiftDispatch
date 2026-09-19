/**
 * Client consistency boundary for issue #45: TechnicianDropdown must not
 * silently discard the mutation result. This tests the pure response-handling
 * logic it depends on -- the lightest seam available (mocked fetch, plain
 * node environment) since the repo has no component/DOM test harness and
 * this issue is scoped to not introduce one.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { assignTechnician } from "@/lib/technicianAssignment";
import type { JobWithTechnician } from "@/types/db";

const JOB_ID = "job-1";
const TECH_ID = "tech-1";

function jsonResponse(body: unknown, init?: { ok?: boolean; status?: number }) {
  return {
    ok: init?.ok ?? true,
    status: init?.status ?? 200,
    json: async () => body,
  } as Response;
}

describe("assignTechnician", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("resolves with the canonical job returned by the API on success", async () => {
    const canonicalJob = { id: JOB_ID, status: "assigned", technician_id: TECH_ID } as JobWithTechnician;
    vi.mocked(global.fetch).mockResolvedValue(jsonResponse({ job: canonicalJob }));

    const outcome = await assignTechnician(JOB_ID, TECH_ID);

    expect(global.fetch).toHaveBeenCalledWith(
      `/api/jobs/${JOB_ID}`,
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ technician_id: TECH_ID, status: "assigned" }),
      }),
    );
    expect(outcome).toEqual({ ok: true, job: canonicalJob });
  });

  it("surfaces a failure instead of pretending the assignment succeeded when response.ok is false", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      jsonResponse({ error: "Invalid transition" }, { ok: false, status: 409 }),
    );

    const outcome = await assignTechnician(JOB_ID, TECH_ID);

    expect(outcome).toEqual({ ok: false, error: "Invalid transition" });
  });

  it("treats a response without a canonical job as a failure even if status is 200", async () => {
    vi.mocked(global.fetch).mockResolvedValue(jsonResponse({}));

    const outcome = await assignTechnician(JOB_ID, TECH_ID);

    expect(outcome.ok).toBe(false);
  });
});
