/**
 * Behavior coverage for quote line-item update/delete (issue #58): role
 * auth, company-scoped quote ownership, and total recompute after each
 * mutation via the extracted sumLineItems() helper.
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

function makeUpdateBuilder(getRows: () => Row[], patch: Row) {
  const filters: [string, unknown][] = [];
  const builder = {
    eq(column: string, value: unknown) {
      filters.push([column, value]);
      return builder;
    },
    select() {
      return {
        single: async () => {
          const row = getRows().find((r) => matchesFilters(r, filters));
          if (!row) return { data: null, error: { message: "Row not found" } };
          Object.assign(row, patch);
          return { data: row, error: null };
        },
      };
    },
    then(resolve: (value: { data: null; error: null }) => void) {
      const row = getRows().find((r) => matchesFilters(r, filters));
      if (row) Object.assign(row, patch);
      resolve({ data: null, error: null });
    },
  };
  return builder;
}

function makeDeleteBuilder(db: Db) {
  const filters: [string, unknown][] = [];
  const builder = {
    eq(column: string, value: unknown) {
      filters.push([column, value]);
      return builder;
    },
    then(resolve: (value: { data: null; error: null }) => void) {
      db.quote_line_items = db.quote_line_items.filter((r) => !matchesFilters(r, filters));
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
          update: (patch: Row) => makeUpdateBuilder(() => db.quote_line_items, patch),
          delete: () => makeDeleteBuilder(db),
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
const ITEM_ID = "77777777-7777-4777-8777-777777777777";
const OTHER_ITEM_ID = "88888888-8888-4888-8888-888888888888";
const DISPATCHER_ID = "66666666-6666-4666-8666-666666666666";

function freshDb(): Db {
  return {
    quotes: [{ id: QUOTE_ID, is_demo: false, jobs: { company_id: COMPANY_ID } }],
    quote_line_items: [
      { id: ITEM_ID, quote_id: QUOTE_ID, name: "Compressor", price: 200, quantity: 1 },
      { id: OTHER_ITEM_ID, quote_id: QUOTE_ID, name: "Filter", price: 50, quantity: 1 },
    ],
    companies: [{ id: COMPANY_ID, slug: "acme-hvac" }],
  };
}

function requireApiRoleAs(companyId: string) {
  requireApiRoleMock.mockResolvedValue({
    profile: { id: DISPATCHER_ID, email: "dispatcher@example.com", company_id: companyId, role: "dispatcher" },
    response: null,
    supabase: createFakeSupabase(db),
  });
}

async function patchLineItem(itemId: string, body: Record<string, unknown>) {
  const { PATCH } = await import("./route");
  return PATCH(
    new Request(`http://localhost/api/quotes/${QUOTE_ID}/line-items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id: QUOTE_ID, itemId }) },
  );
}

async function deleteLineItem(itemId: string) {
  const { DELETE } = await import("./route");
  return DELETE(new Request(`http://localhost/api/quotes/${QUOTE_ID}/line-items/${itemId}`, { method: "DELETE" }), {
    params: Promise.resolve({ id: QUOTE_ID, itemId }),
  });
}

let db: Db;

describe("PATCH /api/quotes/[id]/line-items/[itemId]", () => {
  beforeEach(() => {
    db = freshDb();
    requireApiRoleMock.mockReset();
    requireApiRoleAs(COMPANY_ID);
  });

  it("updates a subset of fields and recomputes the total", async () => {
    const response = await patchLineItem(ITEM_ID, { price: 300 });

    expect(response.status).toBe(200);
    const body = (await response.json()) as { item: Row; total: number };
    expect(body.item).toMatchObject({ price: 300, quantity: 1 });
    // 300*1 + 50*1 = 350
    expect(body.total).toBe(350);
    expect(db.quotes[0].total).toBe(350);
  });

  it("rejects a quote belonging to a different company", async () => {
    requireApiRoleAs(OTHER_COMPANY_ID);

    const response = await patchLineItem(ITEM_ID, { price: 300 });

    expect(response.status).toBe(404);
    expect(db.quote_line_items.find((i) => i.id === ITEM_ID)?.price).toBe(200);
  });
});

describe("DELETE /api/quotes/[id]/line-items/[itemId]", () => {
  beforeEach(() => {
    db = freshDb();
    requireApiRoleMock.mockReset();
    requireApiRoleAs(COMPANY_ID);
  });

  it("deletes the item and recomputes the total from the remaining items", async () => {
    const response = await deleteLineItem(ITEM_ID);

    expect(response.status).toBe(200);
    const body = (await response.json()) as { ok: boolean; total: number };
    expect(body.ok).toBe(true);
    expect(body.total).toBe(50);
    expect(db.quote_line_items.map((i) => i.id)).toEqual([OTHER_ITEM_ID]);
    expect(db.quotes[0].total).toBe(50);
  });

  it("rejects a quote belonging to a different company and does not delete anything", async () => {
    requireApiRoleAs(OTHER_COMPANY_ID);

    const response = await deleteLineItem(ITEM_ID);

    expect(response.status).toBe(404);
    expect(db.quote_line_items).toHaveLength(2);
  });
});
