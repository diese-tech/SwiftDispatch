/**
 * Behavior coverage for SMS outbox retry (issue #58): role auth, job
 * ownership, and the company-scoped conditional bulk update that resets
 * failed sms_outbox rows back to pending.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

type Row = Record<string, unknown>;

const requireApiRoleMock = vi.fn();
const createSupabaseAdminClientMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  requireApiRole: requireApiRoleMock,
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

function makeUpdateBuilder(getRows: () => Row[], patch: Row) {
  const filters: [string, unknown][] = [];
  const builder = {
    eq(column: string, value: unknown) {
      filters.push([column, value]);
      return builder;
    },
    select(_columns: string) {
      return {
        then(resolve: (value: { data: Row[]; error: null }) => void) {
          const matched = getRows().filter((r) => matchesFilters(r, filters));
          matched.forEach((r) => Object.assign(r, patch));
          resolve({ data: matched, error: null });
        },
      };
    },
  };
  return builder;
}

type Db = { jobs: Row[]; sms_outbox: Row[] };

function createFakeSupabase(db: Db) {
  return {
    from(table: string) {
      if (table === "jobs") {
        return { select: () => makeSelectBuilder(() => db.jobs) };
      }
      if (table === "sms_outbox") {
        return { update: (patch: Row) => makeUpdateBuilder(() => db.sms_outbox, patch) };
      }
      throw new Error(`Unexpected table in test double: ${table}`);
    },
  };
}

const COMPANY_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_COMPANY_ID = "55555555-5555-4555-8555-555555555555";
const JOB_ID = "33333333-3333-4333-8333-333333333333";
const DISPATCHER_ID = "66666666-6666-4666-8666-666666666666";

function freshDb(): Db {
  return {
    jobs: [{ id: JOB_ID, company_id: COMPANY_ID }],
    sms_outbox: [
      { id: "sms-1", job_id: JOB_ID, company_id: COMPANY_ID, status: "failed", attempt_count: 5 },
      { id: "sms-2", job_id: JOB_ID, company_id: COMPANY_ID, status: "sent", attempt_count: 1 },
      // Same job id, but a different company -- must not be touched by this company's retry.
      { id: "sms-3", job_id: JOB_ID, company_id: OTHER_COMPANY_ID, status: "failed", attempt_count: 5 },
    ],
  };
}

function requireApiRoleAs(db: Db, companyId: string) {
  requireApiRoleMock.mockResolvedValue({
    profile: { id: DISPATCHER_ID, email: "dispatcher@example.com", company_id: companyId, role: "dispatcher" },
    response: null,
    supabase: createFakeSupabase(db),
  });
}

async function retrySms(jobId = JOB_ID) {
  const { POST } = await import("./route");
  return POST(new Request(`http://localhost/api/jobs/${jobId}/retry-sms`, { method: "POST" }), {
    params: Promise.resolve({ id: jobId }),
  });
}

describe("POST /api/jobs/[id]/retry-sms", () => {
  let db: Db;

  beforeEach(() => {
    db = freshDb();
    requireApiRoleMock.mockReset();
    createSupabaseAdminClientMock.mockReset();
    requireApiRoleAs(db, COMPANY_ID);
    createSupabaseAdminClientMock.mockImplementation(() => createFakeSupabase(db));
  });

  it("resets only this job's failed outbox rows back to pending", async () => {
    const response = await retrySms();

    expect(response.status).toBe(200);
    const body = (await response.json()) as { retried: number };
    expect(body.retried).toBe(1);
    expect(db.sms_outbox.find((r) => r.id === "sms-1")).toMatchObject({ status: "pending", attempt_count: 0, locked_at: null, last_error: null });
    // The already-sent row for this job is untouched.
    expect(db.sms_outbox.find((r) => r.id === "sms-2")?.status).toBe("sent");
  });

  it("does not touch a same-job-id row belonging to a different company", async () => {
    await retrySms();

    expect(db.sms_outbox.find((r) => r.id === "sms-3")?.status).toBe("failed");
  });

  it("rejects a job that doesn't belong to this company", async () => {
    requireApiRoleAs(db, OTHER_COMPANY_ID);

    const response = await retrySms();

    expect(response.status).toBe(404);
    expect(db.sms_outbox.find((r) => r.id === "sms-1")?.status).toBe("failed");
  });
});
