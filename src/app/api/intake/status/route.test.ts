/**
 * Behavior coverage for the public job-status lookup (issue #62): token
 * verification, dual (IP + token) rate limiting, status-event timing
 * projection, the quote_pending quote-token issuance branch, and the
 * technicians-join array/object defensive unwrap.
 */
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import jwt from "jsonwebtoken";

beforeAll(() => {
  process.env.TECH_TOKEN_SECRET = "test-secret-for-vitest-only";
});

type Row = Record<string, unknown>;

const checkRateLimitMock = vi.fn();
const generateQuoteApprovalTokenMock = vi.fn();
const createSupabaseAdminClientMock = vi.fn();

vi.mock("@/lib/rateLimit", () => ({
  checkRateLimit: checkRateLimitMock,
}));

vi.mock("@/lib/quoteTokens", () => ({
  generateQuoteApprovalToken: generateQuoteApprovalTokenMock,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => createSupabaseAdminClientMock(),
}));

const JOB_ID = "33333333-3333-4333-8333-333333333333";
const QUOTE_ID = "77777777-7777-4777-8777-777777777777";

function makeJobsBuilder(job: Row | null) {
  const builder = {
    eq: () => builder,
    single: async () => (job ? { data: job, error: null } : { data: null, error: { message: "no rows" } }),
  };
  return builder;
}

function makeStatusEventsBuilder(events: Row[]) {
  const builder = {
    eq: () => builder,
    order: async () => ({ data: events, error: null }),
  };
  return builder;
}

function makeQuotesBuilder(quote: Row | null) {
  const builder = {
    eq: () => builder,
    order: () => builder,
    limit: () => builder,
    single: async () => (quote ? { data: quote, error: null } : { data: null, error: { message: "no rows" } }),
  };
  return builder;
}

function createFakeSupabase(opts: { job: Row | null; events?: Row[]; quote?: Row | null }) {
  return {
    from(table: string) {
      if (table === "jobs") return { select: () => makeJobsBuilder(opts.job) };
      if (table === "status_events") return { select: () => makeStatusEventsBuilder(opts.events ?? []) };
      if (table === "quotes") return { select: () => makeQuotesBuilder(opts.quote ?? null) };
      throw new Error(`Unexpected table in test double: ${table}`);
    },
  };
}

function tokenFor(jobId: string) {
  return jwt.sign({ jobId }, process.env.TECH_TOKEN_SECRET!);
}

async function getStatus(token?: string) {
  const { GET } = await import("./route");
  const url = token
    ? `http://localhost/api/intake/status?token=${encodeURIComponent(token)}`
    : "http://localhost/api/intake/status";
  return GET(new Request(url));
}

describe("GET /api/intake/status", () => {
  beforeEach(() => {
    checkRateLimitMock.mockReset();
    generateQuoteApprovalTokenMock.mockReset();
    createSupabaseAdminClientMock.mockReset();
    checkRateLimitMock.mockResolvedValue(true);
    generateQuoteApprovalTokenMock.mockReturnValue("signed-quote-token");
  });

  it("rejects a missing token", async () => {
    const response = await getStatus();

    expect(response.status).toBe(400);
  });

  it("rejects when the per-IP rate limit is exceeded", async () => {
    checkRateLimitMock.mockImplementation(async (key: string) => !key.startsWith("intake-status:ip:"));

    const response = await getStatus(tokenFor(JOB_ID));

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBeTruthy();
  });

  it("rejects when the per-token rate limit is exceeded, independently of the IP key", async () => {
    checkRateLimitMock.mockImplementation(async (key: string) => !key.startsWith("intake-status:token:"));

    const response = await getStatus(tokenFor(JOB_ID));

    expect(response.status).toBe(429);
  });

  it("rejects an invalid/expired token", async () => {
    const expired = jwt.sign({ jobId: JOB_ID }, process.env.TECH_TOKEN_SECRET!, { expiresIn: -1 });

    const response = await getStatus(expired);

    expect(response.status).toBe(401);
  });

  it("returns 404 when the job can't be found", async () => {
    createSupabaseAdminClientMock.mockReturnValue(createFakeSupabase({ job: null }));

    const response = await getStatus(tokenFor(JOB_ID));

    expect(response.status).toBe(404);
  });

  it("projects status-event timing and unwraps a single-object technicians join", async () => {
    createSupabaseAdminClientMock.mockReturnValue(
      createFakeSupabase({
        job: {
          id: JOB_ID,
          status: "en_route",
          urgency: "same_day",
          customer_name: "Ada Lovelace",
          address: "1 Signal Way",
          created_at: "2026-01-01T00:00:00.000Z",
          technician_id: "tech-1",
          companies: { name: "Acme HVAC", phone: "+15550000000", email: "hello@acme.test" },
          technicians: { name: "Grace Hopper" },
        },
        events: [
          { to_status: "en_route", created_at: "2026-01-01T01:00:00.000Z" },
        ],
      }),
    );

    const response = await getStatus(tokenFor(JOB_ID));
    const body = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(body.status).toBe("en_route");
    expect(body.enRouteAt).toBe("2026-01-01T01:00:00.000Z");
    expect(body.completedAt).toBeNull();
    expect(body.techName).toBe("Grace Hopper");
    expect(body.quoteToken).toBeNull();
    expect(body.jobRef).toBe(JOB_ID.slice(0, 8).toUpperCase());
  });

  it("unwraps an array-shaped technicians join the same way", async () => {
    createSupabaseAdminClientMock.mockReturnValue(
      createFakeSupabase({
        job: {
          id: JOB_ID,
          status: "new",
          urgency: "flex",
          customer_name: "Ada Lovelace",
          address: "1 Signal Way",
          created_at: "2026-01-01T00:00:00.000Z",
          technician_id: null,
          companies: { name: "Acme HVAC" },
          technicians: [{ name: "Grace Hopper" }],
        },
        events: [],
      }),
    );

    const response = await getStatus(tokenFor(JOB_ID));
    const body = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(body.techName).toBe("Grace Hopper");
  });

  it("issues a quote approval token when the job is quote_pending with a sent quote", async () => {
    createSupabaseAdminClientMock.mockReturnValue(
      createFakeSupabase({
        job: {
          id: JOB_ID,
          status: "quote_pending",
          urgency: "flex",
          customer_name: "Ada Lovelace",
          address: "1 Signal Way",
          created_at: "2026-01-01T00:00:00.000Z",
          technician_id: null,
          companies: { name: "Acme HVAC" },
          technicians: null,
        },
        events: [],
        quote: { id: QUOTE_ID },
      }),
    );

    const response = await getStatus(tokenFor(JOB_ID));
    const body = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(body.quoteToken).toBe("signed-quote-token");
    expect(generateQuoteApprovalTokenMock).toHaveBeenCalledWith(QUOTE_ID);
  });
});
