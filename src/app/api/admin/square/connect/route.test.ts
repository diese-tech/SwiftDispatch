/**
 * Behavior coverage for the Square OAuth connect kickoff (issue #62): role
 * gating, the missing-OAuth-config guard, and the signed-state redirect.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const requireApiRoleMock = vi.fn();
const hasSquareOAuthConfigMock = vi.fn();
const buildSquareAuthorizeUrlMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  requireApiRole: requireApiRoleMock,
}));

vi.mock("@/lib/square", () => ({
  hasSquareOAuthConfig: hasSquareOAuthConfigMock,
  buildSquareAuthorizeUrl: buildSquareAuthorizeUrlMock,
}));

const COMPANY_ID = "11111111-1111-4111-8111-111111111111";
const ADMIN_ID = "99999999-9999-4999-8999-999999999999";

function forbiddenResponse() {
  return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
}

async function connect() {
  const { GET } = await import("./route");
  return GET(new Request("http://localhost/api/admin/square/connect"));
}

describe("GET /api/admin/square/connect", () => {
  beforeEach(() => {
    requireApiRoleMock.mockReset();
    hasSquareOAuthConfigMock.mockReset();
    buildSquareAuthorizeUrlMock.mockReset();
  });

  it("redirects to settings with square=forbidden when the caller isn't an admin", async () => {
    requireApiRoleMock.mockResolvedValue({ profile: null, response: forbiddenResponse(), supabase: null });

    const response = await connect();

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/admin/settings?square=forbidden");
    expect(buildSquareAuthorizeUrlMock).not.toHaveBeenCalled();
  });

  it("redirects with square=not-configured when Square OAuth env vars are missing", async () => {
    requireApiRoleMock.mockResolvedValue({
      profile: { id: ADMIN_ID, email: "admin@example.com", company_id: COMPANY_ID, role: "admin" },
      response: null,
      supabase: {},
    });
    hasSquareOAuthConfigMock.mockReturnValue(false);

    const response = await connect();

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/admin/settings?square=not-configured");
    expect(buildSquareAuthorizeUrlMock).not.toHaveBeenCalled();
  });

  it("redirects to the Square authorize URL, signing the caller's identity into the state", async () => {
    requireApiRoleMock.mockResolvedValue({
      profile: { id: ADMIN_ID, email: "admin@example.com", company_id: COMPANY_ID, role: "admin" },
      response: null,
      supabase: {},
    });
    hasSquareOAuthConfigMock.mockReturnValue(true);
    buildSquareAuthorizeUrlMock.mockReturnValue("https://connect.squareupsandbox.com/oauth2/authorize?state=signed");

    const response = await connect();

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://connect.squareupsandbox.com/oauth2/authorize?state=signed",
    );
    expect(buildSquareAuthorizeUrlMock).toHaveBeenCalledWith({
      companyId: COMPANY_ID,
      userId: ADMIN_ID,
      returnTo: "/admin/settings",
    });
  });
});
