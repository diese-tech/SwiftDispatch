/**
 * Client consistency boundary for issue #50: KanbanBoard.confirmMove() and
 * createJob() must not leave optimistic UI stuck after a rejected fetch().
 * This tests the pure request/response logic they're built on, the same
 * seam pattern proven for technician assignment in #45/PR #48.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createJobRequest, moveJobStatus } from "@/lib/jobMutations";
import type { JobWithTechnician } from "@/types/db";

const JOB_ID = "job-1";

function jsonResponse(body: unknown, init?: { ok?: boolean; status?: number }) {
  return {
    ok: init?.ok ?? true,
    status: init?.status ?? 200,
    json: async () => body,
  } as Response;
}

describe("moveJobStatus", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("resolves with the canonical job on success", async () => {
    const job = { id: JOB_ID, status: "assigned" } as JobWithTechnician;
    vi.mocked(global.fetch).mockResolvedValue(jsonResponse({ job }));

    const result = await moveJobStatus(JOB_ID, "assigned");

    expect(global.fetch).toHaveBeenCalledWith(
      `/api/jobs/${JOB_ID}`,
      expect.objectContaining({ method: "PATCH", body: JSON.stringify({ status: "assigned" }) }),
    );
    expect(result).toEqual({ ok: true, data: job });
  });

  it("resolves to a failure -- not a rejection -- when the request is rejected by the transport", async () => {
    vi.mocked(global.fetch).mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(moveJobStatus(JOB_ID, "assigned")).resolves.toMatchObject({
      ok: false,
      kind: "network",
    });
  });

  it("surfaces the server's error message on a non-2xx response", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      jsonResponse({ error: "Invalid transition" }, { ok: false, status: 409 }),
    );

    const result = await moveJobStatus(JOB_ID, "cancelled");

    expect(result).toMatchObject({ ok: false, kind: "http", message: "Invalid transition" });
  });
});

describe("createJobRequest", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  const input = { customer_name: "Ada", phone: "555", address: "1 Way", issue: "AC" };

  it("resolves with the canonical job on success", async () => {
    const job = { id: JOB_ID, status: "new" } as JobWithTechnician;
    vi.mocked(global.fetch).mockResolvedValue(jsonResponse({ job }));

    const result = await createJobRequest(input);

    expect(result).toEqual({ ok: true, data: job });
  });

  it("resolves to a network failure instead of throwing when fetch rejects, so callers can always clear a saving flag", async () => {
    vi.mocked(global.fetch).mockRejectedValue(new TypeError("Failed to fetch"));

    const result = await createJobRequest(input);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.kind).toBe("network");
  });
});
