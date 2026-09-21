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
 * alone is NOT sufficient for this: a real customer's company can carry that
 * same flag (set by hand, via support tooling, etc.) without ever being
 * safe to wipe. `resetDemoTenant()` does a full destructive wipe of every
 * job/quote/status_event for whatever company it targets -- it must only
 * ever be pointed at a slug on this list, never resolved from the flag
 * alone.
 *
 * Add a new slug here when provisioning another purpose-built sandbox
 * tenant (e.g. a private one shared with trusted prospects).
 */
export const SANDBOX_DEMO_SLUGS = [DEMO_COMPANY_SLUG, "swiftdispatch-preview"] as const;

export function isSandboxDemoCompany(company: CompanyDemoShape | null | undefined): boolean {
  if (!company?.slug) return false;
  return (SANDBOX_DEMO_SLUGS as readonly string[]).includes(company.slug);
}

/**
 * A purpose-built sandbox tenant that is NOT the public demo -- e.g. a
 * private tenant shared with trusted prospects. Used to scope the
 * first-launch guided tutorial to that private flow without also showing it
 * on the public demo (which already has its own marketing-page framing).
 */
export function isPrivateSandboxDemoCompany(company: CompanyDemoShape | null | undefined): boolean {
  return isSandboxDemoCompany(company) && company?.slug !== DEMO_COMPANY_SLUG;
}

/**
 * Server-side helper for read paths that otherwise filter out `is_demo`
 * rows (quote preview/build, admin stats, the jobs list). A sandbox tenant's
 * jobs/quotes are ALL is_demo=true, so that filter must be skipped there or
 * every read comes back empty -- but load-testing/live-QA scripts also seed
 * is_demo=true rows into ordinary (non-sandbox) companies specifically to
 * keep them out of real operator views, so the filter must stay everywhere
 * else. One extra `companies` lookup per request; callers that already have
 * the company row on hand should call isSandboxDemoCompany() directly
 * instead of paying for a second query.
 */
export async function isCompanySandboxDemo(
  supabase: Awaited<ReturnType<typeof import("./supabase/server").createSupabaseServerClient>>,
  companyId: string,
): Promise<boolean> {
  const { data } = await supabase.from("companies").select("slug").eq("id", companyId).maybeSingle();
  return isSandboxDemoCompany(data);
}
