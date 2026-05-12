import { describe, expect, it } from "vitest";
import { mergeSquareIntoPaymentConfig } from "../square";

describe("mergeSquareIntoPaymentConfig", () => {
  it("preserves unrelated keys while replacing the square connection", () => {
    const merged = mergeSquareIntoPaymentConfig(
      {
        stripe: { accountId: "acct_123" },
        featureFlag: true,
        square: { connected: false },
      },
      {
        connected: true,
        environment: "sandbox",
        merchantId: "merchant-1",
        merchantName: "Northwind Comfort",
        locationId: "location-1",
        locationName: "Main",
        connectedAt: "2026-05-12T00:00:00.000Z",
        scopes: ["MERCHANT_PROFILE_READ"],
        accessTokenEncrypted: "enc-access",
        refreshTokenEncrypted: "enc-refresh",
        expiresAt: null,
      },
    );

    expect(merged).toMatchObject({
      stripe: { accountId: "acct_123" },
      featureFlag: true,
      square: {
        connected: true,
        merchantId: "merchant-1",
        locationId: "location-1",
      },
    });
  });

  it("falls back to a fresh object when payment_config is not an object", () => {
    const merged = mergeSquareIntoPaymentConfig(null, {
      connected: true,
      environment: "sandbox",
      merchantId: null,
      merchantName: null,
      locationId: null,
      locationName: null,
      connectedAt: "2026-05-12T00:00:00.000Z",
      scopes: [],
      accessTokenEncrypted: "enc-access",
      refreshTokenEncrypted: "enc-refresh",
      expiresAt: null,
    });

    expect(merged).toEqual({
      square: expect.objectContaining({
        connected: true,
        accessTokenEncrypted: "enc-access",
      }),
    });
  });
});
