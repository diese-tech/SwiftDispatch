/**
 * End-to-end sandbox-tenant quote lifecycle (issue #75, Phase 1/4): drives
 * the real route handlers in sequence -- POST /api/quotes -> POST .../line-
 * items -> POST /api/send-sms -> PATCH .../accept (or POST .../decline) --
 * against one shared in-memory fake Supabase, the way a prospect's actual
 * click-through would exercise them. Per-route unit coverage for the
 * sandbox-vs-ordinary is_demo visibility contract already exists (see
 * src/app/api/quotes/route.test.ts and its siblings); this file's job is
 * proving the *sequence* works end to end and that technician state comes
 * out correct at the finish line, not re-litigating that contract.
 *
 * Same "call the exported handler directly" pattern used throughout this
 * repo (src/app/api/jobs/[id]/route.test.ts, resetDemoTenant.test.ts) --
 * no live server, no network.
 */
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

type Row = Record<string, unknown>;

const requireApiRoleMock = vi.fn();
const enqueueSmsMock = vi.fn();
const queueCustomerInvoiceSmsMock = vi.fn();
const queueCustomerStatusSmsMock = vi.fn();
const queueTechnicianAssignmentSmsMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  requireApiRole: requireApiRoleMock,
}));

vi.mock("@/lib/smsOutbox", () => ({
  enqueueSms: enqueueSmsMock,
}));

vi.mock("@/lib/jobNotifications", () => ({
  queueCustomerInvoiceSms: queueCustomerInvoiceSmsMock,
  queueCustomerStatusSms: queueCustomerStatusSmsMock,
  queueTechnicianAssignmentSms: queueTechnicianAssignmentSmsMock,
}));

// Invoicing is a real subsystem with its own tests; stubbed here so this
// file stays focused on quote/job/technician state, not invoice numbering.
vi.mock("@/lib/payments", () => ({
  getPaymentProvider: () => ({
    createInvoice: async () => ({ invoiceId: "stub-invoice", invoiceUrl: "/invoice/stub", totalAmount: 0 }),
    getPaymentStatus: async () => ({ status: "pending" as const }),
  }),
}));

let adminStore: Map<string, Row[]>;
vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => createFakeSupabase(adminStore),
}));

// ── Generic in-memory multi-table fake, shared across every route call in
// a test so writes from one route are visible to the next. Filters support
// dot-paths (getPath) so a fake "join" -- e.g. quotes.jobs.company_id --
// works by embedding a live object reference on the row at setup time
// (see attachJobRef below), not by actually joining tables. ──────────────

type Filter =
  | { type: "eq"; path: string; value: unknown }
  | { type: "neq"; path: string; value: unknown }
  | { type: "not_in"; path: string; values: unknown[] };

function getPath(row: Row, path: string): unknown {
  return path.split(".").reduce<unknown>((v, k) => (v && typeof v === "object" ? (v as Row)[k] : undefined), row);
}

function parseNotInList(raw: string): unknown[] {
  return raw.replace(/^\(|\)$/g, "").split(",").map((s) => s.replace(/^"|"$/g, ""));
}

function matchesFilters(row: Row, filters: Filter[]) {
  return filters.every((f) => {
    const v = getPath(row, f.path);
    if (f.type === "eq") return v === f.value;
    if (f.type === "neq") return v !== f.value;
    return !f.values.includes(v);
  });
}

let idCounter = 0;

class Builder {
  private filters: Filter[] = [];
  private orderPath: string | null = null;
  private orderAsc = true;
  private limitN: number | null = null;

  constructor(
    private table: string,
    private store: Map<string, Row[]>,
    private mode: "select" | "insert" | "update" | "delete",
    private payload?: Row | Row[],
  ) {}

