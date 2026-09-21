/**
 * Preflight guard for scripts/seed-demo-tenant.mjs. Pulled out into its own
 * module so it can run before ANY Supabase write and be unit-tested without
 * a live database.
 *
 * seed-demo-tenant.mjs does a full destructive wipe of whatever company its
 * slug resolves to, and can silently reassign existing Supabase Auth users
 * (the demo login, the three technician logins) to a different company if
 * their email/handle collide. The public demo's defaults are safe BECAUSE
 * they're only ever applied to the public demo's own company -- any other
 * slug must come with its own non-default credentials and technician handle
 * suffix, or this refuses to run.
 *
 * Mirrors SANDBOX_DEMO_SLUGS in src/lib/demo.ts -- this script is a plain
 * .mjs with no bundler, so it can't import that TypeScript module directly.
 * Keep both lists in sync.
 */
export const SANDBOX_DEMO_SLUGS = ["swiftdispatch-demo", "swiftdispatch-preview"];

export const PUBLIC_DEMO_SLUG = "swiftdispatch-demo";
export const PUBLIC_DEMO_EMAIL = "demo@swiftdispatch.app";
export const PUBLIC_DEMO_PASSWORD = "demo";

/**
 * @param {{ slug: string, userEmail: string, userPassword: string, handleSuffix: string }} config
 * @throws {Error} if the config would let this script hijack the public
 *   demo's auth users or wipe a company outside the sandbox allowlist.
 */
export function validateSeedConfig({ slug, userEmail, userPassword, handleSuffix }) {
  if (!SANDBOX_DEMO_SLUGS.includes(slug)) {
    throw new Error(
      `Refusing to seed "${slug}" -- it is not on SANDBOX_DEMO_SLUGS. This script does a full ` +
        `destructive wipe of whatever company the slug resolves to. Add the slug to ` +
        `SANDBOX_DEMO_SLUGS in both src/lib/demo.ts and scripts/lib/seedDemoGuard.mjs first if this ` +
        `is a new purpose-built sandbox tenant.`,
    );
  }

  if (slug === PUBLIC_DEMO_SLUG) return;

  if (userEmail === PUBLIC_DEMO_EMAIL) {
    throw new Error(
      `Refusing to seed "${slug}" with the public demo's login email (${PUBLIC_DEMO_EMAIL}). ` +
        `Set DEMO_USER_EMAIL to a distinct address, or this reassigns the public demo's login to ` +
        `this company.`,
    );
  }

  if (userPassword === PUBLIC_DEMO_PASSWORD) {
    throw new Error(
      `Refusing to seed "${slug}" with the public demo's default password. Set DEMO_USER_PASSWORD ` +
        `to a real generated password -- this tenant's credentials are meant to be shared privately.`,
    );
  }

  if (!handleSuffix) {
    throw new Error(
      `Refusing to seed "${slug}" without DEMO_HANDLE_SUFFIX. Reusing the public demo's technician ` +
        `handles (miatorres, leogrant, averybrooks) would hijack their Supabase Auth logins into ` +
        `this company.`,
    );
  }
}
