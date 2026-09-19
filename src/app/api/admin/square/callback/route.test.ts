import { beforeEach, describe, expect, it, vi } from "vitest";

const requireApiRoleMock = vi.fn();
const exchangeSquareAuthorizationCodeMock = vi.fn();
const fetchSquareMerchantContextMock = vi.fn();
const buildStoredSquareConnectionMock = vi.fn();

const companyQueryState = {
  companyId: undefined as string | undefined,
  selectedPaymentConfig: { stripe: { accountId: "acct_123" }, keep: true } as unknown,
  updatedPayload: null as Record<string, unknown> | null,
};

vi.mock("@/lib/auth", () => ({
  requireApiRole: requireApiRoleMock,
}));

vi.mock("@/lib/square", () => ({
  buildStoredSquareConnection: buildStoredSquareConnectionMock,
  exchangeSquareAuthorizationCode: exchangeSquareAuthorizationCodeMock,
  fetchSquareMerchantContext: fetchSquareMerchantContextMock,
  mergeSquareIntoPaymentConfig: (paymentConfig: unknown, squareConnection: unknown) => {
    const base =
      typeof paymentConfig === "object" && paymentConfig !== null && !Array.isArray(paymentConfig)
        ? (paymentConfig as Record<string, unknown>)
        : {};
    return { ...base, square: squareConnection };
  },
  verifySquareOAuthState: vi.fn(() => ({
    companyId: "company-1",
    userId: "user-1",
    returnTo: "/admin/settings",
  })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: vi.fn(() => ({
    from: () => ({
      select: () => ({
        eq: (column: string, value: string) => {
          if (column === "id") companyQueryState.companyId = value;
          return {
            maybeSingle: async () => ({
              data: companyQueryState.companyId
                ? { payment_config: companyQueryState.selectedPaymentConfig }
                : null,
              error: null,
            }),
          };
        },
      }),
      update: (payload: Record<string, unknown>) => {
        companyQueryState.updatedPayload = payload;
        return {
          eq: async () => ({
            error: null,
          }),
        };
      },
    }),
  })),
}));

describe("GET /api/admin/square/callback", () => {
  beforeEach(() => {
    companyQueryState.companyId = undefined;
    companyQueryState.updatedPayload = null;
    companyQueryState.selectedPaymentConfig = { stripe: { accountId: "acct_123" }, keep: true };
    requireApiRoleMock.mockReset();
    exchangeSquareAuthorizationCodeMock.mockReset();
    fetchSquareMerchantContextMock.mockReset();
    buildStoredSquareConnectionMock.mockReset();
  });

  it("rejects the callback when the current admin session does not match the signed state", async () => {
    requireApiRoleMock.mockResolvedValue({
      profile: { id: "different-user", email: "admin@example.com", company_id: "company-1", role: "admin" },
      response: null,
      supabase: { kind: "server-client" },
    });

    const { GET } = await import("./route");
    const response = await GET(
      new Request("http://localhost/api/admin/square/callback?code=test-code&state=test-state"),
    );

    expect(response.headers.get("location")).toBe(
      "http://localhost/admin/settings?square=forbidden",
    );
    expect(exchangeSquareAuthorizationCodeMock).not.toHaveBeenCalled();
    expect(companyQueryState.updatedPayload).toBeNull();
  });

  it("preserves unrelated payment_config keys when saving the Square connection", async () => {
    requireApiRoleMock.mockResolvedValue({
      profile: { id: "user-1", email: "admin@example.com", company_id: "company-1", role: "admin" },
      response: null,
      supabase: { kind: "server-client" },
    });
    exchangeSquareAuthorizationCodeMock.mockResolvedValue({
      access_token: "access-token",
      refresh_token: "refresh-token",
      expires_at: "2026-05-13T00:00:00.000Z",
      merchant_id: "merchant-1",
      scopes: ["MERCHANT_PROFILE_READ"],
    });
    fetchSquareMerchantContextMock.mockResolvedValue({
      merchant: { id: "merchant-1", business_name: "Northwind Comfort", main_location_id: "loc-1" },
      selectedLocation: { id: "loc-1", name: "Main", business_name: "Northwind Comfort" },
    });
    buildStoredSquareConnectionMock.mockReturnValue({
      connected: true,
      environment: "sandbox",
      merchantId: "merchant-1",
      merchantName: "Northwind Comfort",
      locationId: "loc-1",
      locationName: "Main",
      connectedAt: "2026-05-12T00:00:00.000Z",
      scopes: ["MERCHANT_PROFILE_READ"],
      accessTokenEncrypted: "enc-access",
      refreshTokenEncrypted: "enc-refresh",
      expiresAt: "2026-05-13T00:00:00.000Z",
    });

    const { GET } = await import("./route");
    const response = await GET(
      new Request("http://localhost/api/admin/square/callback?code=test-code&state=test-state"),
    );

    expect(response.headers.get("location")).toBe(
      "http://localhost/admin/settings?square=connected",
    );
    expect(companyQueryState.updatedPayload).toEqual({
      payment_provider: "square",
      payment_config: {
        stripe: { accountId: "acct_123" },
        keep: true,
        square: expect.objectContaining({
          connected: true,
          merchantId: "merchant-1",
        }),
      },
    });
  });
});
