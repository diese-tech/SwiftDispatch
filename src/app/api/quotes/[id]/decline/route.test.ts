/**
 * Behavior coverage for the customer-token-only quote decline path
 * (issue #58): validation, token verification, and the job/quote state
 * transition back to `in_progress`.
 */
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { generateQuoteApprovalToken } from "@/lib/quoteTokens";

beforeAll(() => {
  process.env.QUOTE_TOKEN_SECRET = "test-secret-for-vitest-only";
});

type Row = Record<string, unknown>;

const createSupabaseAdminClientMock = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => createSupabaseAdminClientMock(),
}));

function matchesFilters(row: Row, filters: [string, unknown][]) {
  return filters.every(([column, value]) => row[column] === value);
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
  };
  return builder;
}

function makeUpdateBuilder(getRows: () => Row[], patch: Row) {
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
    then(resolve: (value: { data: null; error: null }) => void) {
      applyAndFind();
      resolve({ data: null, error: null });
    },
  };
  return builder;
}

type Db = { quotes: Row[]; jobs: Row[] };

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
      if (table === "status_events") {
        return { insert: async () => ({ error: null }) };
      }
      throw new Error(`Unexpected table in test double: ${table}`);
    },
  };
}

const COMPANY_ID = "11111111-1111-4111-8111-111111111111";
const QUOTE_ID = "22222222-2222-4222-8222-222222222222";
const JOB_ID = "33333333-3333-4333-8333-333333333333";

function freshDb(): Db {
  return {
    quotes: [{ id: QUOTE_ID, status: "sent", job_id: JOB_ID }],
    jobs: [{ id: JOB_ID, status: "quote_pending", company_id: COMPANY_ID }],
  };
}

async function declineQuote(body: Record<string, unknown>) {
  const { POST } = await import("./route");
  return POST(
    new Request(`http://localhost/api/quotes/${QUOTE_ID}/decline`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id: QUOTE_ID }) },
  );
}

describe("POST /api/quotes/[id]/decline", () => {
  let db: Db;

  beforeEach(() => {
    db = freshDb();
    createSupabaseAdminClientMock.mockReset();
    createSupabaseAdminClientMock.mockImplementation(() => createFakeSupabase(db));
  });

  it("declines with a valid token", async () => {
    const token = generateQuoteApprovalToken(QUOTE_ID);

    const response = await declineQuote({ token, reason: "Too expensive" });

    expect(response.status).toBe(200);
    expect(db.quotes[0].status).toBe("declined");
    expect(db.quotes[0].decline_reason).toBe("Too expensive");
    expect(db.jobs[0].status).toBe("in_progress");
  });

  it("rejects a missing token (zod validation)", async () => {
    const response = await declineQuote({ reason: "no token here" });

    expect(response.status).toBe(400);
    const body = (await response.json()) as { error?: string; fields?: Record<string, unknown> };
    expect(body.fields).toHaveProperty("token");
    expect(db.quotes[0].status).toBe("sent");
  });

  it("rejects a token minted for a different quote", async () => {
    const token = generateQuoteApprovalToken("99999999-9999-4999-8999-999999999999");

    const response = await declineQuote({ token });

    expect(response.status).toBe(403);
    expect(db.quotes[0].status).toBe("sent");
  });

  it("rejects an invalid or garbage token", async () => {
    const response = await declineQuote({ token: "garbage" });

    expect(response.status).toBe(401);
    expect(db.quotes[0].status).toBe("sent");
  });

  it("rejects an actually expired token", async () => {
    const jwt = (await import("jsonwebtoken")).default;
    const expiredToken = jwt.sign({ quoteId: QUOTE_ID }, process.env.QUOTE_TOKEN_SECRET!, { expiresIn: -1 });

    const response = await declineQuote({ token: expiredToken });

    expect(response.status).toBe(401);
    expect(db.quotes[0].status).toBe("sent");
    expect(db.jobs[0].status).toBe("quote_pending");
  });

  it("rejects a quote that is not in 'sent' status", async () => {
    db.quotes[0].status = "declined";
    const token = generateQuoteApprovalToken(QUOTE_ID);

    const response = await declineQuote({ token });

    expect(response.status).toBe(409);
    expect(db.jobs[0].status).toBe("quote_pending");
  });
});
