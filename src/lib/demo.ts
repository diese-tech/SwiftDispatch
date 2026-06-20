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
