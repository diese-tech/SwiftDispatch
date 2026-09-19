/**
 * Shared client mutation contract (issue #50): every caller gets the same
 * four outcomes -- success, non-2xx, rejected fetch (transport failure),
 * and a 2xx response that doesn't contain what the caller needs -- without
 * hand-rolling try/catch + response.ok + json().catch() themselves.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchMutation } from "@/lib/apiMutation";

function jsonResponse(body: unknown, init?: { ok?: boolean; status?: number }) {
  return {
    ok: init?.ok ?? true,
    status: init?.status ?? 200,
    json: async () => body,
  } as Response;
}

type Job = { id: string; status: string };
const extractJob = (body: unknown): Job | undefined =>
  body && typeof body === "object" && "job" in body ? (body as { job: Job }).job : undefined;

describe("fetchMutation", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("resolves ok with the extracted data on success", async () => {
    const job = { id: "job-1", status: "assigned" };
    vi.mocked(global.fetch).mockResolvedValue(jsonResponse({ job }));

    const result = await fetchMutation("/api/jobs/job-1", { method: "PATCH" }, extractJob);

    expect(result).toEqual({ ok: true, data: job });
  });

  it("returns kind 'http' with the server's error message on a non-2xx response", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      jsonResponse({ error: "Invalid transition" }, { ok: false, status: 409 }),
    );

    const result = await fetchMutation("/api/jobs/job-1", { method: "PATCH" }, extractJob);

    expect(result).toEqual({ ok: false, kind: "http", message: "Invalid transition", status: 409 });
  });

  it("falls back to a generic message when a non-2xx response has no error field", async () => {
    vi.mocked(global.fetch).mockResolvedValue(jsonResponse({}, { ok: false, status: 500 }));

    const result = await fetchMutation("/api/jobs/job-1", { method: "PATCH" }, extractJob);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.kind).toBe("http");
      expect(result.message).toBeTruthy();
    }
  });

  it("resolves to kind 'network' instead of rejecting when fetch() itself fails", async () => {
    vi.mocked(global.fetch).mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(fetchMutation("/api/jobs/job-1", { method: "PATCH" }, extractJob)).resolves.toEqual({
      ok: false,
      kind: "network",
      message: expect.any(String),
    });
  });

  it("resolves to kind 'invalid_response' when a 2xx body doesn't contain what the caller needs", async () => {
    vi.mocked(global.fetch).mockResolvedValue(jsonResponse({ unexpected: true }));

    const result = await fetchMutation("/api/jobs/job-1", { method: "PATCH" }, extractJob);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.kind).toBe("invalid_response");
  });

  it("resolves to kind 'invalid_response' when the body isn't valid JSON at all", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError("Unexpected token");
      },
    } as unknown as Response);

    const result = await fetchMutation("/api/jobs/job-1", { method: "PATCH" }, extractJob);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.kind).toBe("invalid_response");
  });
});
