/**
 * Behavior coverage for job creation and listing (issue #58) -- note this
 * covers src/app/api/jobs/route.ts (GET list / POST create), distinct
 * from the already-tested src/app/api/jobs/[id]/route.ts (single-job
 * PATCH). Role auth, zod validation, conditional technician-assignment
 * side effects, and the GET list's status/demo filters.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

type Row = Record<string, unknown>;

const requireApiRoleMock = vi.fn();
const queueTechnicianAssignmentSmsMock = vi.fn();
const queueCustomerStatusSmsMock = vi.fn();
const createSupabaseAdminClientMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  requireApiRole: requireApiRoleMock,
}));

vi.mock("@/lib/jobNotifications", () => ({
  queueTechnicianAssignmentSms: queueTechnicianAssignmentSmsMock,
  queueCustomerStatusSms: queueCustomerStatusSmsMock,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => createSupabaseAdminClientMock(),
}));

function matchesFilters(row: Row, filters: [string, unknown, unknown?][]) {
  return filters.every(([column, op, value]) => {
    if (op === "eq") return row[column] === value;
    if (op === "not_in") return !(value as unknown[]).includes(row[column]);
    return true;
  });
}

function makeSelectBuilder(getRows: () => Row[]) {
  const filters: [string, unknown, unknown?][] = [];
  const builder = {
    eq(column: string, value: unknown) {
      filters.push([column, "eq", value]);
      return builder;
    },
    not(column: string, _op: string, value: string) {
      // value arrives as a Postgrest literal like '("completed","cancelled")'
      const list = value.replace(/[()"]/g, "").split(",");
      filters.push([column, "not_in", list]);
      return builder;
    },
    order() {
      return builder;
    },
    then(resolve: (value: { data: Row[]; error: null }) => void) {
      resolve({ data: getRows().filter((r) => matchesFilters(r, filters)), error: null });
    },
  };
  return builder;
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

function makeUpdateBuilder(getRows: () => Row[], patch: Row) {
  const filters: [string, unknown, unknown?][] = [];
  const builder = {
    eq(column: string, value: unknown) {
      filters.push([column, "eq", value]);
      return builder;
    },
    maybeSingle: async () => {
      const row = getRows().find((r) => matchesFilters(r, filters));
      if (row) Object.assign(row, patch);
      return { data: row ?? null, error: null };
    },
    then(resolve: (value: { data: null; error: null }) => void) {
      const row = getRows().find((r) => matchesFilters(r, filters));
      if (row) Object.assign(row, patch);
      resolve({ data: null, error: null });
    },
  };
  return builder;
}

function makeReadBuilder(getRows: () => Row[]) {
  const filters: [string, unknown, unknown?][] = [];
  const builder = {
    eq(column: string, value: unknown) {
      filters.push([column, "eq", value]);
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

type Db = { jobs: Row[]; technicians: Row[]; customers: Row[]; companies: Row[]; status_events: Row[] };

// The route never scopes its technicians/customers select by company_id
// itself -- in production, technicians is protected by RLS ("company users
// can read/update technicians", supabase/schema.sql); customers is a plain
// column with no FK constraint at all (jobs.customer_id was added without
// `references public.customers(id)`, per
// supabase/migrations/202505010001_job_timestamp_columns.sql), so nothing
// but the route's own company-scoped lookup protects it (issue #64). This
// fake models RLS's effect on technicians by pre-filtering to the acting
// company before the rest of the query chain applies, and models customers
// identically for symmetry with the app-level check #64 adds -- either way,
// a cross-tenant id resolves to "not found" here exactly as the real system
// (RLS or app code) would produce.
function createFakeSupabase(db: Db, actingCompanyId: string) {
  return {
    from(table: string) {
      if (table === "jobs") {
        return {
          select: () => makeSelectBuilder(() => db.jobs),
          insert: (row: Row) => makeInsertBuilder(() => db.jobs, row),
        };
      }
      if (table === "technicians") {
        const rlsVisible = () => db.technicians.filter((t) => t.company_id === actingCompanyId);
        return {
          select: () => makeReadBuilder(rlsVisible),
          update: (patch: Row) => makeUpdateBuilder(rlsVisible, patch),
        };
      }
      if (table === "customers") {
        const companyScoped = () => db.customers.filter((c) => c.company_id === actingCompanyId);
        return {
          select: () => makeReadBuilder(companyScoped),
        };
      }
      if (table === "companies") {
        return { select: () => makeReadBuilder(() => db.companies) };
      }
      // status_events has no INSERT RLS policy for the authenticated role
      // (issue #66) -- the route must write it through the admin client
      // (see createFakeAdminSupabase below), never this session-scoped one.
      // Deliberately no handler here, so a regression back to the session
      // client throws instead of silently "working" in the test.
      throw new Error(`Unexpected table in test double: ${table}`);
    },
  };
}

function createFakeAdminSupabase(db: Db) {
  return {
    from(table: string) {
      if (table === "status_events") {
        return {
          insert: async (row: Row) => {
            db.status_events.push(row);
            return { error: null };
          },
        };
      }
      throw new Error(`Unexpected table in admin test double: ${table}`);
    },
  };
}

const COMPANY_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_COMPANY_ID = "55555555-5555-4555-8555-555555555555";
const TECH_ID = "44444444-4444-4444-8444-444444444444";
const OTHER_TECH_ID = "88888888-8888-4888-8888-888888888888";
const OTHER_CUSTOMER_ID = "99999999-9999-4999-8999-999999999999";
const DISPATCHER_ID = "66666666-6666-4666-8666-666666666666";

function freshDb(): Db {
  return {
    jobs: [
      { id: "job-existing-active", company_id: COMPANY_ID, status: "assigned", is_demo: false },
      { id: "job-existing-completed", company_id: COMPANY_ID, status: "completed", is_demo: false },
      { id: "job-existing-demo", company_id: COMPANY_ID, status: "new", is_demo: true },
      { id: "job-other-company", company_id: OTHER_COMPANY_ID, status: "assigned", is_demo: false },
    ],
    technicians: [
      { id: TECH_ID, company_id: COMPANY_ID, name: "Grace Hopper", phone: "+15550000003", availability_status: "available", current_job_id: null },
      { id: OTHER_TECH_ID, company_id: OTHER_COMPANY_ID, name: "Ada Byron", phone: "+15550000004", availability_status: "available", current_job_id: null },
    ],
    customers: [{ id: OTHER_CUSTOMER_ID, company_id: OTHER_COMPANY_ID, name: "Marie Curie", phone: "+15550000005" }],
    companies: [{ id: COMPANY_ID, name: "Acme HVAC", sms_sender_name: "Acme" }],
    status_events: [],
  };
}

function requireApiRoleAs(db: Db, role: string, companyId: string = COMPANY_ID) {
  requireApiRoleMock.mockResolvedValue({
    profile: { id: DISPATCHER_ID, email: "dispatcher@example.com", company_id: companyId, role },
    response: null,
    supabase: createFakeSupabase(db, companyId),
  });
}

const validJobInput = {
  customer_name: "Ada Lovelace",
  phone: "+15550000002",
  address: "1 Signal Way",
  issue: "AC not cooling",
};

async function createJob(body: Record<string, unknown>) {
  const { POST } = await import("./route");
  return POST(
    new Request("http://localhost/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

async function listJobs() {
  const { GET } = await import("./route");
  return GET();
}

describe("POST /api/jobs", () => {
  let db: Db;

  beforeEach(() => {
    db = freshDb();
    requireApiRoleMock.mockReset();
    queueTechnicianAssignmentSmsMock.mockReset();
    queueCustomerStatusSmsMock.mockReset();
    createSupabaseAdminClientMock.mockReset();
    createSupabaseAdminClientMock.mockImplementation(() => createFakeAdminSupabase(db));
    requireApiRoleAs(db, "dispatcher");
  });

  it("creates a job without a technician (status new, no SMS side effects)", async () => {
    const response = await createJob(validJobInput);

    expect(response.status).toBe(200);
    const body = (await response.json()) as { job: Row };
    expect(body.job.status).toBe("new");
    expect(body.job.technician_id).toBeNull();
    expect(queueTechnicianAssignmentSmsMock).not.toHaveBeenCalled();
    expect(queueCustomerStatusSmsMock).not.toHaveBeenCalled();
  });

  it("records the job-creation status event through the admin client, not the session client (issue #66)", async () => {
    const response = await createJob(validJobInput);
    const body = (await response.json()) as { job: Row };

    expect(response.status).toBe(200);
    expect(db.status_events).toHaveLength(1);
    expect(db.status_events[0]).toMatchObject({
      job_id: body.job.id,
      from_status: null,
      to_status: "new",
      actor_id: DISPATCHER_ID,
      actor_role: "dispatcher",
      note: "Job created via manual",
    });
  });

  it("still creates the job when the admin-client status event insert fails (non-fatal)", async () => {
    createSupabaseAdminClientMock.mockImplementation(() => ({
      from: () => ({ insert: async () => ({ error: { message: "status_events insert failed" } }) }),
    }));

    const response = await createJob(validJobInput);

    expect(response.status).toBe(200);
    const body = (await response.json()) as { job: Row };
    expect(body.job.status).toBe("new");
  });

  it("creates a job with a technician (status assigned, availability updated, both SMS functions called)", async () => {
    const response = await createJob({ ...validJobInput, technician_id: TECH_ID });

    expect(response.status).toBe(200);
    const body = (await response.json()) as { job: Row };
    expect(body.job.status).toBe("assigned");
    expect(db.technicians[0].availability_status).toBe("on_job");
    expect(db.technicians[0].current_job_id).toBe(body.job.id);
    expect(queueTechnicianAssignmentSmsMock).toHaveBeenCalledTimes(1);
    expect(queueCustomerStatusSmsMock).toHaveBeenCalledTimes(1);
  });

  it("rejects assigning a technician belonging to a different company, and creates no job at all", async () => {
    const jobCountBefore = db.jobs.length;

    const response = await createJob({ ...validJobInput, technician_id: OTHER_TECH_ID });

    expect(response.status).toBe(404);
    // No job was created carrying the foreign technician_id -- jobs.technician_id
    // is a plain FK with no (technician_id, company_id) tenant constraint, and the
    // jobs insert RLS policy only checks the job's OWN company_id, so nothing at
    // the DB layer would have stopped an insert here without an app-level check.
    expect(db.jobs).toHaveLength(jobCountBefore);
    expect(db.technicians.find((t) => t.id === OTHER_TECH_ID)).toMatchObject({
      availability_status: "available",
      current_job_id: null,
    });
    expect(queueTechnicianAssignmentSmsMock).not.toHaveBeenCalled();
    expect(queueCustomerStatusSmsMock).not.toHaveBeenCalled();
  });

  it("rejects assigning a customer belonging to a different company, and creates no job at all", async () => {
    const jobCountBefore = db.jobs.length;

    const response = await createJob({ ...validJobInput, customer_id: OTHER_CUSTOMER_ID });

    expect(response.status).toBe(404);
    // jobs.customer_id has no FK constraint at all (added as a bare uuid
    // column, see supabase/migrations/202505010001_job_timestamp_columns.sql),
    // so unlike technician_id there's no RLS-on-the-referenced-table backstop
    // either -- only this route's own check stands between a client-supplied
    // id and a cross-tenant reference landing on the job.
    expect(db.jobs).toHaveLength(jobCountBefore);
  });

  it("rejects a validation failure", async () => {
    const response = await createJob({ ...validJobInput, phone: "" });

    expect(response.status).toBe(400);
    const body = (await response.json()) as { fields?: Record<string, unknown> };
    expect(body.fields).toHaveProperty("phone");
  });

  it("denies a role outside dispatcher/admin", async () => {
    requireApiRoleMock.mockResolvedValue({
      profile: null,
      response: new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 }),
      supabase: null,
    });

    const response = await createJob(validJobInput);

    expect(response.status).toBe(403);
  });
});

describe("GET /api/jobs", () => {
  let db: Db;

  beforeEach(() => {
    db = freshDb();
    requireApiRoleMock.mockReset();
    requireApiRoleAs(db, "dispatcher");
  });

  it("returns only company-scoped, non-demo, non-terminal jobs", async () => {
    const response = await listJobs();

    expect(response.status).toBe(200);
    const body = (await response.json()) as { jobs: Row[] };
    const ids = body.jobs.map((j) => j.id);
    // job-other-company proves the company_id filter is actually doing
    // something, not just the demo/status filters (which alone wouldn't
    // exclude it -- it's neither demo nor terminal).
    expect(ids).toEqual(["job-existing-active"]);
    expect(ids).not.toContain("job-other-company");
  });

  it("includes demo jobs for a sandbox tenant (whose jobs are all is_demo=true)", async () => {
    db.companies[0].slug = "swiftdispatch-preview";
    const response = await listJobs();

    expect(response.status).toBe(200);
    const body = (await response.json()) as { jobs: Row[] };
    const ids = body.jobs.map((j) => j.id).sort();
    expect(ids).toEqual(["job-existing-active", "job-existing-demo"]);
    expect(ids).not.toContain("job-other-company");
  });
});
