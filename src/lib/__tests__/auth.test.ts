/**
 * Unit coverage for requireApiRole() (issue #49) — the canonical API
 * authorization primitive. Mocks only the Supabase server-client factory,
 * exercising the real function under test.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const createSupabaseServerClientMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: createSupabaseServerClientMock,
}));

type FakeUser = { id: string } | null;
type FakeProfileRow = { id: string; email: string; company_id: string | null; role: string } | null;

function makeFakeSupabase(user: FakeUser, profileRow: FakeProfileRow) {
  return {
    auth: {
      getUser: async () => ({
        data: { user },
        error: user ? null : { message: "no session" },
      }),
    },
    from: (table: string) => {
      if (table !== "users") throw new Error(`Unexpected table in test double: ${table}`);
      return {
        select: () => ({
          eq: () => ({
            single: async () =>
              profileRow
                ? { data: profileRow, error: null }
                : { data: null, error: { message: "not found" } },
          }),
        }),
      };
    },
  };
}

describe("requireApiRole", () => {
  beforeEach(() => {
    createSupabaseServerClientMock.mockReset();
  });

  it("returns 401 when there is no authenticated session", async () => {
    createSupabaseServerClientMock.mockResolvedValue(makeFakeSupabase(null, null));
    const { requireApiRole } = await import("@/lib/auth");

    const { profile, response } = await requireApiRole(["admin"]);

    expect(profile).toBeNull();
    expect(response?.status).toBe(401);
  });

  it("returns 403 when the caller has no company_id", async () => {
    createSupabaseServerClientMock.mockResolvedValue(
      makeFakeSupabase({ id: "user-1" }, { id: "user-1", email: "a@b.com", company_id: null, role: "admin" }),
    );
    const { requireApiRole } = await import("@/lib/auth");

    const { profile, response } = await requireApiRole(["admin"]);

    expect(profile).toBeNull();
    expect(response?.status).toBe(403);
  });

  it("returns 403 when the caller's role is not in the allowed set", async () => {
    createSupabaseServerClientMock.mockResolvedValue(
      makeFakeSupabase(
        { id: "user-1" },
        { id: "user-1", email: "a@b.com", company_id: "company-1", role: "technician" },
      ),
    );
    const { requireApiRole } = await import("@/lib/auth");

    const { profile, response } = await requireApiRole(["admin", "dispatcher"]);

    expect(profile).toBeNull();
    expect(response?.status).toBe(403);
  });

  it("returns a usable profile context when the role is allowed", async () => {
    createSupabaseServerClientMock.mockResolvedValue(
      makeFakeSupabase(
        { id: "user-1" },
        { id: "user-1", email: "a@b.com", company_id: "company-1", role: "dispatcher" },
      ),
    );
    const { requireApiRole } = await import("@/lib/auth");

    const { profile, response } = await requireApiRole(["dispatcher", "admin"]);

    expect(response).toBeNull();
    expect(profile).toEqual({ id: "user-1", email: "a@b.com", company_id: "company-1", role: "dispatcher" });
  });
});
