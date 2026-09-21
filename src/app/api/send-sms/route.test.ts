/**
 * Behavior coverage for quote-approval SMS send (issue #58): role auth,
 * company-scoped quote ownership via the jobs!inner join, the SMS-consent
 * gate, and the documented non-rollback behavior when enqueue fails after
 * the quote is already marked sent.
 */
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

beforeAll(() => {
  process.env.QUOTE_TOKEN_SECRET = "test-secret-for-vitest-only";
});

type Row = Record<string, unknown>;

const requireApiRoleMock = vi.fn();
const enqueueSmsMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  requireApiRole: requireApiRoleMock,
}));

vi.mock("@/lib/smsOutbox", () => ({
  enqueueSms: enqueueSmsMock,
}));

function getPath(row: Row, path: string): unknown {
  return path.split(".").reduce<unknown>((value, key) => {
    if (value && typeof value === "object") return (value as Row)[key];
    return undefined;
  }, row);
}

function matchesFilters(row: Row, filters: [string, unknown][]) {
  return filters.every(([column, value]) => getPath(row, column) === value);
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

type Db = { quotes: Row[]; companies: Row[] };

function createFakeSupabase(db: Db) {
  return {
    from(table: string) {
      if (table === "quotes") {
        return {
          select: () => makeSelectBuilder(() => db.quotes),
          update: (patch: Row) => makeUpdateBuilder(() => db.quotes, patch),
        };
      }
      if (table === "companies") {
        return { select: () => makeSelectBuilder(() => db.companies) };
      }
      throw new Error(`Unexpected table in test double: ${table}`);
    },
  };
}

const COMPANY_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_COMPANY_ID = "55555555-5555-4555-8555-555555555555";
const QUOTE_ID = "22222222-2222-4222-8222-222222222222";
const JOB_ID = "33333333-3333-4333-8333-333333333333";
const DISPATCHER_ID = "66666666-6666-4666-8666-666666666666";

function freshDb(): Db {
  return {
    quotes: [
      {
        id: QUOTE_ID,
        is_demo: false,
        status: "draft",
        jobs: { id: JOB_ID, phone: "+15550000002", company_id: COMPANY_ID, sms_consent_type: "intake_form" },
      },
    ],
    companies: [{ id: COMPANY_ID, slug: "acme-hvac" }],
  };
}

function requireApiRoleAs(db: Db, companyId: string) {
  requireApiRoleMock.mockResolvedValue({
    profile: { id: DISPATCHER_ID, email: "dispatcher@example.com", company_id: companyId, role: "dispatcher" },
    response: null,
    supabase: createFakeSupabase(db),
  });
}

async function sendSms(body: Record<string, unknown>) {
  const { POST } = await import("./route");
  return POST(
    new Request("http://localhost/api/send-sms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

describe("POST /api/send-sms", () => {
  let db: Db;

  beforeEach(() => {
    db = freshDb();
    requireApiRoleMock.mockReset();
    enqueueSmsMock.mockReset();
    enqueueSmsMock.mockResolvedValue(undefined);
    requireApiRoleAs(db, COMPANY_ID);
  });

  it("marks the quote sent and enqueues an SMS containing a verifiable approval token", async () => {
    const response = await sendSms({ quote_id: QUOTE_ID });

    expect(response.status).toBe(200);
    expect(db.quotes[0].status).toBe("sent");
    expect(enqueueSmsMock).toHaveBeenCalledTimes(1);
    const call = enqueueSmsMock.mock.calls[0][0] as { body: string };
    expect(call.body).toContain("/intake/quote/");
  });

  it("rejects when the job's SMS consent gate is not satisfied", async () => {
    db.quotes[0].jobs = { ...(db.quotes[0].jobs as Row), sms_consent_type: "none" };

    const response = await sendSms({ quote_id: QUOTE_ID });

    expect(response.status).toBe(400);
    expect(db.quotes[0].status).toBe("draft");
    expect(enqueueSmsMock).not.toHaveBeenCalled();
  });

  it("rejects a quote belonging to a different company", async () => {
    requireApiRoleAs(db, OTHER_COMPANY_ID);

    const response = await sendSms({ quote_id: QUOTE_ID });

    expect(response.status).toBe(404);
    expect(db.quotes[0].status).toBe("draft");
  });

  it("returns a warning but keeps the quote marked sent when enqueue fails (documented non-rollback behavior)", async () => {
    enqueueSmsMock.mockRejectedValue(new Error("outbox unavailable"));

    const response = await sendSms({ quote_id: QUOTE_ID });

    expect(response.status).toBe(200);
    const body = (await response.json()) as { ok: boolean; warning?: string };
    expect(body.warning).toBeTruthy();
    expect(db.quotes[0].status).toBe("sent");
  });
});

// Half-Shell review on this PR (echoing the Codex finding on GET /api/jobs):
// a sandbox tenant's is_demo=true quotes must stay sendable here, while an
// ordinary company's is_demo=true rows (load-test/live-QA traffic -- see
// scripts/load-tech-actions.mjs) must stay hidden/unfindable.
describe("POST /api/send-sms - is_demo visibility", () => {
  const SANDBOX_COMPANY_ID = "22222222-2222-4222-8222-222222222222";

  beforeEach(() => {
    requireApiRoleMock.mockReset();
    enqueueSmsMock.mockReset();
    enqueueSmsMock.mockResolvedValue(undefined);
  });

  it("sandbox tenant: can send an is_demo=true quote", async () => {
    const db: Db = {
      quotes: [
        {
          id: QUOTE_ID,
          is_demo: true,
          status: "draft",
          jobs: { id: JOB_ID, phone: "+15550000002", company_id: SANDBOX_COMPANY_ID, sms_consent_type: "intake_form" },
        },
      ],
      companies: [{ id: SANDBOX_COMPANY_ID, slug: "swiftdispatch-preview" }],
    };
    requireApiRoleAs(db, SANDBOX_COMPANY_ID);

    const response = await sendSms({ quote_id: QUOTE_ID });

    expect(response.status).toBe(200);
    expect(db.quotes[0].status).toBe("sent");
  });

  it("ordinary tenant: an is_demo=true quote (load-test traffic) is not found for sending", async () => {
    const db: Db = {
      quotes: [
        {
          id: QUOTE_ID,
          is_demo: true,
          status: "draft",
          jobs: { id: JOB_ID, phone: "+15550000002", company_id: COMPANY_ID, sms_consent_type: "intake_form" },
        },
      ],
      companies: [{ id: COMPANY_ID, slug: "acme-hvac" }],
    };
    requireApiRoleAs(db, COMPANY_ID);

    const response = await sendSms({ quote_id: QUOTE_ID });

    expect(response.status).toBe(404);
    expect(enqueueSmsMock).not.toHaveBeenCalled();
  });
});
