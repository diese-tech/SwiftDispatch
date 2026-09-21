/**
 * Behavior coverage for the app's actual money path (issue #58): dual auth
 * (customer approval token OR dispatcher/admin role), payment-provider
 * invoice creation, and the job/quote state transition to `completed`.
 * Follows the fake-Supabase-query-builder pattern established in
 * src/app/api/jobs/[id]/route.test.ts and src/lib/__tests__/smsOutbox.test.ts.
 */
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { generateQuoteApprovalToken } from "@/lib/quoteTokens";

beforeAll(() => {
  process.env.QUOTE_TOKEN_SECRET = "test-secret-for-vitest-only";
});

type Row = Record<string, unknown>;

const requireApiRoleMock = vi.fn();
const getPaymentProviderMock = vi.fn();
const queueCustomerStatusSmsMock = vi.fn();
const queueCustomerInvoiceSmsMock = vi.fn();
const createSupabaseAdminClientMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  requireApiRole: requireApiRoleMock,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => createSupabaseAdminClientMock(),
}));

vi.mock("@/lib/payments", () => ({
  getPaymentProvider: getPaymentProviderMock,
}));

vi.mock("@/lib/jobNotifications", () => ({
  queueCustomerStatusSms: queueCustomerStatusSmsMock,
  queueCustomerInvoiceSms: queueCustomerInvoiceSmsMock,
}));

type Filter =
  | { type: "eq"; column: string; value: unknown }
  | { type: "neq"; column: string; value: unknown }
  | { type: "not_in"; column: string; values: unknown[] };

function parseNotInList(raw: string): unknown[] {
  return raw.replace(/^\(|\)$/g, "").split(",").map((s) => s.replace(/^"|"$/g, ""));
}

function matchesFilters(row: Row, filters: Filter[]) {
  return filters.every((f) => {
    if (f.type === "eq") return row[f.column] === f.value;
    if (f.type === "neq") return row[f.column] !== f.value;
    return !f.values.includes(row[f.column]);
  });
}

function makeSelectBuilder(getRows: () => Row[]) {
  const filters: Filter[] = [];
  let orderColumn: string | null = null;
  let limitN: number | null = null;
  const builder = {
    eq(column: string, value: unknown) {
      filters.push({ type: "eq", column, value });
      return builder;
    },
    neq(column: string, value: unknown) {
      filters.push({ type: "neq", column, value });
      return builder;
    },
    not(column: string, _op: string, raw: string) {
      filters.push({ type: "not_in", column, values: parseNotInList(raw) });
      return builder;
    },
    order(column: string) {
      orderColumn = column;
      return builder;
    },
    limit(n: number) {
      limitN = n;
      return builder;
    },
    single: async () => {
      const row = getRows().find((r) => matchesFilters(r, filters));
      return row ? { data: row, error: null } : { data: null, error: { message: "Row not found" } };
    },
    maybeSingle: async () => {
      let rows = getRows().filter((r) => matchesFilters(r, filters));
      if (orderColumn) {
        const column = orderColumn;
        rows = [...rows].sort((a, b) => String(a[column]).localeCompare(String(b[column])));
      }
      if (limitN !== null) rows = rows.slice(0, limitN);
      return { data: rows[0] ?? null, error: null };
    },
    then(resolve: (value: { data: Row[]; error: null }) => void) {
      resolve({ data: getRows().filter((r) => matchesFilters(r, filters)), error: null });
    },
  };
  return builder;
}

function makeUpdateBuilder(getRows: () => Row[], patch: Row) {
  const filters: Filter[] = [];
  function applyAndFind() {
    const row = getRows().find((r) => matchesFilters(r, filters));
    if (!row) return null;
    Object.assign(row, patch);
    return row;
  }
  const builder = {
    eq(column: string, value: unknown) {
      filters.push({ type: "eq", column, value });
      return builder;
    },
    then(resolve: (value: { data: null; error: null }) => void) {
      applyAndFind();
      resolve({ data: null, error: null });
    },
  };
  return builder;
}

