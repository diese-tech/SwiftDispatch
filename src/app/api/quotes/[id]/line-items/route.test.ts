/**
 * Behavior coverage for quote line-item creation (issue #58): role auth,
 * company-scoped quote ownership via the jobs!inner join, and the
 * extracted sumLineItems()-backed total recompute (src/lib/quotePricing.ts).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

type Row = Record<string, unknown>;

const requireApiRoleMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  requireApiRole: requireApiRoleMock,
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
          const inserted = { id: `item-${getRows().length + 1}`, ...row };
          getRows().push(inserted);
          return { data: inserted, error: null };
        },
      };
    },
  };
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

type Db = { quotes: Row[]; quote_line_items: Row[]; companies: Row[] };

function createFakeSupabase(db: Db) {
  return {
    from(table: string) {
      if (table === "quotes") {
        return {
          select: () => makeSelectBuilder(() => db.quotes),
          update: (patch: Row) => makeUpdateBuilder(() => db.quotes, patch),
        };
      }
      if (table === "quote_line_items") {
        return {
          select: () => makeSelectBuilder(() => db.quote_line_items),
          insert: (row: Row) => makeInsertBuilder(() => db.quote_line_items, row),
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
const DISPATCHER_ID = "66666666-6666-4666-8666-666666666666";

function freshDb(): Db {
  return {
    quotes: [{ id: QUOTE_ID, is_demo: false, jobs: { company_id: COMPANY_ID } }],
    quote_line_items: [{ id: "item-existing", quote_id: QUOTE_ID, name: "Filter", price: 50, quantity: 1 }],
    companies: [{ id: COMPANY_ID, slug: "acme-hvac" }],
  };
}

async function addLineItem(body: Record<string, unknown>) {
  const { POST } = await import("./route");
  return POST(
    new Request(`http://localhost/api/quotes/${QUOTE_ID}/line-items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id: QUOTE_ID }) },
  );
}

describe("POST /api/quotes/[id]/line-items", () => {
  let db: Db;

  beforeEach(() => {
    db = freshDb();
    requireApiRoleMock.mockReset();
    requireApiRoleMock.mockResolvedValue({
      profile: { id: DISPATCHER_ID, email: "dispatcher@example.com", company_id: COMPANY_ID, role: "dispatcher" },
      response: null,
      supabase: createFakeSupabase(db),
    });
  });

  it("creates a line item and recomputes the quote total from all items", async () => {
    const response = await addLineItem({ name: "Compressor", price: 200, quantity: 2 });

    expect(response.status).toBe(200);
    const body = (await response.json()) as { item: Row; total: number };
    expect(body.item).toMatchObject({ name: "Compressor", price: 200, quantity: 2 });
    // existing 50*1 + new 200*2 = 450
    expect(body.total).toBe(450);
    expect(db.quotes[0].total).toBe(450);
    expect(db.quotes[0].total_amount).toBe(450);
  });

  it("rejects a quote belonging to a different company", async () => {
    requireApiRoleMock.mockResolvedValue({
      profile: { id: DISPATCHER_ID, email: "other@example.com", company_id: OTHER_COMPANY_ID, role: "dispatcher" },
      response: null,
      supabase: createFakeSupabase(db),
    });

    const response = await addLineItem({ name: "Compressor", price: 200, quantity: 1 });

    expect(response.status).toBe(404);
    expect(db.quote_line_items).toHaveLength(1);
  });

  it("denies a role outside dispatcher/admin", async () => {
    requireApiRoleMock.mockResolvedValue({
      profile: null,
      response: new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 }),
      supabase: null,
    });

    const response = await addLineItem({ name: "Compressor", price: 200, quantity: 1 });

    expect(response.status).toBe(403);
    expect(requireApiRoleMock).toHaveBeenCalledWith(["dispatcher", "admin"]);
  });
});

// Half-Shell review on this PR (echoing the Codex finding on GET /api/jobs):
// a sandbox tenant's is_demo=true quotes must stay mutable here, while an
// ordinary company's is_demo=true rows (load-test/live-QA traffic -- see
// scripts/load-tech-actions.mjs) must stay hidden/unfindable.
describe("POST /api/quotes/[id]/line-items - is_demo visibility", () => {
  const SANDBOX_COMPANY_ID = "88888888-8888-4888-8888-888888888888";

  beforeEach(() => {
    requireApiRoleMock.mockReset();
  });

  it("sandbox tenant: can add a line item to an is_demo=true quote", async () => {
    const db: Db = {
      quotes: [{ id: QUOTE_ID, is_demo: true, jobs: { company_id: SANDBOX_COMPANY_ID } }],
      quote_line_items: [],
      companies: [{ id: SANDBOX_COMPANY_ID, slug: "swiftdispatch-preview" }],
    };
    requireApiRoleMock.mockResolvedValue({
      profile: { id: DISPATCHER_ID, email: "dispatcher@example.com", company_id: SANDBOX_COMPANY_ID, role: "dispatcher" },
      response: null,
      supabase: createFakeSupabase(db),
    });

    const response = await addLineItem({ name: "Diagnostic", price: 89, quantity: 1 });

    expect(response.status).toBe(200);
    expect(db.quote_line_items).toHaveLength(1);
  });

  it("ordinary tenant: an is_demo=true quote (load-test traffic) is not found", async () => {
    const db: Db = {
      quotes: [{ id: QUOTE_ID, is_demo: true, jobs: { company_id: COMPANY_ID } }],
      quote_line_items: [],
      companies: [{ id: COMPANY_ID, slug: "acme-hvac" }],
    };
    requireApiRoleMock.mockResolvedValue({
      profile: { id: DISPATCHER_ID, email: "dispatcher@example.com", company_id: COMPANY_ID, role: "dispatcher" },
      response: null,
      supabase: createFakeSupabase(db),
    });

    const response = await addLineItem({ name: "Diagnostic", price: 89, quantity: 1 });

    expect(response.status).toBe(404);
    expect(db.quote_line_items).toHaveLength(0);
  });
});
