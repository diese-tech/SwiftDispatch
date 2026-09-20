/**
 * Behavior coverage for the company close_status update (issue #63 coverage
 * audit): this route had zero tests despite being in docs/AUTHORIZATION.md's
 * matrix as admin-only.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const requireApiRoleMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  requireApiRole: requireApiRoleMock,
}));

const COMPANY_ID = "11111111-1111-4111-8111-111111111111";
const ADMIN_ID = "99999999-9999-4999-8999-999999999999";

function forbiddenResponse() {
  return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
}

function adminProfile() {
  return { id: ADMIN_ID, email: "admin@example.com", company_id: COMPANY_ID, role: "admin" as const };
}

async function patchCompany(body: unknown, rawBody?: string) {
  const { PATCH } = await import("./route");
  return PATCH(
    new Request("http://localhost/api/company", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: rawBody ?? JSON.stringify(body),
    }),
  );
}

describe("PATCH /api/company", () => {
  beforeEach(() => {
    requireApiRoleMock.mockReset();
  });

  it("denies a dispatcher", async () => {
    requireApiRoleMock.mockResolvedValue({ profile: null, response: forbiddenResponse(), supabase: null });

    const response = await patchCompany({ close_status: "contacted" });

    expect(response.status).toBe(403);
    expect(requireApiRoleMock).toHaveBeenCalledWith(["admin"]);
  });

  it("rejects a missing close_status", async () => {
    requireApiRoleMock.mockResolvedValue({ profile: adminProfile(), response: null, supabase: {} });

    const response = await patchCompany({});

    expect(response.status).toBe(400);
  });

  it("rejects a close_status outside the allowed enum", async () => {
    requireApiRoleMock.mockResolvedValue({ profile: adminProfile(), response: null, supabase: {} });

    const response = await patchCompany({ close_status: "not-a-real-status" });

    expect(response.status).toBe(400);
  });

  it("updates the caller's own company, scoped by company_id", async () => {
    let updatePatch: Record<string, unknown> | undefined;
    const eqCalls: [string, unknown][] = [];
    requireApiRoleMock.mockResolvedValue({
      profile: adminProfile(),
      response: null,
      supabase: {
        from: () => ({
          update: (patch: Record<string, unknown>) => {
            updatePatch = patch;
            return {
              eq: (column: string, value: unknown) => {
                eqCalls.push([column, value]);
                return {
                  select: () => ({
                    single: async () => ({ data: { id: COMPANY_ID, close_status: patch.close_status }, error: null }),
                  }),
                };
              },
            };
          },
        }),
      },
    });

    const response = await patchCompany({ close_status: "demo_done" });
    const body = (await response.json()) as { company: Record<string, unknown> };

    expect(response.status).toBe(200);
    expect(updatePatch).toEqual({ close_status: "demo_done" });
    expect(eqCalls).toEqual([["id", COMPANY_ID]]);
    expect(body.company).toEqual({ id: COMPANY_ID, close_status: "demo_done" });
  });

  it("returns 400 when the update fails", async () => {
    requireApiRoleMock.mockResolvedValue({
      profile: adminProfile(),
      response: null,
      supabase: {
        from: () => ({
          update: () => ({
            eq: () => ({
              select: () => ({ single: async () => ({ data: null, error: { message: "db error" } }) }),
            }),
          }),
        }),
      },
    });

    const response = await patchCompany({ close_status: "closed_won" });

    expect(response.status).toBe(400);
  });
});
