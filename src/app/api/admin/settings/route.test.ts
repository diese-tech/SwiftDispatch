/**
 * Behavior coverage for company settings read/update (issue #62): role
 * gating, slug-uniqueness validation, partial patch construction, and the
 * public Square connection projection.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const requireApiRoleMock = vi.fn();
const getPublicSquareConnectionMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  requireApiRole: requireApiRoleMock,
}));

vi.mock("@/lib/square", () => ({
  getPublicSquareConnection: getPublicSquareConnectionMock,
}));

const COMPANY_ID = "11111111-1111-4111-8111-111111111111";
const ADMIN_ID = "99999999-9999-4999-8999-999999999999";

function forbiddenResponse() {
  return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
}

function adminProfile() {
  return { id: ADMIN_ID, email: "admin@example.com", company_id: COMPANY_ID, role: "admin" as const };
}

async function getSettings() {
  const { GET } = await import("./route");
  return GET();
}

async function patchSettings(body: unknown, rawBody?: string) {
  const { PATCH } = await import("./route");
  return PATCH(
    new Request("http://localhost/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: rawBody ?? JSON.stringify(body),
    }),
  );
}

describe("GET /api/admin/settings", () => {
  beforeEach(() => {
    requireApiRoleMock.mockReset();
    getPublicSquareConnectionMock.mockReset();
    getPublicSquareConnectionMock.mockReturnValue({ connected: false });
  });

  it("denies a dispatcher", async () => {
    requireApiRoleMock.mockResolvedValue({ profile: null, response: forbiddenResponse(), supabase: null });

    const response = await getSettings();

    expect(response.status).toBe(403);
  });

  it("returns 404 when the company row can't be found", async () => {
    requireApiRoleMock.mockResolvedValue({
      profile: adminProfile(),
      response: null,
      supabase: {
        from: () => ({
          select: () => ({ eq: () => ({ single: async () => ({ data: null, error: { message: "no rows" } }) }) }),
        }),
      },
    });

    const response = await getSettings();

    expect(response.status).toBe(404);
  });

  it("returns the company scoped to the caller, with the public Square projection", async () => {
    const companyRow = {
      id: COMPANY_ID,
      name: "Acme HVAC",
      slug: "acme-hvac",
      timezone: "America/New_York",
      sms_sender_name: "Acme",
      payment_provider: "square",
      payment_config: { square: { connected: true } },
    };
    requireApiRoleMock.mockResolvedValue({
      profile: adminProfile(),
      response: null,
      supabase: {
        from: () => ({
          select: () => ({ eq: () => ({ single: async () => ({ data: companyRow, error: null }) }) }),
        }),
      },
    });
    getPublicSquareConnectionMock.mockReturnValue({ connected: true });

    const response = await getSettings();
    const body = (await response.json()) as { company: Record<string, unknown> };

    expect(response.status).toBe(200);
    expect(body.company.square).toEqual({ connected: true });
    expect(getPublicSquareConnectionMock).toHaveBeenCalledWith(companyRow.payment_config);
  });
});

describe("PATCH /api/admin/settings", () => {
  beforeEach(() => {
    requireApiRoleMock.mockReset();
    getPublicSquareConnectionMock.mockReset();
    getPublicSquareConnectionMock.mockReturnValue({ connected: false });
  });

  it("denies a dispatcher", async () => {
    requireApiRoleMock.mockResolvedValue({ profile: null, response: forbiddenResponse(), supabase: null });

    const response = await patchSettings({ name: "New Name" });

    expect(response.status).toBe(403);
  });

  it("rejects invalid JSON", async () => {
    requireApiRoleMock.mockResolvedValue({ profile: adminProfile(), response: null, supabase: {} });

    const response = await patchSettings(undefined, "{not-json");

    expect(response.status).toBe(400);
  });

  it("rejects an empty name", async () => {
    requireApiRoleMock.mockResolvedValue({ profile: adminProfile(), response: null, supabase: {} });

    const response = await patchSettings({ name: "   " });

    expect(response.status).toBe(400);
  });

  it("rejects an empty slug", async () => {
    requireApiRoleMock.mockResolvedValue({ profile: adminProfile(), response: null, supabase: {} });

    const response = await patchSettings({ slug: "   " });

    expect(response.status).toBe(400);
  });

  it("rejects a slug already taken by another company", async () => {
    requireApiRoleMock.mockResolvedValue({
      profile: adminProfile(),
      response: null,
      supabase: {
        from: () => ({
          select: () => ({
            eq: () => ({ neq: () => ({ maybeSingle: async () => ({ data: { id: "other-company" }, error: null }) }) }),
          }),
        }),
      },
    });

    const response = await patchSettings({ slug: "taken-slug" });

    expect(response.status).toBe(409);
  });

  it("normalizes the slug, truncates smsSenderName, and writes only provided fields", async () => {
    let updatePatch: Record<string, unknown> | undefined;
    requireApiRoleMock.mockResolvedValue({
      profile: adminProfile(),
      response: null,
      supabase: {
        from: () => ({
          select: () => ({
            eq: () => ({ neq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
          }),
          update: (patch: Record<string, unknown>) => {
            updatePatch = patch;
            return {
              eq: () => ({
                select: () => ({
                  maybeSingle: async () => ({ data: { id: COMPANY_ID, ...patch }, error: null }),
                }),
              }),
            };
          },
        }),
      },
    });

    const response = await patchSettings({
      slug: "  My New Slug  ",
      smsSenderName: "This Name Is Definitely Way Too Long For Twenty Chars",
      paymentProvider: "stripe",
    });
    const body = (await response.json()) as { company: Record<string, unknown> };

    expect(response.status).toBe(200);
    expect(updatePatch).toEqual({
      slug: "my-new-slug",
      sms_sender_name: "This Name Is Definit",
      payment_provider: "stripe",
    });
    expect(body.company.id).toBe(COMPANY_ID);
  });

  it("returns 404 when the update targets no row (company not found)", async () => {
    requireApiRoleMock.mockResolvedValue({
      profile: adminProfile(),
      response: null,
      supabase: {
        from: () => ({
          update: () => ({
            eq: () => ({ select: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
          }),
        }),
      },
    });

    const response = await patchSettings({ timezone: "America/Chicago" });

    expect(response.status).toBe(404);
  });

  it("returns 500 when the update fails", async () => {
    requireApiRoleMock.mockResolvedValue({
      profile: adminProfile(),
      response: null,
      supabase: {
        from: () => ({
          update: () => ({
            eq: () => ({ select: () => ({ maybeSingle: async () => ({ data: null, error: { message: "db error" } }) }) }),
          }),
        }),
      },
    });

    const response = await patchSettings({ timezone: "America/Chicago" });

    expect(response.status).toBe(500);
  });
});
