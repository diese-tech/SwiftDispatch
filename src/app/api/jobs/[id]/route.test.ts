/**
 * Integration test around the real dispatcher mutation seam:
 *
 *   authenticated dispatcher -> PATCH /api/jobs/[id] -> persisted job -> repeated/no-op request
 *
 * Unlike src/e2e/job-flow.test.ts (gated behind TEST_INTEGRATION and a live
 * deployment), this calls the actual exported PATCH handler directly, mocking
 * only the auth/session lookup and the Supabase client -- the same seam
 * pattern already used by src/app/api/admin/square/callback/route.test.ts.
 * It runs under plain `npm test`, deterministically, with no network calls.
 *
 * Regression coverage for: https://github.com/diese-tech/SwiftDispatch/issues/45
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

type Row = Record<string, unknown>;

const requireApiProfileMock = vi.fn();
const queueTechnicianAssignmentSmsMock = vi.fn();
const queueCustomerStatusSmsMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  requireApiProfile: requireApiProfileMock,
}));

vi.mock("@/lib/jobNotifications", () => ({
  queueTechnicianAssignmentSms: queueTechnicianAssignmentSmsMock,
  queueCustomerStatusSms: queueCustomerStatusSmsMock,
}));

const COMPANY_ID = "11111111-1111-4111-8111-111111111111";
const JOB_ID = "22222222-2222-4222-8222-222222222222";
const TECH_ID = "33333333-3333-4333-8333-333333333333";
const DISPATCHER_ID = "44444444-4444-4444-8444-444444444444";

function matchesFilters(row: Row, filters: [string, unknown][]) {
  return filters.every(([column, value]) => row[column] === value);
}

function makeSelectBuilder(getRows: () => Row[], project: (row: Row) => Row) {
  const filters: [string, unknown][] = [];
  const builder = {
    eq(column: string, value: unknown) {
      filters.push([column, value]);
      return builder;
    },
    single: async () => {
      const row = getRows().find((r) => matchesFilters(r, filters));
      return row ? { data: project(row), error: null } : { data: null, error: { message: "Row not found" } };
    },
    maybeSingle: async () => {
      const row = getRows().find((r) => matchesFilters(r, filters));
      return { data: row ? project(row) : null, error: null };
    },
  };
  return builder;
}

function makeUpdateBuilder(getRows: () => Row[], project: (row: Row) => Row, patch: Row) {
  const filters: [string, unknown][] = [];
  function applyAndFind() {
    const row = getRows().find((r) => matchesFilters(r, filters));
    if (!row) return null;
    Object.assign(row, patch);
    return row;
  }
  const builder = {
    eq(column: string, value: unknown) {
      filters.push([column, value]);
      return builder;
    },
    select() {
      return {
        single: async () => {
          const row = applyAndFind();
          return row ? { data: project(row), error: null } : { data: null, error: { message: "Row not found" } };
        },
      };
    },
    // Supports `await supabase.from(x).update(patch).eq(...)` with no .select() chained,
    // by making the eq-chain itself thenable.
    then(resolve: (value: { data: null; error: null }) => void) {
      applyAndFind();
      resolve({ data: null, error: null });
    },
  };
  return builder;
}

type Db = {
  jobs: Row[];
  technicians: Row[];
  companies: Row[];
  statusEvents: Row[];
};

function createFakeSupabase(db: Db) {
  const joinTechnician = (job: Row) => {
    const tech = db.technicians.find((t) => t.id === job.technician_id);
    return {
      ...job,
      technicians: tech ? { id: tech.id, name: tech.name, phone: tech.phone } : null,
    };
  };

  return {
    from(table: string) {
      if (table === "jobs") {
        return {
          select: () => makeSelectBuilder(() => db.jobs, joinTechnician),
          update: (patch: Row) => makeUpdateBuilder(() => db.jobs, joinTechnician, patch),
        };
      }
      if (table === "technicians") {
        return {
          select: () => makeSelectBuilder(() => db.technicians, (r) => ({ ...r })),
          update: (patch: Row) => makeUpdateBuilder(() => db.technicians, (r) => ({ ...r }), patch),
        };
      }
      if (table === "companies") {
        return {
          select: () => makeSelectBuilder(() => db.companies, (r) => ({ ...r })),
        };
      }
      if (table === "status_events") {
        return {
          insert: async (row: Row) => {
            db.statusEvents.push(row);
            return { error: null };
          },
        };
      }
      throw new Error(`Unexpected table in test double: ${table}`);
    },
  };
}

function freshDb(): Db {
  return {
    jobs: [
      {
        id: JOB_ID,
        company_id: COMPANY_ID,
        status: "new",
        technician_id: null,
        sms_consent_type: "transactional",
        customer_name: "Ada Lovelace",
        phone: "+15550000002",
        address: "1 Signal Way",
        issue: "AC not cooling",
        assigned_at: null,
      },
    ],
    technicians: [
      {
        id: TECH_ID,
        company_id: COMPANY_ID,
        name: "Grace Hopper",
        phone: "+15550000003",
        availability_status: "available",
        current_job_id: null,
      },
    ],
    companies: [{ id: COMPANY_ID, name: "Acme HVAC", sms_sender_name: "Acme" }],
    statusEvents: [],
  };
}

async function patchJob(body: Record<string, unknown>) {
  const { PATCH } = await import("./route");
  return PATCH(
    new Request(`http://localhost/api/jobs/${JOB_ID}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id: JOB_ID }) },
  );
}

describe("PATCH /api/jobs/[id] - dispatcher assignment", () => {
  let db: Db;

  beforeEach(() => {
    db = freshDb();
    requireApiProfileMock.mockReset();
    queueTechnicianAssignmentSmsMock.mockReset();
    queueCustomerStatusSmsMock.mockReset();
    requireApiProfileMock.mockResolvedValue({
      profile: { id: DISPATCHER_ID, email: "dispatcher@example.com", company_id: COMPANY_ID, role: "dispatcher" },
      response: null,
      supabase: createFakeSupabase(db),
    });
  });

  it("assigns an available technician to a new job through the real mutation API", async () => {
    const response = await patchJob({ technician_id: TECH_ID, status: "assigned" });

    expect(response.status).toBe(200);
    const body = (await response.json()) as { job: Row };
    expect(body.job.technician_id).toBe(TECH_ID);
    expect(body.job.status).toBe("assigned");

    expect(db.jobs[0].technician_id).toBe(TECH_ID);
    expect(db.jobs[0].status).toBe("assigned");
    expect(db.jobs[0].assigned_at).toBeTruthy();

    expect(db.technicians[0].availability_status).toBe("on_job");
    expect(db.technicians[0].current_job_id).toBe(JOB_ID);
    expect(queueTechnicianAssignmentSmsMock).toHaveBeenCalledTimes(1);
  });

  it("does not surface 'No changes provided' when a follow-up request matches current server truth", async () => {
    // Card's technician dropdown assigns a technician -- server auto-transitions new -> assigned.
    const first = await patchJob({ technician_id: TECH_ID, status: "assigned" });
    expect(first.status).toBe(200);

    // Board/card was stale and still thought the job was "New", so the operator
    // repeats the move via drag/drop or "Move to" -> Assigned, which the server
    // already satisfied. This is the reported repro from issue #45.
    const repeat = await patchJob({ status: "assigned" });

    expect(repeat.status).toBe(200);
    const repeatBody = (await repeat.json()) as { job: Row; error?: string };
    expect(repeatBody.error).toBeUndefined();
    expect(repeatBody.job.status).toBe("assigned");
    expect(repeatBody.job.technician_id).toBe(TECH_ID);

    // Persisted state remains correct -- the no-op didn't corrupt anything.
    expect(db.jobs[0].status).toBe("assigned");
    expect(db.jobs[0].technician_id).toBe(TECH_ID);
  });

  it("still rejects a request that changes nothing recognizable", async () => {
    const response = await patchJob({});

    expect(response.status).toBe(400);
    const body = (await response.json()) as { error?: string };
    expect(body.error).toBe("No changes provided");
  });
});
