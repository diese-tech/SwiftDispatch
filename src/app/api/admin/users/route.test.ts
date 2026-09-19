/**
 * Behavior coverage for admin user invitation (issue #62): role gating,
 * validation, and the two-step write (Supabase Auth invite, then the
 * company-scoped `users` row) including partial-failure handling.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const requireApiRoleMock = vi.fn();
const inviteUserByEmailMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  requireApiRole: requireApiRoleMock,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => ({
    auth: { admin: { inviteUserByEmail: inviteUserByEmailMock } },
  }),
}));

const COMPANY_ID = "11111111-1111-4111-8111-111111111111";
const ADMIN_ID = "99999999-9999-4999-8999-999999999999";
const INVITED_USER_ID = "22222222-2222-4222-8222-222222222222";

function forbiddenResponse() {
  return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
}

function adminProfile() {
  return { id: ADMIN_ID, email: "admin@example.com", company_id: COMPANY_ID, role: "admin" as const };
}

async function listUsers() {
  const { GET } = await import("./route");
  return GET();
}

async function inviteUser(body: unknown, rawBody?: string) {
  const { POST } = await import("./route");
  return POST(
    new Request("http://localhost/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: rawBody ?? JSON.stringify(body),
    }),
  );
}

describe("GET /api/admin/users", () => {
  beforeEach(() => {
    requireApiRoleMock.mockReset();
  });

  it("denies a non-admin", async () => {
    requireApiRoleMock.mockResolvedValue({ profile: null, response: forbiddenResponse(), supabase: null });

    const response = await listUsers();

    expect(response.status).toBe(403);
  });

  it("returns the company's users plus the caller's own id", async () => {
    const rows = [{ id: ADMIN_ID, email: "admin@example.com", role: "admin" }];
    requireApiRoleMock.mockResolvedValue({
      profile: adminProfile(),
      response: null,
      supabase: {
        from: () => ({
          select: () => ({ eq: () => ({ order: async () => ({ data: rows, error: null }) }) }),
        }),
      },
    });

    const response = await listUsers();
    const body = (await response.json()) as { currentUserId: string; users: unknown[] };

    expect(response.status).toBe(200);
    expect(body.currentUserId).toBe(ADMIN_ID);
    expect(body.users).toEqual(rows);
  });
});

describe("POST /api/admin/users", () => {
  let insertedRows: Record<string, unknown>[];

  beforeEach(() => {
    requireApiRoleMock.mockReset();
    inviteUserByEmailMock.mockReset();
    insertedRows = [];
    requireApiRoleMock.mockResolvedValue({
      profile: adminProfile(),
      response: null,
      supabase: {
        from: () => ({
          insert: async (row: Record<string, unknown>) => {
            insertedRows.push(row);
            return { error: null };
          },
        }),
      },
    });
  });

  it("denies a non-admin", async () => {
    requireApiRoleMock.mockResolvedValue({ profile: null, response: forbiddenResponse(), supabase: null });

    const response = await inviteUser({ email: "new@example.com" });

    expect(response.status).toBe(403);
    expect(inviteUserByEmailMock).not.toHaveBeenCalled();
  });

  it("rejects invalid JSON", async () => {
    const response = await inviteUser(undefined, "{not-json");

    expect(response.status).toBe(400);
  });

  it("rejects a missing/invalid email", async () => {
    const response = await inviteUser({ email: "not-an-email" });

    expect(response.status).toBe(400);
    expect(inviteUserByEmailMock).not.toHaveBeenCalled();
  });

  it("invites the user and inserts a company-scoped dispatcher row", async () => {
    inviteUserByEmailMock.mockResolvedValue({
      data: { user: { id: INVITED_USER_ID } },
      error: null,
    });

    const response = await inviteUser({ email: "  New@Example.com  " });

    expect(response.status).toBe(200);
    expect(inviteUserByEmailMock).toHaveBeenCalledWith("new@example.com", {
      data: { company_id: COMPANY_ID, role: "dispatcher" },
    });
    expect(insertedRows).toEqual([
      { id: INVITED_USER_ID, email: "new@example.com", company_id: COMPANY_ID, role: "dispatcher" },
    ]);
  });

  it("returns 500 when the invite itself fails", async () => {
    inviteUserByEmailMock.mockResolvedValue({ data: { user: null }, error: { message: "already invited" } });

    const response = await inviteUser({ email: "new@example.com" });

    expect(response.status).toBe(500);
    expect(insertedRows).toHaveLength(0);
  });

  it("returns 500 when the invite succeeds but the users row insert fails", async () => {
    inviteUserByEmailMock.mockResolvedValue({
      data: { user: { id: INVITED_USER_ID } },
      error: null,
    });
    requireApiRoleMock.mockResolvedValue({
      profile: adminProfile(),
      response: null,
      supabase: {
        from: () => ({
          insert: async () => ({ error: { message: "duplicate key" } }),
        }),
      },
    });

    const response = await inviteUser({ email: "new@example.com" });

    expect(response.status).toBe(500);
  });
});
