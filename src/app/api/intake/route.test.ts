/**
 * Behavior coverage for the app's only public/unauthenticated mutation
 * surface (issue #58): dual rate limiting (IP + company slug), validation,
 * and the multi-step write (customer upsert, job + status_event insert,
 * confirmation SMS enqueue, status-token signing).
 */
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import jwt from "jsonwebtoken";

beforeAll(() => {
  process.env.TECH_TOKEN_SECRET = "test-secret-for-vitest-only";
});

type Row = Record<string, unknown>;

const checkRateLimitMock = vi.fn();
const enqueueSmsMock = vi.fn();
const createSupabaseAdminClientMock = vi.fn();

vi.mock("@/lib/rateLimit", () => ({
  checkRateLimit: checkRateLimitMock,
}));

vi.mock("@/lib/smsOutbox", () => ({
  enqueueSms: enqueueSmsMock,
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
  };
  return builder;
}

function makeUpsertBuilder(getRows: () => Row[], row: Row) {
  return {
    select() {
      return {
        single: async () => {
          const inserted = { id: `customer-${getRows().length + 1}`, ...row };
          getRows().push(inserted);
          return { data: inserted, error: null };
        },
      };
    },
  };
}

function makeInsertBuilder(getRows: () => Row[], row: Row) {
  return {
    select() {
      return {
        single: async () => {
          const inserted = { id: `job-${getRows().length + 1}`, ...row };
          getRows().push(inserted);
          return { data: inserted, error: null };
        },
      };
    },
  };
}

type Db = { companies: Row[]; customers: Row[]; jobs: Row[]; status_events: Row[] };

function createFakeSupabase(db: Db) {
  return {
    from(table: string) {
      if (table === "companies") {
        return { select: () => makeSelectBuilder(() => db.companies) };
      }
      if (table === "customers") {
        return { upsert: (row: Row) => makeUpsertBuilder(() => db.customers, row) };
      }
      if (table === "jobs") {
        return { insert: (row: Row) => makeInsertBuilder(() => db.jobs, row) };
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
const COMPANY_SLUG = "acme-hvac";

function freshDb(): Db {
  return {
    companies: [{ id: COMPANY_ID, slug: COMPANY_SLUG, name: "Acme HVAC", sms_sender_name: "Acme" }],
    customers: [],
    jobs: [],
    status_events: [],
  };
}

const validPayload = {
  name: "Ada Lovelace",
  phone: "+15550001234",
  address: "1 Signal Way",
  problemDescription: "AC not cooling",
  urgency: "same_day" as const,
  smsConsent: true as const,
  companySlug: COMPANY_SLUG,
};

async function submitIntake(body: Record<string, unknown>) {
  const { POST } = await import("./route");
  return POST(
    new Request("http://localhost/api/intake", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

describe("POST /api/intake", () => {
  let db: Db;

  beforeEach(() => {
    db = freshDb();
    checkRateLimitMock.mockReset();
    enqueueSmsMock.mockReset();
    createSupabaseAdminClientMock.mockReset();
    checkRateLimitMock.mockResolvedValue(true);
    enqueueSmsMock.mockResolvedValue(undefined);
    createSupabaseAdminClientMock.mockImplementation(() => createFakeSupabase(db));
  });

  it("creates a customer and job, enqueues confirmation SMS, and returns a decodable status token", async () => {
    const response = await submitIntake(validPayload);

    expect(response.status).toBe(200);
    const body = (await response.json()) as { jobId: string; jobRef: string; statusToken: string };
    expect(db.customers).toHaveLength(1);
    expect(db.jobs).toHaveLength(1);
    expect(db.jobs[0]).toMatchObject({ status: "new", source: "intake", company_id: COMPANY_ID });
    expect(db.status_events).toHaveLength(1);
    expect(enqueueSmsMock).toHaveBeenCalledTimes(1);

    const decoded = jwt.verify(body.statusToken, process.env.TECH_TOKEN_SECRET!) as { jobId: string };
    expect(decoded.jobId).toBe(body.jobId);
  });

  it("rejects when the per-IP rate limit is exceeded, without touching the database", async () => {
    checkRateLimitMock.mockImplementation(async (key: string) => !key.startsWith("intake:ip:"));

    const response = await submitIntake(validPayload);

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBeTruthy();
    expect(db.jobs).toHaveLength(0);
  });

  it("rejects when the per-company rate limit is exceeded, independently of the IP key", async () => {
    checkRateLimitMock.mockImplementation(async (key: string) => !key.startsWith("intake:company:"));

    const response = await submitIntake(validPayload);

    expect(response.status).toBe(429);
    expect(db.jobs).toHaveLength(0);
    // Proves both keys are actually checked, not just one.
    expect(checkRateLimitMock).toHaveBeenCalledWith(`intake:ip:unknown`, expect.any(Number), expect.any(Number));
    expect(checkRateLimitMock).toHaveBeenCalledWith(`intake:company:${COMPANY_SLUG}`, expect.any(Number), expect.any(Number));
  });

  it("rejects an unknown company slug", async () => {
    const response = await submitIntake({ ...validPayload, companySlug: "does-not-exist" });

    expect(response.status).toBe(404);
    expect(db.jobs).toHaveLength(0);
  });

  it("rejects a validation failure (missing SMS consent) with field errors", async () => {
    const response = await submitIntake({ ...validPayload, smsConsent: false });

    expect(response.status).toBe(400);
    const body = (await response.json()) as { fields?: Record<string, unknown> };
    expect(body.fields).toHaveProperty("smsConsent");
    expect(db.jobs).toHaveLength(0);
  });

  it("still creates the job when the confirmation SMS enqueue fails (non-fatal)", async () => {
    enqueueSmsMock.mockRejectedValue(new Error("outbox unavailable"));

    const response = await submitIntake(validPayload);

    expect(response.status).toBe(200);
    expect(db.jobs).toHaveLength(1);
  });
});
