/**
 * Behavior coverage for quote templates list/create (issue #62): the
 * dispatcher-readable/admin-writable role split and creation validation.
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

async function listTemplates() {
  const { GET } = await import("./route");
  return GET();
}

async function createTemplate(body: unknown, rawBody?: string) {
  const { POST } = await import("./route");
  return POST(
    new Request("http://localhost/api/admin/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: rawBody ?? JSON.stringify(body),
    }),
  );
}

describe("GET /api/admin/templates", () => {
  beforeEach(() => {
    requireApiRoleMock.mockReset();
  });

  it("denies a technician", async () => {
    requireApiRoleMock.mockResolvedValue({ profile: null, response: forbiddenResponse(), supabase: null });

    const response = await listTemplates();

    expect(response.status).toBe(403);
  });

  it("allows a dispatcher to list active templates for their company", async () => {
    const rows = [{ id: "template-1", name: "AC Repair" }];
    requireApiRoleMock.mockResolvedValue({
      profile: { id: "dispatcher-1", email: "d@example.com", company_id: COMPANY_ID, role: "dispatcher" },
      response: null,
      supabase: {
        from: () => ({
          select: () => ({
            eq: () => ({ eq: () => ({ order: async () => ({ data: rows, error: null }) }) }),
          }),
        }),
      },
    });

    const response = await listTemplates();
    const body = (await response.json()) as { templates: unknown[] };

    expect(response.status).toBe(200);
    expect(body.templates).toEqual(rows);
    expect(requireApiRoleMock).toHaveBeenCalledWith(["admin", "dispatcher"]);
  });
});

describe("POST /api/admin/templates", () => {
  beforeEach(() => {
    requireApiRoleMock.mockReset();
  });

  it("denies a dispatcher from creating a template", async () => {
    requireApiRoleMock.mockResolvedValue({ profile: null, response: forbiddenResponse(), supabase: null });

    const response = await createTemplate({ name: "AC Repair", lineItems: [{ description: "Filter" }] });

    expect(response.status).toBe(403);
  });

  it("rejects invalid JSON", async () => {
    requireApiRoleMock.mockResolvedValue({ profile: adminProfile(), response: null, supabase: {} });

    const response = await createTemplate(undefined, "{not-json");

    expect(response.status).toBe(400);
  });

  it("rejects a missing name", async () => {
    requireApiRoleMock.mockResolvedValue({ profile: adminProfile(), response: null, supabase: {} });

    const response = await createTemplate({ lineItems: [{ description: "Filter" }] });

    expect(response.status).toBe(400);
  });

  it("rejects an empty lineItems array", async () => {
    requireApiRoleMock.mockResolvedValue({ profile: adminProfile(), response: null, supabase: {} });

    const response = await createTemplate({ name: "AC Repair", lineItems: [] });

    expect(response.status).toBe(400);
  });

  it("creates a company-scoped active template", async () => {
    let insertedRow: Record<string, unknown> | undefined;
    requireApiRoleMock.mockResolvedValue({
      profile: adminProfile(),
      response: null,
      supabase: {
        from: () => ({
          insert: (row: Record<string, unknown>) => {
            insertedRow = row;
            return {
              select: () => ({
                single: async () => ({ data: { id: "template-1", ...row }, error: null }),
              }),
            };
          },
        }),
      },
    });

    const response = await createTemplate({
      name: "  AC Repair  ",
      lineItems: [{ description: "Filter", qty: 1 }],
      estimatedDurationMinutes: 90,
    });
    const body = (await response.json()) as { template: Record<string, unknown> };

    expect(response.status).toBe(200);
    expect(insertedRow).toEqual({
      company_id: COMPANY_ID,
      name: "AC Repair",
      line_items: [{ description: "Filter", qty: 1 }],
      estimated_duration_minutes: 90,
      is_active: true,
    });
    expect(body.template.id).toBe("template-1");
  });

  it("returns 500 when the insert fails", async () => {
    requireApiRoleMock.mockResolvedValue({
      profile: adminProfile(),
      response: null,
      supabase: {
        from: () => ({
          insert: () => ({
            select: () => ({
              single: async () => ({ data: null, error: { message: "constraint violation" } }),
            }),
          }),
        }),
      },
    });

    const response = await createTemplate({ name: "AC Repair", lineItems: [{ description: "Filter" }] });

    expect(response.status).toBe(500);
  });
});
