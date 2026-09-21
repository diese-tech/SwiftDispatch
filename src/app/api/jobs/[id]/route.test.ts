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

const COMPANY_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_COMPANY_ID = "55555555-5555-4555-8555-555555555555";
const JOB_ID = "22222222-2222-4222-8222-222222222222";
const TECH_ID = "33333333-3333-4333-8333-333333333333";
const OTHER_TECH_ID = "88888888-8888-4888-8888-888888888888";
const FOREIGN_TECH_ID = "99999999-9999-4999-8999-999999999999";
const DISPATCHER_ID = "44444444-4444-4444-8444-444444444444";
const TECH_AUTH_USER_ID = "66666666-6666-4666-8666-666666666666";
const OTHER_TECH_AUTH_USER_ID = "77777777-7777-4777-8777-777777777777";

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
        maybeSingle: async () => {
          const row = applyAndFind();
          return { data: row ? project(row) : null, error: null };
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
            db.statusEvents.push(row);
            return { error: null };
          },
        };
      }
      throw new Error(`Unexpected table in admin test double: ${table}`);
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
        auth_user_id: TECH_AUTH_USER_ID,
        name: "Grace Hopper",
        phone: "+15550000003",
        availability_status: "available",
        current_job_id: null,
      },
      {
        id: OTHER_TECH_ID,
        company_id: COMPANY_ID,
        auth_user_id: OTHER_TECH_AUTH_USER_ID,
        name: "Ada Byron",
        phone: "+15550000004",
        availability_status: "available",
        current_job_id: null,
      },
      {
        id: FOREIGN_TECH_ID,
        company_id: OTHER_COMPANY_ID,
        auth_user_id: "foreign-tech-auth-user",
        name: "Marie Curie",
        phone: "+15550000006",
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
    requireApiRoleMock.mockReset();
    queueTechnicianAssignmentSmsMock.mockReset();
    queueCustomerStatusSmsMock.mockReset();
    createSupabaseAdminClientMock.mockReset();
    createSupabaseAdminClientMock.mockImplementation(() => createFakeAdminSupabase(db));
    requireApiRoleMock.mockResolvedValue({
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

  it("records the status-change event through the admin client, not the session client (issue #66)", async () => {
    const response = await patchJob({ technician_id: TECH_ID, status: "assigned", note: "Assigned from board" });

    expect(response.status).toBe(200);
    expect(db.statusEvents).toHaveLength(1);
    expect(db.statusEvents[0]).toMatchObject({
      job_id: JOB_ID,
      from_status: "new",
      to_status: "assigned",
      actor_id: DISPATCHER_ID,
      actor_role: "dispatcher",
      note: "Assigned from board",
    });
  });

  it("still persists the job update when the admin-client status event insert fails (non-fatal)", async () => {
    createSupabaseAdminClientMock.mockImplementation(() => ({
      from: () => ({ insert: async () => ({ error: { message: "status_events insert failed" } }) }),
    }));

    const response = await patchJob({ technician_id: TECH_ID, status: "assigned" });

    expect(response.status).toBe(200);
    expect(db.jobs[0].status).toBe("assigned");
  });

  describe("technician status updates (issue #49)", () => {
    beforeEach(() => {
      // The job is already assigned to TECH_ID before each technician-path test.
      db.jobs[0].technician_id = TECH_ID;
      db.jobs[0].status = "assigned";
    });

    function asTechnician(authUserId: string) {
      requireApiRoleMock.mockResolvedValue({
        profile: { id: authUserId, email: "tech@example.com", company_id: COMPANY_ID, role: "technician" },
        response: null,
        supabase: createFakeSupabase(db),
      });
    }

    it("lets a technician move their own assigned job to en_route", async () => {
      asTechnician(TECH_AUTH_USER_ID);

      const response = await patchJob({ status: "en_route" });

      expect(response.status).toBe(200);
      expect(db.jobs[0].status).toBe("en_route");
    });

    it("records the technician's status-change event through the admin client too (issue #66)", async () => {
      asTechnician(TECH_AUTH_USER_ID);

      const response = await patchJob({ status: "en_route" });

      expect(response.status).toBe(200);
      expect(db.statusEvents).toHaveLength(1);
      expect(db.statusEvents[0]).toMatchObject({
        job_id: JOB_ID,
        from_status: "assigned",
        to_status: "en_route",
        actor_id: TECH_AUTH_USER_ID,
        actor_role: "technician",
      });
    });

    it("denies a technician updating a job not assigned to them", async () => {
      asTechnician(OTHER_TECH_AUTH_USER_ID);

      const response = await patchJob({ status: "en_route" });

      expect(response.status).toBe(403);
      expect(db.jobs[0].status).toBe("assigned");
    });

    it("denies a technician from reassigning the job's technician", async () => {
      asTechnician(TECH_AUTH_USER_ID);

      const response = await patchJob({ status: "en_route", technician_id: TECH_ID });

      expect(response.status).toBe(403);
      expect(db.jobs[0].status).toBe("assigned");
      expect(db.jobs[0].technician_id).toBe(TECH_ID);
    });

    it("denies a technician requesting a status outside their allowed set", async () => {
      asTechnician(TECH_AUTH_USER_ID);

      const response = await patchJob({ status: "cancelled" });

      expect(response.status).toBe(403);
      expect(db.jobs[0].status).toBe("assigned");
    });

    it("denies a technician whose ownership changed between the read and the write (TOCTOU)", async () => {
      // Simulate dispatch reassigning the job to someone else in the window
      // between this route's ownership check and its final write, by
      // patching the fake supabase's technician lookup (the ownership
      // check) to mutate the job's technician_id as a side effect of that
      // read -- exactly the race the review flagged.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const racySupabase: any = createFakeSupabase(db);
      const originalFrom = racySupabase.from.bind(racySupabase);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      racySupabase.from = (table: string): any => {
        const real = originalFrom(table);
        if (table !== "technicians") return real;
        return {
          ...real,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          select: (...args: unknown[]): any => {
            const builder = real.select(...args);
            const originalMaybeSingle = builder.maybeSingle.bind(builder);
            builder.maybeSingle = async () => {
              const result = await originalMaybeSingle();
              db.jobs[0].technician_id = OTHER_TECH_ID;
              return result;
            };
            return builder;
          },
        };
      };

      requireApiRoleMock.mockResolvedValue({
        profile: { id: TECH_AUTH_USER_ID, email: "tech@example.com", company_id: COMPANY_ID, role: "technician" },
        response: null,
        supabase: racySupabase,
      });

      const response = await patchJob({ status: "en_route" });

      expect(response.status).toBe(403);
      // The write never landed -- state reflects the concurrent reassignment,
      // not the now-former technician's status update.
      expect(db.jobs[0].status).toBe("assigned");
      expect(db.jobs[0].technician_id).toBe(OTHER_TECH_ID);
    });

    it("does not surface 'No changes provided' for a technician's repeated status update either", async () => {
      asTechnician(TECH_AUTH_USER_ID);
      const first = await patchJob({ status: "en_route" });
      expect(first.status).toBe(200);

      const repeat = await patchJob({ status: "en_route" });
      expect(repeat.status).toBe(200);
      const repeatBody = (await repeat.json()) as { job: Row; error?: string };
      expect(repeatBody.error).toBeUndefined();
    });

    it("releases the technician back to available when a status-only transition completes their job (issue #75)", async () => {
      // The real technician "Complete" button sends {status: 'completed'}
      // alone -- same shape as TECHNICIAN_ALLOWED_STATUSES enforces -- so
      // the technician_id branch never runs. Before this fix, the tech
      // stayed on_job against a now-finished job indefinitely.
      // quote_pending -> completed is the only valid transition into
      // 'completed' per VALID_TRANSITIONS.
      db.jobs[0].status = "quote_pending";
      db.technicians[0].availability_status = "on_job";
      db.technicians[0].current_job_id = JOB_ID;
      asTechnician(TECH_AUTH_USER_ID);

      const response = await patchJob({ status: "completed" });

      expect(response.status).toBe(200);
      expect(db.jobs[0].status).toBe("completed");
      expect(db.technicians[0].availability_status).toBe("available");
      expect(db.technicians[0].current_job_id).toBeNull();
    });
  });

  describe("technician release on terminal status (issue #75)", () => {
    it("releases the technician when a dispatcher status-only move (e.g. kanban drag) cancels the job", async () => {
      // KanbanBoard's moveJobStatus sends {status} alone, same as the
      // technician path above -- covers the dispatcher-driven route to the
      // same bug.
      db.jobs[0].technician_id = TECH_ID;
      db.jobs[0].status = "assigned";
      db.technicians[0].availability_status = "on_job";
      db.technicians[0].current_job_id = JOB_ID;

      const response = await patchJob({ status: "cancelled" });

      expect(response.status).toBe(200);
      expect(db.jobs[0].status).toBe("cancelled");
      expect(db.technicians[0].availability_status).toBe("available");
      expect(db.technicians[0].current_job_id).toBeNull();
    });

    it("does not touch a different technician's availability", async () => {
      db.jobs[0].technician_id = TECH_ID;
      db.jobs[0].status = "en_route";
      db.technicians[0].availability_status = "on_job";
      db.technicians[0].current_job_id = JOB_ID;
      db.technicians[1].availability_status = "on_job";
      db.technicians[1].current_job_id = "some-other-job";

      const response = await patchJob({ status: "no_access" });

      expect(response.status).toBe(200);
      expect(db.technicians[1]).toMatchObject({ availability_status: "on_job", current_job_id: "some-other-job" });
    });

    it("does not release a technician whose current_job_id points to a different active assignment (Codex review, PR #76)", async () => {
      // The demo seed (and the real assignment API) let one technician hold
      // multiple simultaneous nonterminal jobs. current_job_id tracks only
      // ONE of them -- cancelling a job that isn't the one it currently
      // points to must not clear that other, still-active assignment.
      db.jobs[0].technician_id = TECH_ID;
      db.jobs[0].status = "assigned";
      db.technicians[0].availability_status = "on_job";
      db.technicians[0].current_job_id = "some-other-active-job";

      const response = await patchJob({ status: "cancelled" });

      expect(response.status).toBe(200);
      expect(db.jobs[0].status).toBe("cancelled");
      expect(db.technicians[0]).toMatchObject({
        availability_status: "on_job",
        current_job_id: "some-other-active-job",
      });
    });

    it("does not release the technician if the job write itself is rejected (Codex review, PR #76)", async () => {
      // TOCTOU: a technician's ownership changed between this route's read
      // and its write (simulated the same way the existing TOCTOU test
      // above does, by mutating technician_id as a side effect of the
      // ownership-check read). The job update then matches zero rows and
      // 403s -- the technician must not have already been released before
      // that write was known to fail.
      db.jobs[0].technician_id = TECH_ID;
      db.jobs[0].status = "quote_pending";
      db.technicians[0].availability_status = "on_job";
      db.technicians[0].current_job_id = JOB_ID;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const racySupabase: any = createFakeSupabase(db);
      const originalFrom = racySupabase.from.bind(racySupabase);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      racySupabase.from = (table: string): any => {
        const real = originalFrom(table);
        if (table !== "technicians") return real;
        return {
          ...real,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          select: (...args: unknown[]): any => {
            const builder = real.select(...args);
            const originalMaybeSingle = builder.maybeSingle.bind(builder);
            builder.maybeSingle = async () => {
              const result = await originalMaybeSingle();
              db.jobs[0].technician_id = OTHER_TECH_ID;
              return result;
            };
            return builder;
          },
        };
      };

      requireApiRoleMock.mockResolvedValue({
        profile: { id: TECH_AUTH_USER_ID, email: "tech@example.com", company_id: COMPANY_ID, role: "technician" },
        response: null,
        supabase: racySupabase,
      });

      const response = await patchJob({ status: "completed" });

      expect(response.status).toBe(403);
      expect(db.technicians[0]).toMatchObject({ availability_status: "on_job", current_job_id: JOB_ID });
    });
  });

  describe("cross-tenant isolation (issue #49)", () => {
    it("cannot mutate a job belonging to a different company", async () => {
      requireApiRoleMock.mockResolvedValue({
        profile: { id: DISPATCHER_ID, email: "other-co@example.com", company_id: OTHER_COMPANY_ID, role: "dispatcher" },
        response: null,
        supabase: createFakeSupabase(db),
      });

      const response = await patchJob({ status: "assigned" });

      expect(response.status).toBe(404);
      expect(db.jobs[0].status).toBe("new");
    });
  });

  describe("cross-tenant technician assignment (issue #64)", () => {
    it("rejects a dispatcher assigning a technician belonging to a different company", async () => {
      const response = await patchJob({ technician_id: FOREIGN_TECH_ID });

      expect(response.status).toBe(404);
      // The job's technician_id was never written, the foreign technician's
      // own row was never touched, and no assignment SMS was queued -- same
      // "phantom assignment" bug class fixed in POST /api/jobs, same fix.
      expect(db.jobs[0].technician_id).toBeNull();
      expect(db.technicians.find((t) => t.id === FOREIGN_TECH_ID)).toMatchObject({
        availability_status: "available",
        current_job_id: null,
      });
      expect(queueTechnicianAssignmentSmsMock).not.toHaveBeenCalled();
    });
  });
});
