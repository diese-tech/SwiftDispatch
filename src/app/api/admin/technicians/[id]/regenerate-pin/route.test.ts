/**
 * Behavior coverage for technician PIN regeneration (issue #62):
 * company-scoped technician lookup, the linked-auth-account guard, and the
 * Supabase Auth password update.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const requireApiRoleMock = vi.fn();
const updateUserByIdMock = vi.fn();
const generatePinMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  requireApiRole: requireApiRoleMock,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => ({
    auth: { admin: { updateUserById: updateUserByIdMock } },
  }),
}));

vi.mock("@/lib/techAuth", () => ({
  generatePin: generatePinMock,
}));

const COMPANY_ID = "11111111-1111-4111-8111-111111111111";
const TECH_ID = "44444444-4444-4444-8444-444444444444";
const ADMIN_ID = "99999999-9999-4999-8999-999999999999";
const AUTH_USER_ID = "66666666-6666-4666-8666-666666666666";

function forbiddenResponse() {
  return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
}

function adminProfile() {
  return { id: ADMIN_ID, email: "admin@example.com", company_id: COMPANY_ID, role: "admin" as const };
}

function supabaseWithTechnician(tech: Record<string, unknown> | null) {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({ eq: () => ({ single: async () => (tech ? { data: tech, error: null } : { data: null, error: { message: "no rows" } }) }) }),
      }),
    }),
  };
}

async function regeneratePin() {
  const { POST } = await import("./route");
  return POST(new Request(`http://localhost/api/admin/technicians/${TECH_ID}/regenerate-pin`, { method: "POST" }), {
    params: Promise.resolve({ id: TECH_ID }),
  });
}

describe("POST /api/admin/technicians/[id]/regenerate-pin", () => {
  beforeEach(() => {
    requireApiRoleMock.mockReset();
    updateUserByIdMock.mockReset();
    generatePinMock.mockReset();
    generatePinMock.mockReturnValue("4242");
  });

  it("denies a dispatcher", async () => {
    requireApiRoleMock.mockResolvedValue({ profile: null, response: forbiddenResponse(), supabase: null });

    const response = await regeneratePin();

    expect(response.status).toBe(403);
    expect(updateUserByIdMock).not.toHaveBeenCalled();
  });

  it("returns 404 when the technician doesn't belong to the caller's company", async () => {
    requireApiRoleMock.mockResolvedValue({
      profile: adminProfile(),
      response: null,
      supabase: supabaseWithTechnician(null),
    });

    const response = await regeneratePin();

    expect(response.status).toBe(404);
    expect(updateUserByIdMock).not.toHaveBeenCalled();
  });

  it("returns 422 when the technician has no linked auth account", async () => {
    requireApiRoleMock.mockResolvedValue({
      profile: adminProfile(),
      response: null,
      supabase: supabaseWithTechnician({ id: TECH_ID, auth_user_id: null }),
    });

    const response = await regeneratePin();

    expect(response.status).toBe(422);
    expect(updateUserByIdMock).not.toHaveBeenCalled();
  });

  it("returns 500 when the Supabase Auth password update fails", async () => {
    requireApiRoleMock.mockResolvedValue({
      profile: adminProfile(),
      response: null,
      supabase: supabaseWithTechnician({ id: TECH_ID, auth_user_id: AUTH_USER_ID }),
    });
    updateUserByIdMock.mockResolvedValue({ error: { message: "auth service down" } });

    const response = await regeneratePin();

    expect(response.status).toBe(500);
  });

  it("generates a new PIN and updates the linked auth user's password", async () => {
    requireApiRoleMock.mockResolvedValue({
      profile: adminProfile(),
      response: null,
      supabase: supabaseWithTechnician({ id: TECH_ID, auth_user_id: AUTH_USER_ID }),
    });
    updateUserByIdMock.mockResolvedValue({ error: null });

    const response = await regeneratePin();
    const body = (await response.json()) as { pin: string };

    expect(response.status).toBe(200);
    expect(body.pin).toBe("4242");
    expect(updateUserByIdMock).toHaveBeenCalledWith(AUTH_USER_ID, { password: "4242" });
  });
});
