/**
 * Representative "dispatcher attempts admin-only operation -> denied" pair
 * for issue #49. Also regression-covers this route's migration from the
 * retired requireRole()/withCompany.ts helper to the canonical
 * requireApiRole().
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

async function getTechnicians() {
  const { GET } = await import("./route");
  return GET();
}

describe("GET /api/admin/technicians - authorization", () => {
  beforeEach(() => {
    requireApiRoleMock.mockReset();
  });

  it("denies a dispatcher listing technicians", async () => {
    requireApiRoleMock.mockResolvedValue({ profile: null, response: forbiddenResponse(), supabase: null });

    const response = await getTechnicians();

    expect(response.status).toBe(403);
  });

  it("allows an admin to list technicians", async () => {
    requireApiRoleMock.mockResolvedValue({
      profile: { id: ADMIN_ID, email: "admin@example.com", company_id: COMPANY_ID, role: "admin" },
      response: null,
      supabase: {
        from: () => ({
          select: () => ({ eq: () => ({ order: async () => ({ data: [], error: null }) }) }),
        }),
      },
    });

    const response = await getTechnicians();

    expect(response.status).toBe(200);
    expect(requireApiRoleMock).toHaveBeenCalledWith(["admin"]);
  });
});
