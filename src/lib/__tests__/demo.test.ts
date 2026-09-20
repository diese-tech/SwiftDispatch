import { describe, expect, it } from "vitest";
import { DEMO_COMPANY_SLUG, SANDBOX_DEMO_SLUGS, isDemoCompany, isSandboxDemoCompany } from "@/lib/demo";

describe("isDemoCompany", () => {
  it("is true when demo_mode_enabled is true, regardless of slug", () => {
    expect(isDemoCompany({ slug: "acme-hvac", demo_mode_enabled: true })).toBe(true);
  });

  it("is true for the canonical public demo slug, regardless of the flag", () => {
    expect(isDemoCompany({ slug: DEMO_COMPANY_SLUG, demo_mode_enabled: false })).toBe(true);
  });

  it("is false for a real company with the flag off", () => {
    expect(isDemoCompany({ slug: "acme-hvac", demo_mode_enabled: false })).toBe(false);
  });

  it("is false for null/undefined", () => {
    expect(isDemoCompany(null)).toBe(false);
    expect(isDemoCompany(undefined)).toBe(false);
  });
});

describe("isSandboxDemoCompany", () => {
  it("is true for every slug on SANDBOX_DEMO_SLUGS", () => {
    for (const slug of SANDBOX_DEMO_SLUGS) {
      expect(isSandboxDemoCompany({ slug })).toBe(true);
    }
  });

  it("is false for a real company even with demo_mode_enabled true (only a slug on SANDBOX_DEMO_SLUGS is safe to fully wipe)", () => {
    expect(isSandboxDemoCompany({ slug: "acme-hvac", demo_mode_enabled: true })).toBe(false);
  });

  it("is false for null/undefined or a company with no slug", () => {
    expect(isSandboxDemoCompany(null)).toBe(false);
    expect(isSandboxDemoCompany(undefined)).toBe(false);
    expect(isSandboxDemoCompany({ slug: null })).toBe(false);
  });
});