  eq(path: string, value: unknown) {
    this.filters.push({ type: "eq", path, value });
    return this;
  }
  neq(path: string, value: unknown) {
    this.filters.push({ type: "neq", path, value });
    return this;
  }
  not(path: string, _op: string, raw: string) {
    this.filters.push({ type: "not_in", path, values: parseNotInList(raw) });
    return this;
  }
  order(path: string, opts?: { ascending?: boolean }) {
    this.orderPath = path;
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
    if (this.orderPath) {
      const p = this.orderPath;
      result = [...result].sort((a, b) => {
        const cmp = String(getPath(a, p)).localeCompare(String(getPath(b, p)));
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
      created_at: new Date(Date.now() + idCounter).toISOString(),
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
    this.setRows(this.rows().filter((r) => !matchesFilters(r, this.filters)));
  }

  single() {
    const rows = this.mode === "insert" ? this.runInsert() : this.runSelect();
    return Promise.resolve(rows[0] ? { data: rows[0], error: null } : { data: null, error: { message: "not found" } });
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
        select: () => new Builder(table, store, "select"),
        insert: (payload: Row | Row[]) => new Builder(table, store, "insert", payload),
        update: (patch: Row) => new Builder(table, store, "update", patch),
        delete: () => new Builder(table, store, "delete"),
      };
    },
  };
}

// ── Fixtures ─────────────────────────────────────────────────────────────

const SANDBOX_COMPANY_ID = "11111111-1111-4111-8111-111111111111";
const JOB_ID = "22222222-2222-4222-8222-222222222222";
const TECH_ID = "33333333-3333-4333-8333-333333333333";
const DISPATCHER_ID = "44444444-4444-4444-8444-444444444444";

function asDispatcher(store: Map<string, Row[]>) {
  requireApiRoleMock.mockResolvedValue({
    profile: { id: DISPATCHER_ID, email: "dispatcher@example.com", company_id: SANDBOX_COMPANY_ID, role: "dispatcher" },
    response: null,
    supabase: createFakeSupabase(store),
  });
}

function seed(store: Map<string, Row[]>) {
  const company = { id: SANDBOX_COMPANY_ID, slug: "swiftdispatch-preview", name: "SwiftDispatch Preview", sms_sender_name: "SwiftDispatch", payment_provider: "manual" };
  const technician = { id: TECH_ID, company_id: SANDBOX_COMPANY_ID, name: "Mia Torres", phone: "+15551234567", availability_status: "on_job", current_job_id: JOB_ID };
  const job: Row = {
    id: JOB_ID,
    company_id: SANDBOX_COMPANY_ID,
    status: "in_progress",
    technician_id: TECH_ID,
    customer_name: "Riverside Dental",
    phone: "+15550010001",
    address: "240 Riverside Blvd",
    issue: "AC not cooling",
    sms_consent_type: "intake_form",
    is_demo: true,
  };
  // Fake "joins": live object references, not copies, so a later
  // Object.assign(job, patch) elsewhere is visible through every row that
  // embeds this same reference -- the same trick used for `companies`/
  // `technicians` below.
  job.companies = company;
  job.technicians = technician;

  store.set("companies", [company]);
  store.set("technicians", [technician]);
  store.set("jobs", [job]);
  store.set("quotes", []);
  store.set("quote_line_items", []);
  store.set("status_events", []);

  return { company, technician, job };
}

async function createQuote(body: Record<string, unknown>) {
  const { POST } = await import("../../app/api/quotes/route");
  return POST(new Request("http://localhost/api/quotes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }));
}

async function addLineItem(quoteId: string, body: Record<string, unknown>) {
  const { POST } = await import("../../app/api/quotes/[id]/line-items/route");
  return POST(
    new Request(`http://localhost/api/quotes/${quoteId}/line-items`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
    { params: Promise.resolve({ id: quoteId }) },
  );
}

async function sendQuote(body: Record<string, unknown>) {
  const { POST } = await import("../../app/api/send-sms/route");
  return POST(new Request("http://localhost/api/send-sms", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }));
}

async function acceptQuote(quoteId: string, body: Record<string, unknown>) {
  const { PATCH } = await import("../../app/api/quotes/[id]/accept/route");
  return PATCH(
    new Request(`http://localhost/api/quotes/${quoteId}/accept`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
    { params: Promise.resolve({ id: quoteId }) },
  );
}

async function declineQuote(quoteId: string, body: Record<string, unknown>) {
  const { POST } = await import("../../app/api/quotes/[id]/decline/route");
  return POST(
    new Request(`http://localhost/api/quotes/${quoteId}/decline`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
    { params: Promise.resolve({ id: quoteId }) },
  );
}

describe("sandbox tenant: full quote lifecycle", () => {
  let store: Map<string, Row[]>;
  let fixtures: ReturnType<typeof seed>;

  beforeAll(() => {
    process.env.QUOTE_TOKEN_SECRET = "test-secret-for-vitest-only";
  });

  beforeEach(() => {
    store = new Map();
    adminStore = store;
    fixtures = seed(store);
    requireApiRoleMock.mockReset();
    enqueueSmsMock.mockReset();
    enqueueSmsMock.mockResolvedValue(undefined);
    queueCustomerInvoiceSmsMock.mockReset();
    queueCustomerStatusSmsMock.mockReset();
    queueTechnicianAssignmentSmsMock.mockReset();
    asDispatcher(store);
  });

  it("create -> add line item -> send -> accept ends with a completed job and a released technician", async () => {
    const createRes = await createQuote({ job_id: JOB_ID, line_items: [{ name: "Diagnostic visit", price: 89, quantity: 1 }] });
    expect(createRes.status).toBe(200);
    const { quote_id: quoteId } = (await createRes.json()) as { quote_id: string };
    expect(quoteId).toBeTruthy();

    // The route's own insert has no real FK join -- attach the same live
    // job reference so the line-items/send-sms routes' `jobs!inner(...)`
    // selects resolve, matching how a real Postgres join would.
    const quoteRow = store.get("quotes")!.find((q) => q.id === quoteId)!;
    quoteRow.jobs = fixtures.job;

    const lineItemRes = await addLineItem(quoteId, { name: "Standard repair labor", price: 110, quantity: 1 });
    expect(lineItemRes.status).toBe(200);
    const { total: lineItemTotal } = (await lineItemRes.json()) as { total: number };
    expect(lineItemTotal).toBe(199); // 89 + 110

    // Real flow: the dispatcher moves the job to quote_pending once the
    // quote is ready to send (a separate kanban/status action, not
    // simulated here) -- quote_pending -> completed is the only valid
    // transition accept's assertValidTransition allows.
    fixtures.job.status = "quote_pending";

    const sendRes = await sendQuote({ quote_id: quoteId });
    expect(sendRes.status).toBe(200);
    expect(enqueueSmsMock).toHaveBeenCalledTimes(1);
    expect(quoteRow.status).toBe("sent");

    const token = (await import("@/lib/quoteTokens")).generateQuoteApprovalToken(quoteId);
    const acceptRes = await acceptQuote(quoteId, { token });
    expect(acceptRes.status).toBe(200);

    expect(quoteRow.status).toBe("accepted");
    expect(fixtures.job.status).toBe("completed");
    expect(fixtures.technician.availability_status).toBe("available");
    expect(fixtures.technician.current_job_id).toBeNull();

    const events = store.get("status_events")!;
    expect(events.some((e) => e.to_status === "completed")).toBe(true);
  });

  it("create -> add line item -> send -> decline puts the job back to in_progress without releasing the technician", async () => {
    const createRes = await createQuote({ job_id: JOB_ID, line_items: [{ name: "Diagnostic visit", price: 89, quantity: 1 }] });
    const { quote_id: quoteId } = (await createRes.json()) as { quote_id: string };
    const quoteRow = store.get("quotes")!.find((q) => q.id === quoteId)!;
    quoteRow.jobs = fixtures.job;

    // Job must be quote_pending for decline's assertValidTransition(status, 'in_progress') to accept it.
    fixtures.job.status = "quote_pending";

    const sendRes = await sendQuote({ quote_id: quoteId });
    expect(sendRes.status).toBe(200);

    const token = (await import("@/lib/quoteTokens")).generateQuoteApprovalToken(quoteId);
    const declineRes = await declineQuote(quoteId, { token, reason: "Too expensive" });
    expect(declineRes.status).toBe(200);

    expect(quoteRow.status).toBe("declined");
    expect(fixtures.job.status).toBe("in_progress");
    // Decline never touches technician state -- they're still working the job.
    expect(fixtures.technician.availability_status).toBe("on_job");
    expect(fixtures.technician.current_job_id).toBe(JOB_ID);

    const events = store.get("status_events")!;
    expect(events.some((e) => e.to_status === "in_progress" && e.actor_role === "customer")).toBe(true);
  });

  it("promotes another active job instead of releasing the technician if one remains after acceptance", async () => {
    const OTHER_JOB_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    store.get("jobs")!.push({
      id: OTHER_JOB_ID,
      company_id: SANDBOX_COMPANY_ID,
      status: "en_route",
      technician_id: TECH_ID,
      created_at: "2024-01-01T00:00:00.000Z",
      customer_name: "Carmichael Home",
      phone: "+15550020002",
    });

    const createRes = await createQuote({ job_id: JOB_ID, line_items: [{ name: "Diagnostic visit", price: 89, quantity: 1 }] });
    const { quote_id: quoteId } = (await createRes.json()) as { quote_id: string };
    const quoteRow = store.get("quotes")!.find((q) => q.id === quoteId)!;
    quoteRow.jobs = fixtures.job;

    fixtures.job.status = "quote_pending";
    await sendQuote({ quote_id: quoteId });
    const token = (await import("@/lib/quoteTokens")).generateQuoteApprovalToken(quoteId);
    const acceptRes = await acceptQuote(quoteId, { token });

    expect(acceptRes.status).toBe(200);
    expect(fixtures.job.status).toBe("completed");
    // /api/quotes/[id]/accept completes jobs independently of PATCH
    // /api/jobs/[id], but shares the same reconcileTechnicianAfterTerminalJob
    // helper (src/lib/technicianReconciliation.ts), so it must not report
    // the technician available while OTHER_JOB_ID is still open work.
    expect(fixtures.technician.availability_status).toBe("on_job");
    expect(fixtures.technician.current_job_id).toBe(OTHER_JOB_ID);
  });
});
