/**
 * Behavior coverage for quote template update/soft-delete (issue #62):
 * company-scoped existence check, partial patch construction, and the
 * DELETE path's is_active=false soft delete (no hard delete exists).
 *
 * The `quote_templates` table fake filters by the `.eq()` predicates it's
 * given rather than returning a canned response, with a real
 * different-company fixture at the *same* template id, so the 404/isolation
 * assertions fail if the route's `company_id` scoping is ever dropped or
 * changed (per PR #68 review).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const requireApiRoleMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  requireApiRole: requireApiRoleMock,
}));

type Row = Record<string, unknown>;
type Predicate = (row: Row) => boolean;

const COMPANY_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_COMPANY_ID = "88888888-8888-4888-8888-888888888888";
const TEMPLATE_ID = "55555555-5555-4555-8555-555555555555";
const ADMIN_ID = "99999999-9999-4999-8999-999999999999";

function forbiddenResponse() {
  return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
}

function adminProfile() {
  return { id: ADMIN_ID, email: "admin@example.com", company_id: COMPANY_ID, role: "admin" as const };
}

function makeSelectBuilder(getRows: () => Row[]) {
  const predicates: Predicate[] = [];
  const builder = {
    eq(column: string, value: unknown) {
      predicates.push((row) => row[column] === value);
      return builder;
    },
    single: async () => {
      const row = getRows().find((r) => predicates.every((p) => p(r)));
      return row ? { data: row, error: null } : { data: null, error: { message: "no rows" } };
    },
  };
  return builder;
}

function makeUpdateBuilder(getRows: () => Row[], patch: Row, forcedError: { message: string } | null = null) {
  const predicates: Predicate[] = [];
  const builder = {
    eq(column: string, value: unknown) {
      predicates.push((row) => row[column] === value);
      return builder;
    },
    select() {
      return {
        single: async () => {
          if (forcedError) return { data: null, error: forcedError };
          const row = getRows().find((r) => predicates.every((p) => p(r)));
          if (!row) return { data: null, error: { message: "no rows" } };
          Object.assign(row, patch);
          return { data: { ...row }, error: null };
        },
      };
    },
  };
  return builder;
}

function freshTemplates(): Row[] {
  return [
    { id: TEMPLATE_ID, company_id: COMPANY_ID, name: "AC Repair", is_active: true },
    // Same template id, different company -- proves the route's
    // .eq('id', id).eq('company_id', profile.company_id) is doing the
    // excluding, not just an id match.
    { id: TEMPLATE_ID, company_id: OTHER_COMPANY_ID, name: "Rival's AC Repair", is_active: true },
  ];
}

function supabaseWithTemplates(templates: Row[], forcedError: { message: string } | null = null) {
  return {
    from: () => ({
      select: () => makeSelectBuilder(() => templates),
      update: (patch: Row) => makeUpdateBuilder(() => templates, patch, forcedError),
    }),
  };
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

  it("returns 404 when a same-id template exists but belongs to another company", async () => {
    requireApiRoleMock.mockResolvedValue({
      profile: adminProfile(),
      response: null,
      // Only the OTHER_COMPANY_ID row (same TEMPLATE_ID) exists -- proves
      // the route's own company_id filter excludes it, not a canned 404.
      supabase: supabaseWithTemplates(freshTemplates().filter((t) => t.company_id === OTHER_COMPANY_ID)),
    });

    const response = await patchTemplate({ name: "New Name" });

    expect(response.status).toBe(404);
  });

  it("rejects invalid JSON", async () => {
    requireApiRoleMock.mockResolvedValue({
      profile: adminProfile(),
      response: null,
      supabase: supabaseWithTemplates(freshTemplates()),
    });

    const response = await patchTemplate(undefined, "{not-json");

    expect(response.status).toBe(400);
  });

  it("builds a partial patch from only the provided fields, updating only the caller's own row", async () => {
    const templates = freshTemplates();
    requireApiRoleMock.mockResolvedValue({
      profile: adminProfile(),
      response: null,
      supabase: supabaseWithTemplates(templates),
    });

    const response = await patchTemplate({ isActive: false });
    const body = (await response.json()) as { template: Record<string, unknown> };

    expect(response.status).toBe(200);
    expect(body.template.id).toBe(TEMPLATE_ID);
    expect(body.template.is_active).toBe(false);
    // The other company's same-id row must be untouched.
    const other = templates.find((t) => t.company_id === OTHER_COMPANY_ID)!;
    expect(other.is_active).toBe(true);
  });

  it("returns 500 when the update fails", async () => {
    requireApiRoleMock.mockResolvedValue({
      profile: adminProfile(),
      response: null,
      supabase: supabaseWithTemplates(freshTemplates(), { message: "constraint" }),
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
