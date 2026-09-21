import { describe, expect, it } from "vitest";
import { validateSeedConfig } from "./seedDemoGuard.mjs";

const PUBLIC_DEFAULTS = {
  slug: "swiftdispatch-demo",
  userEmail: "demo@swiftdispatch.app",
  userPassword: "demo",
  handleSuffix: "",
};

const PREVIEW_TENANT = {
  slug: "swiftdispatch-preview",
  userEmail: "preview@swiftdispatch.app",
  userPassword: "a-real-generated-password",
  handleSuffix: "preview",
};

describe("validateSeedConfig", () => {
  it("allows the canonical public demo defaults", () => {
    expect(() => validateSeedConfig(PUBLIC_DEFAULTS)).not.toThrow();
  });

  it("allows a fully-specified preview tenant", () => {
    expect(() => validateSeedConfig(PREVIEW_TENANT)).not.toThrow();
  });

  it("refuses a custom slug with the public demo's default email", () => {
    expect(() =>
      validateSeedConfig({ ...PREVIEW_TENANT, userEmail: "demo@swiftdispatch.app" }),
    ).toThrow(/public demo's login email/);
  });

  it("refuses a custom slug with the public demo's default password", () => {
    expect(() => validateSeedConfig({ ...PREVIEW_TENANT, userPassword: "demo" })).toThrow(
      /public demo's default password/,
    );
  });

  it("refuses a custom slug with an empty technician handle suffix", () => {
    expect(() => validateSeedConfig({ ...PREVIEW_TENANT, handleSuffix: "" })).toThrow(
      /DEMO_HANDLE_SUFFIX/,
    );
  });

  it("refuses a slug that isn't on SANDBOX_DEMO_SLUGS, before any other check", () => {
    expect(() =>
      validateSeedConfig({
        slug: "acme-hvac",
        userEmail: "demo@swiftdispatch.app",
        userPassword: "demo",
        handleSuffix: "",
      }),
    ).toThrow(/not on SANDBOX_DEMO_SLUGS/);
  });
});
