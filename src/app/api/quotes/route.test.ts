/**
 * Representative "quote mutation" authorization pair for issue #49:
 * dispatcher allowed, technician denied. requireApiRole()'s own correctness
 * (401/403/200 semantics) is unit-tested in src/lib/__tests__/auth.test.ts;
 * this proves the route actually calls it with the right allowed-role set
 * and respects a denial before touching the database.
 *
 * Also covers both sides of the is_demo visibility contract (Half-Shell
 * review on this PR, echoing the Codex finding on GET /api/jobs): a sandbox
 * tenant's is_demo=true quotes must be found (not shadowed by a duplicate
 * insert), while an ordinary company's is_demo=true rows (load-test/live-QA
 * traffic -- see scripts/load-tech-actions.mjs) must stay invisible here.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

type Row = Record<string, unknown>;

const requireApiRoleMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  requireApiRole: requireApiRoleMock,
}));

const COMPANY_ID = "11111111-1111-4111-8111-111111111111";
const SANDBOX_COMPANY_ID = "33333333-3333-4333-8333-333333333333";
const JOB_ID = "22222222-2222-4222-8222-222222222222";
const EXISTING_QUOTE_ID = "77777777-7777-4777-8777-777777777777";
const DISPATCHER_ID = "44444444-4444-4444-8444-444444444444";

function forbiddenResponse() {
  return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
}

function matchesFilters(row: Row, filters: [string, unknown][]) {
  return filters.every(([column, value]) => row[column] === value);
}

function makeQuotesSelectBuilder(getRows: () => Row[]) {
  const filters: [string, unknown][] = [];
  const builder = {
    eq(column: string, value: unknown) {
      filters.push([column, value]);
      return builder;
    },
    order() {
      return builder;
    },
    limit() {
      return builder;
    },
    maybeSingle: async () => {
      const row = getRows().find((r) => matchesFilters(r, filters));
      return { data: row ?? null, error: null };
    },
  };
  return builder;
}

type Db = { quotes: Row[]; companies: Row[] };

function createFakeSupabase(db: Db) {
  return {
    from(table: string) {
      if (table === "jobs") {
        return { select: () => ({ eq: () => ({ eq: () => ({ single: async () => ({ data: { id: JOB_ID }, error: null }) }) }) }) };
      }
      if (table === "companies") {
        return {
          select: () => ({
            eq: (column: string, value: unknown) => ({
              maybeSingle: async () => ({ data: db.companies.find((c) => c[column] === value) ?? null, error: null }),
            }),
          }),
        };
      }
      if (table === "quotes") {
        return {
          select: () => makeQuotesSelectBuilder(() => db.quotes),
          insert: () => ({ select: () => ({ single: async () => ({ data: { id: "quote-new" }, error: null }) }) }),
          update: () => ({ eq: () => ({ select: () => ({ single: async () => ({ data: { id: EXISTING_QUOTE_ID }, error: null }) }) }) }),
        };
      }
      throw new Error(`Unexpected table in test double: ${table}`);
    },
  };
}

function requireApiRoleAs(companyId: string, db: Db) {
  requireApiRoleMock.mockResolvedValue({
    profile: { id: DISPATCHER_ID, email: "dispatcher@example.com", company_id: companyId, role: "dispatcher" },
    response: null,
    supabase: createFakeSupabase(db),
  });
}

async function postQuote(body: Record<string, unknown>) {
  const { POST } = await import("./route");
  return POST(
    new Request("http://localhost/api/quotes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

describe("POST /api/quotes - authorization", () => {
  beforeEach(() => {
    requireApiRoleMock.mockReset();
  });

  it("denies a technician building a quote", async () => {
    requireApiRoleMock.mockResolvedValue({ profile: null, response: forbiddenResponse(), supabase: null });

    const response = await postQuote({ job_id: JOB_ID });

    expect(response.status).toBe(403);
  });

  it("allows a dispatcher to build a quote", async () => {
    requireApiRoleAs(COMPANY_ID, {
      quotes: [],
      companies: [{ id: COMPANY_ID, slug: "acme-hvac" }],
    });

    const response = await postQuote({ job_id: JOB_ID });

    expect(response.status).not.toBe(403);
    expect(requireApiRoleMock).toHaveBeenCalledWith(["dispatcher", "admin"]);
  });
});

describe("POST /api/quotes - is_demo visibility", () => {
  beforeEach(() => {
    requireApiRoleMock.mockReset();
  });

  it("sandbox tenant: finds an existing is_demo=true quote instead of creating a duplicate", async () => {
    requireApiRoleAs(SANDBOX_COMPANY_ID, {
      quotes: [{ id: EXISTING_QUOTE_ID, job_id: JOB_ID, is_demo: true, total: 959 }],
      companies: [{ id: SANDBOX_COMPANY_ID, slug: "swiftdispatch-preview" }],
    });

    const response = await postQuote({ job_id: JOB_ID });
    const body = (await response.json()) as { quote_id: string };

    expect(response.status).toBe(200);
    expect(body.quote_id).toBe(EXISTING_QUOTE_ID);
  });

  it("ordinary tenant: an is_demo=true row (load-test traffic) stays hidden, so a fresh quote is created instead", async () => {
    requireApiRoleAs(COMPANY_ID, {
      quotes: [{ id: EXISTING_QUOTE_ID, job_id: JOB_ID, is_demo: true, total: 959 }],
      companies: [{ id: COMPANY_ID, slug: "acme-hvac" }],
    });

    const response = await postQuote({ job_id: JOB_ID });
    const body = (await response.json()) as { quote_id: string };

    expect(response.status).toBe(200);
    expect(body.quote_id).not.toBe(EXISTING_QUOTE_ID);
  });
});
