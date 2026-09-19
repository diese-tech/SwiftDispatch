/**
 * Stale-lease recovery for the SMS outbox job queue (issue #51). Mocks
 * @/lib/supabase/admin's createSupabaseAdminClient with an in-memory fake
 * query builder (eq/in/lte/order/limit, generalizing the filter-matching
 * pattern used by src/app/api/jobs/[id]/route.test.ts) and @/lib/twilio's
 * sendSms, so the claim/reclaim/backoff logic here is verified without a
 * live Postgres instance.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { processSmsOutboxBatch } from "../smsOutbox";

type Row = Record<string, unknown>;

const { sendSmsMock, createSupabaseAdminClientMock } = vi.hoisted(() => ({
  sendSmsMock: vi.fn(),
  createSupabaseAdminClientMock: vi.fn(),
}));

vi.mock("@/lib/twilio", () => ({
  sendSms: sendSmsMock,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => createSupabaseAdminClientMock(),
}));

type Filter =
  | { type: "eq"; column: string; value: unknown }
  | { type: "in"; column: string; values: unknown[] }
  | { type: "lte"; column: string; value: unknown };

function matchesFilters(row: Row, filters: Filter[]) {
  return filters.every((f) => {
    if (f.type === "eq") return row[f.column] === f.value;
    if (f.type === "in") return f.values.includes(row[f.column]);
    return (row[f.column] as string) <= (f.value as string);
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
    in(column: string, values: unknown[]) {
      filters.push({ type: "in", column, values });
      return builder;
    },
    lte(column: string, value: unknown) {
      filters.push({ type: "lte", column, value });
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
    then(resolve: (value: { data: Row[]; error: null }) => void) {
      let rows = getRows()
        .filter((r) => matchesFilters(r, filters))
        .map((r) => ({ ...r }));
      if (orderColumn) {
        const column = orderColumn;
        rows = rows.sort((a, b) => String(a[column]).localeCompare(String(b[column])));
      }
      if (limitN !== null) rows = rows.slice(0, limitN);
      resolve({ data: rows, error: null });
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
    in(column: string, values: unknown[]) {
      filters.push({ type: "in", column, values });
      return builder;
    },
    lte(column: string, value: unknown) {
      filters.push({ type: "lte", column, value });
      return builder;
    },
    select() {
      return {
        single: async () => {
          const row = applyAndFind();
          return row ? { data: { ...row }, error: null } : { data: null, error: { message: "Row not found" } };
        },
      };
    },
    // Supports markSent()/markRetry(), which await the eq-chain directly
    // with no .select() chained.
    then(resolve: (value: { data: null; error: null }) => void) {
      applyAndFind();
      resolve({ data: null, error: null });
    },
  };
  return builder;
}

function createFakeSupabase(rows: Row[]) {
  return {
    from(table: string) {
      if (table !== "sms_outbox") throw new Error(`Unexpected table in test double: ${table}`);
      return {
        select: () => makeSelectBuilder(() => rows),
        update: (patch: Row) => makeUpdateBuilder(() => rows, patch),
      };
    },
  };
}

const COMPANY_ID = "11111111-1111-4111-8111-111111111111";

let idCounter = 0;

function freshRow(overrides: Partial<Row> = {}): Row {
  idCounter += 1;
  const now = new Date().toISOString();
  return {
    id: `msg-${idCounter}`,
    company_id: COMPANY_ID,
    job_id: null,
    to_phone: "+15550000000",
    body: "hello",
    message_type: "status",
    dedupe_key: `dedupe-${idCounter}`,
    status: "pending",
    attempt_count: 0,
    max_attempts: 5,
    provider_message_id: null,
    last_error: null,
    available_at: now,
    locked_at: null,
    sent_at: null,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

function minutesAgo(n: number) {
  return new Date(Date.now() - n * 60_000).toISOString();
}

describe("processSmsOutboxBatch", () => {
  let rows: Row[];

  beforeEach(() => {
    rows = [];
    sendSmsMock.mockReset();
    createSupabaseAdminClientMock.mockReset();
    createSupabaseAdminClientMock.mockImplementation(() => createFakeSupabase(rows));
  });

  it("sends a pending message and marks it sent", async () => {
    rows.push(freshRow({ status: "pending" }));
    sendSmsMock.mockResolvedValue("SM123");

    const summary = await processSmsOutboxBatch();

    expect(summary).toMatchObject({ scanned: 1, processed: 1, staleReclaimed: 0, sent: 1, retried: 0, failed: 0 });
    expect(rows[0].status).toBe("sent");
    expect(rows[0].provider_message_id).toBe("SM123");
    expect(rows[0].locked_at).toBeNull();
  });

  it("moves a message to retrying on provider failure, advancing attempt_count and backoff", async () => {
    rows.push(freshRow({ status: "pending", attempt_count: 0, max_attempts: 5 }));
    sendSmsMock.mockRejectedValue(new Error("Twilio unavailable"));

    const before = Date.now();
    const summary = await processSmsOutboxBatch();

    expect(summary).toMatchObject({ processed: 1, sent: 0, retried: 1, failed: 0 });
    expect(rows[0].status).toBe("retrying");
    expect(rows[0].attempt_count).toBe(1);
    expect(rows[0].last_error).toBe("Twilio unavailable");
    expect(rows[0].locked_at).toBeNull();
    // backoffMs(1) === 30_000
    expect(new Date(rows[0].available_at as string).getTime()).toBeGreaterThanOrEqual(before + 29_000);
  });

  it("marks a message failed once retries are exhausted", async () => {
    rows.push(freshRow({ status: "retrying", attempt_count: 4, max_attempts: 5 }));
    sendSmsMock.mockRejectedValue(new Error("Twilio unavailable"));

    const summary = await processSmsOutboxBatch();

    expect(summary).toMatchObject({ processed: 1, sent: 0, retried: 0, failed: 1 });
    expect(rows[0].status).toBe("failed");
    expect(rows[0].attempt_count).toBe(5);
  });

  it("reclaims a stale processing row (locked_at past the lease) and sends it", async () => {
    rows.push(
      freshRow({
        status: "processing",
        locked_at: minutesAgo(10),
        attempt_count: 1,
        max_attempts: 5,
      }),
    );
    sendSmsMock.mockResolvedValue("SM999");

    const summary = await processSmsOutboxBatch();

    expect(summary).toMatchObject({ scanned: 1, processed: 1, staleReclaimed: 1, sent: 1 });
    expect(rows[0].status).toBe("sent");
    expect(rows[0].provider_message_id).toBe("SM999");
  });

  it("does not reclaim a processing row whose lease is still fresh", async () => {
    rows.push(freshRow({ status: "processing", locked_at: minutesAgo(1) }));

    const summary = await processSmsOutboxBatch();

    expect(summary).toMatchObject({ scanned: 0, processed: 0, staleReclaimed: 0, sent: 0 });
    expect(sendSmsMock).not.toHaveBeenCalled();
    expect(rows[0].status).toBe("processing");
  });

  it("stale recovery preserves attempt_count/max_attempts and continues the same backoff sequence on a subsequent failure", async () => {
    rows.push(
      freshRow({
        status: "processing",
        locked_at: minutesAgo(10),
        attempt_count: 2,
        max_attempts: 5,
      }),
    );
    sendSmsMock.mockRejectedValue(new Error("still down"));

    const summary = await processSmsOutboxBatch();

    expect(summary).toMatchObject({ staleReclaimed: 1, retried: 1, failed: 0 });
    // Reclaim doesn't reset attempt accounting -- markRetry advances from the
    // row's existing attempt_count, exactly as a normal (non-stale) retry does.
    expect(rows[0].attempt_count).toBe(3);
    expect(rows[0].max_attempts).toBe(5);
    expect(rows[0].status).toBe("retrying");
  });

  it("reports staleReclaimed distinctly from sent/retried/failed in the batch summary", async () => {
    rows.push(freshRow({ status: "pending", id: "fresh-1" }));
    rows.push(freshRow({ status: "processing", locked_at: minutesAgo(10), id: "stale-1" }));
    sendSmsMock.mockResolvedValue("SM1");

    const summary = await processSmsOutboxBatch();

    expect(summary.scanned).toBe(2);
    expect(summary.processed).toBe(2);
    expect(summary.staleReclaimed).toBe(1);
    expect(summary.sent).toBe(2);
  });

  it("only lets one of two concurrent reclaim attempts against the same stale row win", async () => {
    rows.push(
      freshRow({
        status: "processing",
        locked_at: minutesAgo(10),
        id: "race-1",
      }),
    );

    // Both calls race the same underlying rows array. The fake's update
    // builder applies its filter-match synchronously inside applyAndFind(),
    // mirroring how a real conditional UPDATE's WHERE clause re-evaluates
    // against the winner's already-committed state -- so the loser's eq()
    // for status === 'processing' matches zero rows once the winner's write
    // has landed.
    const supabase = createFakeSupabase(rows);
    const claim = () =>
      supabase
        .from("sms_outbox")
        .update({ status: "processing", locked_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", "race-1")
        .eq("status", "processing")
        .lte("locked_at", minutesAgo(5))
        .select()
        .single();

    const [first, second] = await Promise.all([claim(), claim()]);
    const results = [first, second];
    const winners = results.filter((r) => r.data !== null);
    const losers = results.filter((r) => r.data === null);

    expect(winners).toHaveLength(1);
    expect(losers).toHaveLength(1);
  });

  it("only lets one of two concurrent claimMessage-style attempts against the same pending row win", async () => {
    rows.push(freshRow({ status: "pending", id: "race-2" }));

    const supabase = createFakeSupabase(rows);
    const claim = () =>
      supabase
        .from("sms_outbox")
        .update({ status: "processing", locked_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", "race-2")
        .in("status", ["pending", "retrying"])
        .lte("available_at", new Date().toISOString())
        .select()
        .single();

    const [first, second] = await Promise.all([claim(), claim()]);
    const winners = [first, second].filter((r) => r.data !== null);
    const losers = [first, second].filter((r) => r.data === null);

    expect(winners).toHaveLength(1);
    expect(losers).toHaveLength(1);
  });
});
