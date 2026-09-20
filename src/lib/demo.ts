/**
 * Shared demo-tenant detection.
 *
 * The public demo company is identified by EITHER:
 *   - the `demo_mode_enabled` flag, or
 *   - the well-known slug `swiftdispatch-demo`.
 *
 * Using OR (not AND) makes the sandbox resilient to tenants that were
 * provisioned by hand / raw SQL where only one of the two was set.
 */

export const DEMO_COMPANY_SLUG = "swiftdispatch-demo";

type CompanyDemoShape = {
  slug?: string | null;
  demo_mode_enabled?: boolean | null;
};

export function isDemoCompany(company: CompanyDemoShape | null | undefined): boolean {
  if (!company) return false;
  return company.demo_mode_enabled === true || company.slug === DEMO_COMPANY_SLUG;
}

/**
 * Purpose-built sandbox tenants only -- entirely synthetic companies with no
 * real operational data, safe to fully wipe and reseed. `demo_mode_enabled`
 * alone is NOT sufficient for this: `seedDemoAction` (admin/actions.ts, gated
 * behind ENABLE_SEED_DEMO) lets a *real* customer flip that same flag on
 * their own company to additively try sample data, without ever wiping their
 * real jobs. `resetDemoTenant()` does a full destructive wipe of every job/
 * quote/status_event for whatever company it targets -- it must only ever be
 * pointed at a slug on this list, never resolved from the flag alone.
 *
 * Add a new slug here when provisioning another purpose-built sandbox
 * tenant (e.g. a private one shared with trusted prospects).
 */
export const SANDBOX_DEMO_SLUGS = [DEMO_COMPANY_SLUG, "swiftdispatch-preview"] as const;

export function isSandboxDemoCompany(company: CompanyDemoShape | null | undefined): boolean {
  if (!company?.slug) return false;
  return (SANDBOX_DEMO_SLUGS as readonly string[]).includes(company.slug);
}
