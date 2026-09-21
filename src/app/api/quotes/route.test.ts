/**
 * Representative "quote mutation" authorization pair for issue #49:
 * dispatcher allowed, technician denied. requireApiRole()'s own correctness
 * (401/403/200 semantics) is unit-tested in src/lib/__tests__/auth.test.ts;
 * this proves the route actually calls it with the right allowed-role set
 * and respects a denial before touching the database.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const requireApiRoleMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  requireApiRole: requireApiRoleMock,
}));

const COMPANY_ID = "11111111-1111-4111-8111-111111111111";
const JOB_ID = "22222222-2222-4222-8222-222222222222";
const DISPATCHER_ID = "44444444-4444-4444-8444-444444444444";

function forbiddenResponse() {
  return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
}

function allowedDispatcherContext() {
  return {
    profile: { id: DISPATCHER_ID, email: "dispatcher@example.com", company_id: COMPANY_ID, role: "dispatcher" },
    response: null,
    supabase: {
      from: (table: string) => {
        if (table === "jobs") {
          return { select: () => ({ eq: () => ({ eq: () => ({ single: async () => ({ data: { id: JOB_ID }, error: null }) }) }) }) };
        }
        if (table === "quotes") {
          return {
            select: () => ({
              eq: () => ({ order: () => ({ limit: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }),
            }),
            insert: () => ({ select: () => ({ single: async () => ({ data: { id: "quote-1" }, error: null }) }) }),
          };
        }
        throw new Error(`Unexpected table in test double: ${table}`);
      },
    },
  };
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
    requireApiRoleMock.mockResolvedValue(allowedDispatcherContext());

    const response = await postQuote({ job_id: JOB_ID });

    expect(response.status).not.toBe(403);
    expect(requireApiRoleMock).toHaveBeenCalledWith(["dispatcher", "admin"]);
  });
});
