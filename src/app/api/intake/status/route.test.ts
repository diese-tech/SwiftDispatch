/**
 * Behavior coverage for the public job-status lookup (issue #62): token
 * verification, dual (IP + token) rate limiting, status-event timing
 * projection, the quote_pending quote-token issuance branch, and the
 * technicians-join array/object defensive unwrap.
 *
 * This route uses the admin client, so RLS provides no boundary here -- the
 * signed token's `jobId` is the only thing standing between a caller and
 * another job's status. The `jobs`/`status_events`/`quotes` fakes below
 * filter by the `.eq()` predicates they're given (not a canned response),
 * with two distinct job fixtures, so a token for job A cannot read job B's
 * data in these tests -- proving the route's own `.eq('id', jobId)` (and
 * downstream `job_id` filters) are what enforce that, not the mock
 * (per PR #68 review).
 */
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import jwt from "jsonwebtoken";

beforeAll(() => {
  process.env.TECH_TOKEN_SECRET = "test-secret-for-vitest-only";
});

type Row = Record<string, unknown>;
type Predicate = (row: Row) => boolean;

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
const OTHER_JOB_ID = "22222222-2222-4222-8222-222222222222";
const QUOTE_ID = "77777777-7777-4777-8777-777777777777";

function makeFilteredBuilder(getRows: () => Row[], extra: Record<string, unknown> = {}) {
  const predicates: Predicate[] = [];
  const builder = {
    eq(column: string, value: unknown) {
      predicates.push((row) => row[column] === value);
      return builder;
    },
    order: () => builder,
    limit: () => builder,
    single: async () => {
      const row = getRows().find((r) => predicates.every((p) => p(r)));
      return row ? { data: row, error: null } : { data: null, error: { message: "no rows" } };
    },
    ...extra,
  };
  return builder;
}

function makeStatusEventsBuilder(getEvents: () => Row[]) {
  const predicates: Predicate[] = [];
  const builder = {
    eq(column: string, value: unknown) {
      predicates.push((row) => row[column] === value);
      return builder;
    },
    order: async () => ({ data: getEvents().filter((r) => predicates.every((p) => p(r))), error: null }),
  };
  return builder;
}

function createFakeSupabase(opts: { jobs: Row[]; events?: Row[]; quotes?: Row[] }) {
  return {
    from(table: string) {
      if (table === "jobs") return { select: () => makeFilteredBuilder(() => opts.jobs) };
      if (table === "status_events") return { select: () => makeStatusEventsBuilder(() => opts.events ?? []) };
      if (table === "quotes") return { select: () => makeFilteredBuilder(() => opts.quotes ?? []) };
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
    createSupabaseAdminClientMock.mockReturnValue(createFakeSupabase({ jobs: [] }));

    const response = await getStatus(tokenFor(JOB_ID));

    expect(response.status).toBe(404);
  });

  it("projects status-event timing and unwraps a single-object technicians join", async () => {
    createSupabaseAdminClientMock.mockReturnValue(
      createFakeSupabase({
        jobs: [
          {
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
        ],
        events: [{ job_id: JOB_ID, to_status: "en_route", created_at: "2026-01-01T01:00:00.000Z" }],
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
        jobs: [
          {
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
        ],
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
        jobs: [
          {
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
        ],
        events: [],
        quotes: [{ id: QUOTE_ID, job_id: JOB_ID, status: "sent" }],
      }),
    );

    const response = await getStatus(tokenFor(JOB_ID));
    const body = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(body.quoteToken).toBe("signed-quote-token");
    expect(generateQuoteApprovalTokenMock).toHaveBeenCalledWith(QUOTE_ID);
  });

  it("a token for one job cannot retrieve a different job's status, even when both jobs exist", async () => {
    createSupabaseAdminClientMock.mockReturnValue(
      createFakeSupabase({
        jobs: [
          {
            id: JOB_ID,
            status: "en_route",
            urgency: "same_day",
            customer_name: "Ada Lovelace",
            address: "1 Signal Way",
            created_at: "2026-01-01T00:00:00.000Z",
            technician_id: null,
            companies: { name: "Acme HVAC" },
            technicians: null,
          },
          {
            id: OTHER_JOB_ID,
            status: "completed",
            urgency: "flex",
            customer_name: "Grace Hopper",
            address: "2 Compiler Ave",
            created_at: "2026-01-02T00:00:00.000Z",
            technician_id: null,
            companies: { name: "Acme HVAC" },
            technicians: null,
          },
        ],
        events: [],
      }),
    );

    const responseForJobA = await getStatus(tokenFor(JOB_ID));
    const bodyForJobA = (await responseForJobA.json()) as Record<string, unknown>;

    expect(responseForJobA.status).toBe(200);
    expect(bodyForJobA.jobId).toBe(JOB_ID);
    expect(bodyForJobA.customerName).toBe("Ada Lovelace");
    expect(bodyForJobA.status).not.toBe("completed");

    // Reciprocal check: OTHER_JOB_ID is second in the fixture array, so if
    // the route's .eq('id', jobId) were ever dropped, a naive "just return
    // a row" fake would still satisfy the assertions above (JOB_ID happens
    // to be first) while silently returning the wrong job here.
    const responseForJobB = await getStatus(tokenFor(OTHER_JOB_ID));
    const bodyForJobB = (await responseForJobB.json()) as Record<string, unknown>;

    expect(responseForJobB.status).toBe(200);
    expect(bodyForJobB.jobId).toBe(OTHER_JOB_ID);
    expect(bodyForJobB.customerName).toBe("Grace Hopper");
    expect(bodyForJobB.status).toBe("completed");
  });

  it("scopes status_events and the quote lookup to the token's own job, not another job's rows", async () => {
    createSupabaseAdminClientMock.mockReturnValue(
      createFakeSupabase({
        jobs: [
          {
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
        ],
        // en_route event and sent quote both belong to OTHER_JOB_ID --
        // must not leak into JOB_ID's response.
        events: [{ job_id: OTHER_JOB_ID, to_status: "en_route", created_at: "2026-01-01T01:00:00.000Z" }],
        quotes: [{ id: "other-job-quote", job_id: OTHER_JOB_ID, status: "sent" }],
      }),
    );

    const response = await getStatus(tokenFor(JOB_ID));
    const body = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(body.enRouteAt).toBeNull();
    expect(body.quoteToken).toBeNull();
    expect(generateQuoteApprovalTokenMock).not.toHaveBeenCalled();
  });
});
