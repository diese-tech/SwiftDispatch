/**
 * Behavior coverage for technician field actions via SMS token link
 * (issue #58): token verification, per-job rate limiting, state-machine
 * guarded transitions, and technician-availability/customer-SMS side
 * effects. Responses are HTML, not JSON -- asserted via status + a text
 * fragment, matching what the route actually returns.
 */
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { generateTechToken } from "@/lib/techToken";

beforeAll(() => {
  process.env.TECH_TOKEN_SECRET = "test-secret-for-vitest-only";
});

type Row = Record<string, unknown>;

const checkRateLimitMock = vi.fn();
const queueCustomerStatusSmsMock = vi.fn();
const createSupabaseAdminClientMock = vi.fn();

vi.mock("@/lib/rateLimit", () => ({
  checkRateLimit: checkRateLimitMock,
}));

vi.mock("@/lib/jobNotifications", () => ({
  queueCustomerStatusSms: queueCustomerStatusSmsMock,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => createSupabaseAdminClientMock(),
}));

function matchesFilters(row: Row, filters: [string, unknown][]) {
  return filters.every(([column, value]) => row[column] === value);
}

function makeSelectBuilder(getRows: () => Row[]) {
  const filters: [string, unknown][] = [];
  const builder = {
    eq(column: string, value: unknown) {
      filters.push([column, value]);
      return builder;
    },
    single: async () => {
      const row = getRows().find((r) => matchesFilters(r, filters));
      return row ? { data: row, error: null } : { data: null, error: { message: "Row not found" } };
    },
    maybeSingle: async () => {
      const row = getRows().find((r) => matchesFilters(r, filters));
      return { data: row ?? null, error: null };
    },
  };
  return builder;
}

function makeUpdateBuilder(getRows: () => Row[], patch: Row) {
  const filters: [string, unknown][] = [];
  const builder = {
    eq(column: string, value: unknown) {
      filters.push([column, value]);
      return builder;
    },
    then(resolve: (value: { data: null; error: null }) => void) {
      const row = getRows().find((r) => matchesFilters(r, filters));
      if (row) Object.assign(row, patch);
      resolve({ data: null, error: null });
    },
  };
  return builder;
}

type Db = { jobs: Row[]; technicians: Row[]; companies: Row[]; status_events: Row[] };

function createFakeSupabase(db: Db) {
  return {
    from(table: string) {
      if (table === "jobs") {
        return {
          select: () => makeSelectBuilder(() => db.jobs),
          update: (patch: Row) => makeUpdateBuilder(() => db.jobs, patch),
        };
      }
      if (table === "technicians") {
        return {
          select: () => makeSelectBuilder(() => db.technicians),
          update: (patch: Row) => makeUpdateBuilder(() => db.technicians, patch),
        };
      }
      if (table === "companies") {
        return { select: () => makeSelectBuilder(() => db.companies) };
      }
      if (table === "status_events") {
        return {
          insert: async (row: Row) => {
            db.status_events.push(row);
            return { error: null };
          },
        };
      }
      throw new Error(`Unexpected table in test double: ${table}`);
    },
  };
}

const COMPANY_ID = "11111111-1111-4111-8111-111111111111";
const JOB_ID = "33333333-3333-4333-8333-333333333333";
const TECH_ID = "44444444-4444-4444-8444-444444444444";

function freshDb(): Db {
  return {
    jobs: [
      {
        id: JOB_ID,
        status: "assigned",
        technician_id: TECH_ID,
        company_id: COMPANY_ID,
        customer_name: "Ada Lovelace",
        phone: "+15550000002",
        sms_consent_type: "intake_form",
      },
    ],
    technicians: [{ id: TECH_ID, company_id: COMPANY_ID, name: "Grace Hopper", availability_status: "available", current_job_id: null }],
    companies: [{ id: COMPANY_ID, name: "Acme HVAC", sms_sender_name: "Acme" }],
    status_events: [],
  };
}

async function techAction(token?: string) {
  const { GET } = await import("./route");
  const url = token
    ? `http://localhost/api/tech-action?token=${encodeURIComponent(token)}`
    : "http://localhost/api/tech-action";
  const { NextRequest } = await import("next/server");
  return GET(new NextRequest(url));
}

describe("GET /api/tech-action", () => {
  let db: Db;

  beforeEach(() => {
    db = freshDb();
    checkRateLimitMock.mockReset();
    queueCustomerStatusSmsMock.mockReset();
    createSupabaseAdminClientMock.mockReset();
    checkRateLimitMock.mockResolvedValue(true);
    createSupabaseAdminClientMock.mockImplementation(() => createFakeSupabase(db));
  });

  it("applies a valid en_route transition, updates timestamps and technician availability, and notifies the customer", async () => {
    const token = generateTechToken({ jobId: JOB_ID, action: "en_route" });

    const response = await techAction(token);

    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain("En Route");
    expect(db.jobs[0].status).toBe("en_route");
    expect(db.jobs[0].en_route_at).toBeTruthy();
    expect(db.technicians[0].availability_status).toBe("on_job");
    expect(db.technicians[0].current_job_id).toBe(JOB_ID);
    expect(db.status_events).toHaveLength(1);
    expect(queueCustomerStatusSmsMock).toHaveBeenCalledTimes(1);
  });

  it("rejects an invalid transition (job already past that state)", async () => {
    // quote_pending only allows completed/in_progress -- en_route is unreachable from here.
    db.jobs[0].status = "quote_pending";
    const token = generateTechToken({ jobId: JOB_ID, action: "en_route" });

    const response = await techAction(token);

    expect(response.status).toBe(409);
    const html = await response.text();
    expect(html).toContain("Already Updated");
    expect(db.jobs[0].status).toBe("quote_pending");
  });

  it("rejects a missing token", async () => {
    const response = await techAction();

    expect(response.status).toBe(400);
  });

  it("rejects a tampered/invalid token", async () => {
    const response = await techAction("not-a-real-token");

    expect(response.status).toBe(400);
  });

  it("rejects an expired token with a distinct message", async () => {
    const jwt = (await import("jsonwebtoken")).default;
    const expiredToken = jwt.sign({ jobId: JOB_ID, action: "en_route" }, process.env.TECH_TOKEN_SECRET!, {
      expiresIn: -1,
    });

    const response = await techAction(expiredToken);

    expect(response.status).toBe(401);
    const html = await response.text();
    expect(html).toContain("Link Expired");
  });

  it("rejects a token whose action isn't one of the three known actions", async () => {
    // verifyTechToken() itself whitelists en_route/arrived/complete, so an
    // out-of-range action is rejected as an invalid token before it ever
    // reaches the ACTION_TO_TRANSITION lookup -- craft the JWT directly to
    // bypass generateTechToken()'s TechAction type constraint.
    const jwt = (await import("jsonwebtoken")).default;
    const token = jwt.sign({ jobId: JOB_ID, action: "teleport" }, process.env.TECH_TOKEN_SECRET!, {
      expiresIn: "24h",
    });

    const response = await techAction(token);

    expect(response.status).toBe(400);
    const html = await response.text();
    expect(html).toContain("Invalid Link");
    expect(db.jobs[0].status).toBe("assigned");
  });

  it("rejects when the per-job rate limit is exceeded", async () => {
    checkRateLimitMock.mockResolvedValue(false);
    const token = generateTechToken({ jobId: JOB_ID, action: "en_route" });

    const response = await techAction(token);

    expect(response.status).toBe(429);
    expect(db.jobs[0].status).toBe("assigned");
  });
});
