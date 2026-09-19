/**
 * Dense, dependency-free unit tests for the pure quote-total math
 * extracted in quotePricing.ts (issue #58) -- no mocking, just
 * input/output cases, the way a pure pricing/quote function deserves.
 */
import { describe, expect, it } from "vitest";
import { resolveEffectiveTotal, sumLineItems } from "../quotePricing";

describe("sumLineItems", () => {
  it("sums price * quantity across multiple items", () => {
    expect(
      sumLineItems([
        { price: 100, quantity: 2 },
        { price: 50, quantity: 1 },
      ]),
    ).toBe(250);
  });

  it("returns 0 for an empty list", () => {
    expect(sumLineItems([])).toBe(0);
  });

  it("treats a null or undefined price as 0", () => {
    expect(sumLineItems([{ price: null, quantity: 5 }])).toBe(0);
    expect(sumLineItems([{ price: undefined, quantity: 5 }])).toBe(0);
  });

  it("treats a null or undefined quantity as 0", () => {
    expect(sumLineItems([{ price: 100, quantity: null }])).toBe(0);
    expect(sumLineItems([{ price: 100, quantity: undefined }])).toBe(0);
  });

  it("handles decimal prices without drifting", () => {
    expect(sumLineItems([{ price: 19.99, quantity: 3 }])).toBeCloseTo(59.97, 5);
  });

  it("treats a zero price or quantity as contributing nothing", () => {
    expect(sumLineItems([{ price: 0, quantity: 10 }, { price: 25, quantity: 0 }])).toBe(0);
  });
});

describe("resolveEffectiveTotal", () => {
  it("prefers the live line-items total when it's positive", () => {
    expect(resolveEffectiveTotal({ lineItemsTotal: 150, totalAmount: 999, total: 999 })).toBe(150);
  });

  it("falls back to total_amount when there are no line items", () => {
    expect(resolveEffectiveTotal({ lineItemsTotal: 0, totalAmount: 200, total: 999 })).toBe(200);
  });

  it("falls back to total when both line items and total_amount are empty", () => {
    expect(resolveEffectiveTotal({ lineItemsTotal: 0, totalAmount: 0, total: 75 })).toBe(75);
  });

  it("falls back to total when total_amount is null", () => {
    expect(resolveEffectiveTotal({ lineItemsTotal: 0, totalAmount: null, total: 75 })).toBe(75);
  });

  it("returns 0 when nothing is available anywhere in the fallback chain", () => {
    expect(resolveEffectiveTotal({ lineItemsTotal: 0, totalAmount: null, total: null })).toBe(0);
  });

  it("a negative line-items total (defensive case) falls through to total_amount rather than being used directly", () => {
    expect(resolveEffectiveTotal({ lineItemsTotal: -10, totalAmount: 200, total: 999 })).toBe(200);
  });
});
