/**
 * Behavior coverage for quote template update/soft-delete (issue #62):
 * company-scoped existence check, partial patch construction, and the
 * DELETE path's is_active=false soft delete (no hard delete exists).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const requireApiRoleMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  requireApiRole: requireApiRoleMock,
}));

const COMPANY_ID = "11111111-1111-4111-8111-111111111111";
const TEMPLATE_ID = "55555555-5555-4555-8555-555555555555";
const ADMIN_ID = "99999999-9999-4999-8999-999999999999";

function forbiddenResponse() {
  return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
}

function adminProfile() {
  return { id: ADMIN_ID, email: "admin@example.com", company_id: COMPANY_ID, role: "admin" as const };
}

async function patchTemplate(body: unknown, rawBody?: string) {
  const { PATCH } = await import("./route");
  return PATCH(
    new Request(`http://localhost/api/admin/templates/${TEMPLATE_ID}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: rawBody ?? JSON.stringify(body),
    }),
    { params: Promise.resolve({ id: TEMPLATE_ID }) },
  );
}

async function deleteTemplate() {
  const { DELETE } = await import("./route");
  return DELETE(new Request(`http://localhost/api/admin/templates/${TEMPLATE_ID}`, { method: "DELETE" }), {
    params: Promise.resolve({ id: TEMPLATE_ID }),
  });
}

describe("PATCH /api/admin/templates/[id]", () => {
  beforeEach(() => {
    requireApiRoleMock.mockReset();
  });

  it("denies a dispatcher", async () => {
    requireApiRoleMock.mockResolvedValue({ profile: null, response: forbiddenResponse(), supabase: null });

    const response = await patchTemplate({ name: "New Name" });

    expect(response.status).toBe(403);
  });

  it("returns 404 when the template doesn't belong to the caller's company", async () => {
    requireApiRoleMock.mockResolvedValue({
      profile: adminProfile(),
      response: null,
      supabase: {
        from: () => ({
          select: () => ({
            eq: () => ({ eq: () => ({ single: async () => ({ data: null, error: { message: "no rows" } }) }) }),
          }),
        }),
      },
    });

    const response = await patchTemplate({ name: "New Name" });

    expect(response.status).toBe(404);
  });

  it("rejects invalid JSON", async () => {
    requireApiRoleMock.mockResolvedValue({
      profile: adminProfile(),
      response: null,
      supabase: {
        from: () => ({
          select: () => ({
            eq: () => ({ eq: () => ({ single: async () => ({ data: { id: TEMPLATE_ID }, error: null }) }) }),
          }),
        }),
      },
    });

    const response = await patchTemplate(undefined, "{not-json");

    expect(response.status).toBe(400);
  });

  it("builds a partial patch from only the provided fields and returns the updated row", async () => {
    let updatePatch: Record<string, unknown> | undefined;
    requireApiRoleMock.mockResolvedValue({
      profile: adminProfile(),
      response: null,
      supabase: {
        from: () => ({
          select: () => ({
            eq: () => ({ eq: () => ({ single: async () => ({ data: { id: TEMPLATE_ID }, error: null }) }) }),
          }),
          update: (patch: Record<string, unknown>) => {
            updatePatch = patch;
            return {
              eq: () => ({
                eq: () => ({
                  select: () => ({
                    single: async () => ({ data: { id: TEMPLATE_ID, ...patch }, error: null }),
                  }),
                }),
              }),
            };
          },
        }),
      },
    });

    const response = await patchTemplate({ isActive: false });
    const body = (await response.json()) as { template: Record<string, unknown> };

    expect(response.status).toBe(200);
    expect(updatePatch).toEqual({ is_active: false });
    expect(body.template.id).toBe(TEMPLATE_ID);
  });

  it("returns 500 when the update fails", async () => {
    requireApiRoleMock.mockResolvedValue({
      profile: adminProfile(),
      response: null,
      supabase: {
        from: () => ({
          select: () => ({
            eq: () => ({ eq: () => ({ single: async () => ({ data: { id: TEMPLATE_ID }, error: null }) }) }),
          }),
          update: () => ({
            eq: () => ({
              eq: () => ({
                select: () => ({ single: async () => ({ data: null, error: { message: "constraint" } }) }),
              }),
            }),
          }),
        }),
      },
    });

    const response = await patchTemplate({ name: "New Name" });

    expect(response.status).toBe(500);
  });
});

describe("DELETE /api/admin/templates/[id]", () => {
  beforeEach(() => {
    requireApiRoleMock.mockReset();
  });

  it("denies a dispatcher", async () => {
    requireApiRoleMock.mockResolvedValue({ profile: null, response: forbiddenResponse(), supabase: null });

    const response = await deleteTemplate();

    expect(response.status).toBe(403);
  });

  it("soft-deletes by setting is_active to false, scoped to the caller's company", async () => {
    let updatePatch: Record<string, unknown> | undefined;
    const eqCalls: [string, unknown][] = [];
    requireApiRoleMock.mockResolvedValue({
      profile: adminProfile(),
      response: null,
      supabase: {
        from: () => ({
          update: (patch: Record<string, unknown>) => {
            updatePatch = patch;
            const builder = {
              eq: (column: string, value: unknown) => {
                eqCalls.push([column, value]);
                return builder;
              },
              then: (resolve: (value: { error: null }) => void) => resolve({ error: null }),
            };
            return builder;
          },
        }),
      },
    });

    const response = await deleteTemplate();
    const body = (await response.json()) as { ok: boolean };

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(updatePatch).toEqual({ is_active: false });
    expect(eqCalls).toEqual([
      ["id", TEMPLATE_ID],
      ["company_id", COMPANY_ID],
    ]);
  });

  it("returns 500 when the soft-delete fails", async () => {
    requireApiRoleMock.mockResolvedValue({
      profile: adminProfile(),
      response: null,
      supabase: {
        from: () => ({
          update: () => ({
            eq: () => ({
              eq: async () => ({ error: { message: "db error" } }),
            }),
          }),
        }),
      },
    });

    const response = await deleteTemplate();

    expect(response.status).toBe(500);
  });
});
