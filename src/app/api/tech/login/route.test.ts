/**
 * Behavior coverage for technician handle+PIN login (issue #62): rate
 * limiting, validation, the handle -> internal email mapping, and that
 * Supabase Auth errors never leak (always a generic 401).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const checkRateLimitMock = vi.fn();
const signInWithPasswordMock = vi.fn();

vi.mock("@/lib/rateLimit", () => ({
  checkRateLimit: checkRateLimitMock,
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    auth: { signInWithPassword: signInWithPasswordMock },
  }),
}));

async function login(body: unknown, rawBody?: string) {
  const { POST } = await import("./route");
  return POST(
    new Request("http://localhost/api/tech/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: rawBody ?? JSON.stringify(body),
    }),
  );
}

describe("POST /api/tech/login", () => {
  beforeEach(() => {
    checkRateLimitMock.mockReset();
    signInWithPasswordMock.mockReset();
    checkRateLimitMock.mockResolvedValue(true);
  });

  it("rejects invalid JSON", async () => {
    const response = await login(undefined, "{not-json");

    expect(response.status).toBe(400);
  });

  it("rejects a missing handle or pin", async () => {
    const response = await login({ handle: "jsmi" });

    expect(response.status).toBe(400);
    expect(checkRateLimitMock).not.toHaveBeenCalled();
  });

  it("rejects when the per-handle rate limit is exceeded, without attempting sign-in", async () => {
    checkRateLimitMock.mockResolvedValue(false);

    const response = await login({ handle: "jsmi", pin: "4242" });

    expect(response.status).toBe(429);
    expect(signInWithPasswordMock).not.toHaveBeenCalled();
  });

  it("returns a generic 401 on an invalid handle/pin, not the underlying Supabase error", async () => {
    signInWithPasswordMock.mockResolvedValue({ error: { message: "Invalid login credentials" } });

    const response = await login({ handle: "jsmi", pin: "0000" });
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(401);
    expect(body.error).toBe("Invalid username or PIN");
  });

  it("signs in with the handle mapped to its internal email, lowercased and trimmed", async () => {
    signInWithPasswordMock.mockResolvedValue({ error: null });

    const response = await login({ handle: "  JSmi  ", pin: "  4242  " });

    expect(response.status).toBe(200);
    expect(signInWithPasswordMock).toHaveBeenCalledWith({
      email: "jsmi@internal.swiftdispatch.app",
      password: "4242",
    });
    expect(checkRateLimitMock).toHaveBeenCalledWith("tech-login:jsmi", 10, 60_000);
  });
});