type Db = {
  quotes: Row[];
  jobs: Row[];
  quote_line_items: Row[];
  technicians: Row[];
};

function createFakeSupabase(db: Db) {
  return {
    from(table: string) {
      if (table === "quotes") {
        return {
          select: () => makeSelectBuilder(() => db.quotes),
          update: (patch: Row) => makeUpdateBuilder(() => db.quotes, patch),
        };
      }
      if (table === "jobs") {
        return {
          select: () => makeSelectBuilder(() => db.jobs),
          update: (patch: Row) => makeUpdateBuilder(() => db.jobs, patch),
        };
      }
      if (table === "quote_line_items") {
        return {
          select: () => makeSelectBuilder(() => db.quote_line_items),
        };
      }
      if (table === "technicians") {
        return {
          update: (patch: Row) => makeUpdateBuilder(() => db.technicians, patch),
        };
      }
      if (table === "status_events") {
        return {
          insert: async () => ({ error: null }),
        };
      }
      throw new Error(`Unexpected table in test double: ${table}`);
    },
  };
}

const COMPANY_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_COMPANY_ID = "55555555-5555-4555-8555-555555555555";
const QUOTE_ID = "22222222-2222-4222-8222-222222222222";
const JOB_ID = "33333333-3333-4333-8333-333333333333";
const TECH_ID = "44444444-4444-4444-8444-444444444444";
const DISPATCHER_ID = "66666666-6666-4666-8666-666666666666";

function freshDb(): Db {
  return {
    quotes: [{ id: QUOTE_ID, status: "sent", job_id: JOB_ID, total_amount: 500, total: 500 }],
    jobs: [
      {
        id: JOB_ID,
        status: "quote_pending",
        company_id: COMPANY_ID,
        technician_id: TECH_ID,
        customer_name: "Ada Lovelace",
        phone: "+15550000002",
        address: "1 Signal Way",
        sms_consent_type: "intake_form",
        companies: { name: "Acme HVAC", sms_sender_name: "Acme", payment_provider: "manual", payment_config: null },
        technicians: { name: "Grace Hopper" },
      },
    ],
    quote_line_items: [{ quote_id: QUOTE_ID, price: 250, quantity: 2 }],
    technicians: [{ id: TECH_ID, company_id: COMPANY_ID, availability_status: "on_job", current_job_id: JOB_ID }],
  };
}

async function acceptQuote(body: Record<string, unknown> = {}) {
  const { PATCH } = await import("./route");
  return PATCH(
    new Request(`http://localhost/api/quotes/${QUOTE_ID}/accept`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id: QUOTE_ID }) },
  );
}

