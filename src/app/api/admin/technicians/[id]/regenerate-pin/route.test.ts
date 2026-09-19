/**
 * Behavior coverage for technician PIN regeneration (issue #62):
 * company-scoped technician lookup, the linked-auth-account guard, and the
 * Supabase Auth password update.
 *
 * The `technicians` table fake filters by the `.eq()` predicates it's
 * given, with a real different-company fixture at the *same* technician
 * id, so the 404 assertion fails if the route's `company_id` scoping is
 * ever dropped or changed (per PR #68 review).
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

type Row = Record<string, unknown>;
type Predicate = (row: Row) => boolean;

const COMPANY_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_COMPANY_ID = "88888888-8888-4888-8888-888888888888";
const TECH_ID = "44444444-4444-4444-8444-444444444444";
const ADMIN_ID = "99999999-9999-4999-8999-999999999999";
const AUTH_USER_ID = "66666666-6666-4666-8666-666666666666";
const OTHER_AUTH_USER_ID = "77777777-7777-4777-8777-777777777777";

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

function supabaseWithTechnicians(technicians: Row[]) {
  return {
    from: () => ({
      select: () => makeSelectBuilder(() => technicians),
    }),
  };
}

function technicianFixtures(): Row[] {
  return [
    { id: TECH_ID, company_id: COMPANY_ID, auth_user_id: AUTH_USER_ID },
    // Same technician id, different company -- proves the route's own
    // company_id filter excludes it, not a canned 404.
    { id: TECH_ID, company_id: OTHER_COMPANY_ID, auth_user_id: OTHER_AUTH_USER_ID },
  ];
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

  it("returns 404 when a same-id technician exists but belongs to another company", async () => {
    requireApiRoleMock.mockResolvedValue({
      profile: adminProfile(),
      response: null,
      // Only the OTHER_COMPANY_ID row (same TECH_ID) exists -- proves the
      // route's own company_id filter excludes it, not a canned 404.
      supabase: supabaseWithTechnicians(technicianFixtures().filter((t) => t.company_id === OTHER_COMPANY_ID)),
    });

    const response = await regeneratePin();

    expect(response.status).toBe(404);
    expect(updateUserByIdMock).not.toHaveBeenCalled();
  });

  it("returns 422 when the caller's own technician has no linked auth account", async () => {
    requireApiRoleMock.mockResolvedValue({
      profile: adminProfile(),
      response: null,
      supabase: supabaseWithTechnicians([{ id: TECH_ID, company_id: COMPANY_ID, auth_user_id: null }]),
    });

    const response = await regeneratePin();

    expect(response.status).toBe(422);
    expect(updateUserByIdMock).not.toHaveBeenCalled();
  });

  it("returns 500 when the Supabase Auth password update fails", async () => {
    requireApiRoleMock.mockResolvedValue({
      profile: adminProfile(),
      response: null,
      supabase: supabaseWithTechnicians(technicianFixtures()),
    });
    updateUserByIdMock.mockResolvedValue({ error: { message: "auth service down" } });

    const response = await regeneratePin();

    expect(response.status).toBe(500);
  });

  it("generates a new PIN and updates only the caller's own technician's linked auth user", async () => {
    requireApiRoleMock.mockResolvedValue({
      profile: adminProfile(),
      response: null,
      supabase: supabaseWithTechnicians(technicianFixtures()),
    });
    updateUserByIdMock.mockResolvedValue({ error: null });

    const response = await regeneratePin();
    const body = (await response.json()) as { pin: string };

    expect(response.status).toBe(200);
    expect(body.pin).toBe("4242");
    // Must target COMPANY_ID's own auth user, never the other company's
    // same-id technician's auth user.
    expect(updateUserByIdMock).toHaveBeenCalledWith(AUTH_USER_ID, { password: "4242" });
    expect(updateUserByIdMock).not.toHaveBeenCalledWith(OTHER_AUTH_USER_ID, expect.anything());
  });
});
