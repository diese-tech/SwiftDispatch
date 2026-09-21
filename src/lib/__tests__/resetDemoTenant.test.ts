/**
 * resetDemoTenant() does a FULL DESTRUCTIVE WIPE of every job/quote/
 * status_event for whatever company it targets. These tests exist to prove
 * the safety-critical routing logic added around that wipe -- that it can
 * only ever land on a company whose slug is on SANDBOX_DEMO_SLUGS, never a
 * real customer resolved from the ambiguous `demo_mode_enabled` flag alone
 * (see src/lib/demo.ts). They deliberately do NOT re-verify the seeding
 * mechanics in exhaustive relational detail -- that's already exercised
 * live by the nightly cron and the "Reset demo" button.
 *
 * Mocks @/lib/supabase/admin's createSupabaseAdminClient with a generic,
 * permissive in-memory fake query builder (eq/in/not/order/limit/select/
 * insert/update/delete/single/maybeSingle, per-table row store), matching
 * the pattern established by smsOutbox.test.ts.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { demoJobs } from "@/lib/demo-data";
import { resetDemoTenant } from "../resetDemoTenant";

type Row = Record<string, unknown>;

const { createSupabaseAdminClientMock } = vi.hoisted(() => ({
  createSupabaseAdminClientMock: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => createSupabaseAdminClientMock(),
}));

type Filter =
  | { type: "eq"; column: string; value: unknown }
  | { type: "in"; column: string; values: unknown[] }
  | { type: "not_in"; column: string; values: unknown[] };

function matchesFilters(row: Row, filters: Filter[]) {
  return filters.every((f) => {
    if (f.type === "eq") return row[f.column] === f.value;
    if (f.type === "in") return f.values.includes(row[f.column]);
    return !f.values.includes(row[f.column]);
  });
}

function parseNotInList(raw: string): unknown[] {
  return raw
    .replace(/^\(|\)$/g, "")
    .split(",")
    .map((s) => s.replace(/^"|"$/g, ""));
}

let idCounter = 0;

class Builder {
  private filters: Filter[] = [];
  private orderColumn: string | null = null;
  private orderAsc = true;
  private limitN: number | null = null;

  constructor(
    private table: string,
    private store: Map<string, Row[]>,
    private mode: "select" | "insert" | "update" | "delete",
    private payload?: Row | Row[],
  ) {}

  eq(column: string, value: unknown) {
    this.filters.push({ type: "eq", column, value });
    return this;
  }
  in(column: string, values: unknown[]) {
    this.filters.push({ type: "in", column, values });
    return this;
  }
  not(column: string, _op: string, raw: string) {
    this.filters.push({ type: "not_in", column, values: parseNotInList(raw) });
    return this;
  }
  order(column: string, opts?: { ascending?: boolean }) {
    this.orderColumn = column;
    this.orderAsc = opts?.ascending ?? true;
    return this;
  }
  limit(n: number) {
    this.limitN = n;
    return this;
  }
  select() {
    return this;
  }

  private rows() {
    return this.store.get(this.table) ?? [];
  }
  private setRows(rows: Row[]) {
    this.store.set(this.table, rows);
  }

  private runSelect() {
    let result = this.rows().filter((r) => matchesFilters(r, this.filters));
    if (this.orderColumn) {
      const column = this.orderColumn;
      result = [...result].sort((a, b) => {
        const cmp = String(a[column]).localeCompare(String(b[column]));
        return this.orderAsc ? cmp : -cmp;
      });
    }
    if (this.limitN !== null) result = result.slice(0, this.limitN);
    return result;
  }

  private runInsert() {
    const items = Array.isArray(this.payload) ? this.payload : [this.payload!];
    const inserted = items.map((item) => ({
      id: `${this.table}-${(idCounter += 1)}`,
      ...item,
    }));
    this.setRows([...this.rows(), ...inserted]);
    return inserted;
  }

  private runUpdate() {
    const affected = this.rows().filter((r) => matchesFilters(r, this.filters));
    affected.forEach((r) => Object.assign(r, this.payload));
    return affected;
  }

  private runDelete() {
    const remaining = this.rows().filter((r) => !matchesFilters(r, this.filters));
    this.setRows(remaining);
  }

  single() {
    const rows = this.mode === "insert" ? this.runInsert() : this.runSelect();
    return Promise.resolve(
      rows[0] ? { data: rows[0], error: null } : { data: null, error: { message: "not found" } },
    );
  }

  maybeSingle() {
    const rows = this.mode === "insert" ? this.runInsert() : this.runSelect();
    return Promise.resolve({ data: rows[0] ?? null, error: null });
  }

  then(resolve: (value: { data: Row[] | null; error: null }) => void) {
    let data: Row[] = [];
    if (this.mode === "select") data = this.runSelect();
    else if (this.mode === "insert") data = this.runInsert();
    else if (this.mode === "update") data = this.runUpdate();
    else if (this.mode === "delete") this.runDelete();
    resolve({ data, error: null });
  }
}

function createFakeSupabase(store: Map<string, Row[]>) {
  return {
    from(table: string) {
      return {
        select: () => new Builder(table, store, "select", undefined),
        insert: (payload: Row | Row[]) => new Builder(table, store, "insert", payload),
        update: (patch: Row) => new Builder(table, store, "update", patch),
        delete: () => new Builder(table, store, "delete"),
      };
    },
  };
}

const PUBLIC_DEMO_ID = "11111111-1111-4111-8111-111111111111";
const PREVIEW_DEMO_ID = "22222222-2222-4222-8222-222222222222";
const REAL_COMPANY_ID = "33333333-3333-4333-8333-333333333333";

function seedCompanies(store: Map<string, Row[]>) {
  store.set("companies", [
    { id: PUBLIC_DEMO_ID, slug: "swiftdispatch-demo", demo_mode_enabled: true },
    { id: PREVIEW_DEMO_ID, slug: "swiftdispatch-preview", demo_mode_enabled: true },
    { id: REAL_COMPANY_ID, slug: "acme-hvac", demo_mode_enabled: true },
  ]);
}

describe("resetDemoTenant", () => {
  let store: Map<string, Row[]>;

  beforeEach(() => {
    store = new Map();
    seedCompanies(store);
    createSupabaseAdminClientMock.mockReset();
    createSupabaseAdminClientMock.mockImplementation(() => createFakeSupabase(store));
  });

  it("resets an explicit targetCompanyId on a sandbox-slug company and reseeds its jobs", async () => {
    const result = await resetDemoTenant(PREVIEW_DEMO_ID);

    expect(result.jobsSeeded).toBe(demoJobs.length);
    const jobs = (store.get("jobs") ?? []).filter((j) => j.company_id === PREVIEW_DEMO_ID);
    expect(jobs).toHaveLength(demoJobs.length);
  });

  it("refuses an explicit targetCompanyId on a non-sandbox company and performs no wipe", async () => {
    store.set("jobs", [
      { id: "existing-job-1", company_id: REAL_COMPANY_ID, customer_name: "Real Customer" },
    ]);

    await expect(resetDemoTenant(REAL_COMPANY_ID)).rejects.toThrow(
      /Refusing to reset non-sandbox company/,
    );

    // The real company's pre-existing job must be untouched -- no wipe, no reseed.
    const jobs = store.get("jobs") ?? [];
    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toMatchObject({ id: "existing-job-1", customer_name: "Real Customer" });
  });

  it("with no targetCompanyId, resets every sandbox-slug company and aggregates jobsSeeded", async () => {
    const result = await resetDemoTenant();

    expect(result.jobsSeeded).toBe(demoJobs.length * 2);
    const publicJobs = (store.get("jobs") ?? []).filter((j) => j.company_id === PUBLIC_DEMO_ID);
    const previewJobs = (store.get("jobs") ?? []).filter((j) => j.company_id === PREVIEW_DEMO_ID);
    expect(publicJobs).toHaveLength(demoJobs.length);
    expect(previewJobs).toHaveLength(demoJobs.length);
  });

  it("with no targetCompanyId, never touches a real company even with demo_mode_enabled=true", async () => {
    store.set("jobs", [
      { id: "existing-job-1", company_id: REAL_COMPANY_ID, customer_name: "Real Customer" },
    ]);

    await resetDemoTenant();

    const realCompanyJobs = (store.get("jobs") ?? []).filter((j) => j.company_id === REAL_COMPANY_ID);
    expect(realCompanyJobs).toHaveLength(1);
    expect(realCompanyJobs[0]).toMatchObject({ id: "existing-job-1", customer_name: "Real Customer" });
  });

  it("throws when no sandbox demo companies exist", async () => {
    store.set("companies", [{ id: REAL_COMPANY_ID, slug: "acme-hvac", demo_mode_enabled: true }]);

    await expect(resetDemoTenant()).rejects.toThrow(/No sandbox demo companies found/);
  });
});