describe("PATCH /api/quotes/[id]/accept", () => {
  let db: Db;
  let stubProvider: { createInvoice: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    db = freshDb();
    requireApiRoleMock.mockReset();
    getPaymentProviderMock.mockReset();
    queueCustomerStatusSmsMock.mockReset();
    queueCustomerInvoiceSmsMock.mockReset();
    createSupabaseAdminClientMock.mockReset();
    createSupabaseAdminClientMock.mockImplementation(() => createFakeSupabase(db));

    stubProvider = { createInvoice: vi.fn().mockResolvedValue({ invoiceId: "inv-1", invoiceUrl: "/invoice/abc", totalAmount: 500 }) };
    getPaymentProviderMock.mockReturnValue(stubProvider);

    requireApiRoleMock.mockResolvedValue({
      profile: { id: DISPATCHER_ID, email: "dispatcher@example.com", company_id: COMPANY_ID, role: "dispatcher" },
      response: null,
      supabase: createFakeSupabase(db),
    });
  });

  it("accepts via a valid customer approval token", async () => {
    const token = generateQuoteApprovalToken(QUOTE_ID);

    const response = await acceptQuote({ token });

    expect(response.status).toBe(200);
    expect(db.quotes[0].status).toBe("accepted");
    expect(db.jobs[0].status).toBe("completed");
    expect(db.technicians[0].availability_status).toBe("available");
    expect(db.technicians[0].current_job_id).toBeNull();
    expect(queueCustomerStatusSmsMock).toHaveBeenCalledTimes(1);
    expect(queueCustomerInvoiceSmsMock).toHaveBeenCalledTimes(1);
    // requireApiRole should never be consulted on the token path
    expect(requireApiRoleMock).not.toHaveBeenCalled();
  });

  it("promotes another active job instead of releasing the technician, if one remains (issue #75)", async () => {
    const OTHER_JOB_ID = "77777777-7777-4777-8777-777777777777";
    db.jobs.push({
      id: OTHER_JOB_ID,
      status: "en_route",
      company_id: COMPANY_ID,
      technician_id: TECH_ID,
      created_at: "2024-01-01T00:00:00.000Z",
      customer_name: "Carmichael Home",
    });

    const token = generateQuoteApprovalToken(QUOTE_ID);
    const response = await acceptQuote({ token });

    expect(response.status).toBe(200);
    expect(db.jobs[0].status).toBe("completed");
    expect(db.technicians[0]).toMatchObject({ availability_status: "on_job", current_job_id: OTHER_JOB_ID });
  });

  it("accepts via an authenticated dispatcher (no token)", async () => {
    const response = await acceptQuote({});

    expect(response.status).toBe(200);
    expect(db.quotes[0].status).toBe("accepted");
    expect(db.jobs[0].status).toBe("completed");
  });

  it("rejects a dispatcher from a different company", async () => {
    requireApiRoleMock.mockResolvedValue({
      profile: { id: DISPATCHER_ID, email: "other@example.com", company_id: OTHER_COMPANY_ID, role: "dispatcher" },
      response: null,
      supabase: createFakeSupabase(db),
    });

    const response = await acceptQuote({});

    expect(response.status).toBe(403);
    expect(db.quotes[0].status).toBe("sent");
    expect(db.jobs[0].status).toBe("quote_pending");
  });

  it("rejects a token minted for a different quote", async () => {
    const token = generateQuoteApprovalToken("99999999-9999-4999-8999-999999999999");

    const response = await acceptQuote({ token });

    expect(response.status).toBe(403);
    expect(db.quotes[0].status).toBe("sent");
  });

  it("rejects an invalid or garbage token", async () => {
    const response = await acceptQuote({ token: "not-a-real-token" });

    expect(response.status).toBe(401);
    expect(db.quotes[0].status).toBe("sent");
  });

  it("rejects an actually expired token", async () => {
    const jwt = (await import("jsonwebtoken")).default;
    const expiredToken = jwt.sign({ quoteId: QUOTE_ID }, process.env.QUOTE_TOKEN_SECRET!, { expiresIn: -1 });

    const response = await acceptQuote({ token: expiredToken });

    expect(response.status).toBe(401);
    expect(db.quotes[0].status).toBe("sent");
    expect(db.jobs[0].status).toBe("quote_pending");
  });

  it("rejects a quote that is not in 'sent' status", async () => {
    db.quotes[0].status = "accepted";

    const response = await acceptQuote({});

    expect(response.status).toBe(409);
    expect(db.jobs[0].status).toBe("quote_pending");
  });

  it("still completes the job when payment-provider invoice creation fails (non-fatal)", async () => {
    stubProvider.createInvoice.mockRejectedValue(new Error("Square unavailable"));

    const response = await acceptQuote({});

    expect(response.status).toBe(200);
    expect(db.quotes[0].status).toBe("accepted");
    expect(db.jobs[0].status).toBe("completed");
    // No invoice URL was produced, so only the status SMS should queue, not the invoice SMS.
    expect(queueCustomerStatusSmsMock).toHaveBeenCalledTimes(1);
    expect(queueCustomerInvoiceSmsMock).not.toHaveBeenCalled();
  });
});
