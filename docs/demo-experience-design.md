# Demo & Sandbox Tenant Architecture

> Supersedes the original "Live Demo Experience — Design Plan" that used to
> live in this file. That plan (a `/demo/tech` route reusing `/tech/page.tsx`
> JSX, `company.slug === 'demo'` detection, an admin-role demo login) was
> never built. What actually shipped (PRs #72, #74, #75/#76) took a
> different shape, described below. If you're looking for the old proposal,
> it's in git history; treat it as superseded, not as a roadmap.

## Two sandbox tenants, one mechanism

There are two purpose-built, fully-synthetic company tenants:

| Tenant | Slug | Audience | Login role |
|---|---|---|---|
| Public demo | `swiftdispatch-demo` | Anyone (linked from marketing pages) | dispatcher |
| Private preview | `swiftdispatch-preview` | Trusted prospects (credentials shared directly) | dispatcher |

Both are provisioned by `scripts/seed-demo-tenant.mjs` (one-time, env-var
driven — see the file's own header comment for usage) and reset nightly (and
on-demand via the in-app button) by `resetDemoTenant()`
(`src/lib/resetDemoTenant.ts`). Adding a third sandbox tenant means adding
its slug to `SANDBOX_DEMO_SLUGS` in **both** `src/lib/demo.ts` and
`scripts/lib/seedDemoGuard.mjs` (they can't share an import — the seed
script is a bundler-less `.mjs` — so they're kept in sync by hand; tracked
separately as issue #73).

## Demo detection: two different questions, two different functions

`src/lib/demo.ts` exports three predicates, each answering a distinct
question. Using the wrong one for a given purpose has caused real bugs
(PRs #72 and #74/#76 both had to fix exactly this):

- **`isDemoCompany(company)`** — "should demo-only *UI chrome* show?" True
  if `demo_mode_enabled` is set OR the slug is the public demo's. Loose on
  purpose: a real customer's company could carry `demo_mode_enabled` by
  accident (support tooling, a stray flag flip) without that making it safe
  to wipe. Used to gate `DemoBanner` itself.
- **`isSandboxDemoCompany(company)`** — "is every row this company owns
  synthetic, safe to fully wipe, and safe to show regardless of the
  `is_demo` flag on individual rows?" A strict allowlist check against
  `SANDBOX_DEMO_SLUGS`. This is the one that must gate anything destructive
  (`resetDemoTenant()`) or anything that decides whether `is_demo=true` rows
  should be visible.
- **`isPrivateSandboxDemoCompany(company)`** — "is this the *private*
  preview tenant specifically (not the public demo)?" Scopes the
  first-launch tutorial to the private flow, which already has its own
  framing (a direct prospect handoff) that would be redundant with the
  public demo's marketing-page framing.

`isCompanySandboxDemo(supabase, companyId)` (also in `demo.ts`) is the
async, one-query-away version of `isSandboxDemoCompany` for routes/pages
that only have a `companyId`, not an already-loaded company row.

## Why `is_demo` visibility needed per-route scoping

A sandbox tenant's jobs/quotes are **all** `is_demo=true` — that data *is*
the product being demoed. But `scripts/load-tech-actions.mjs` and its
siblings also seed `is_demo=true` rows into ordinary, non-sandbox company
slugs, specifically to keep synthetic load-test traffic out of real
operators' views (grep those scripts for "reduce operational noise").

So no single blanket rule works: a sandbox tenant needs `is_demo` rows
**visible**, an ordinary tenant needs them **hidden**. Every read/write path
that used to filter `.eq("is_demo", false)` unconditionally now does it
conditionally, keyed off `isCompanySandboxDemo`/`isSandboxDemoCompany`:
quote build/preview/line-items/send-sms, the admin stats page, the
analytics page, `GET /api/jobs`, `KanbanBoard`'s realtime refetch, and
`DispatchPage`'s initial SSR load (SSR and realtime must agree — that
mismatch was its own bug, fixed in PR #76). RLS itself has no `is_demo`
predicate anywhere; this is purely an app-layer concern, not a security
boundary.

## The demo banner and its pieces

`DemoBanner` (`src/components/DemoBanner.tsx`) renders when `isDemoCompany`
is true, across every `(app)` page via the shared layout. It contains:

- **`DemoTabNav`** — quick links to `/dispatch` and `/analytics`.
- **An "Admin settings" link** — only for an `admin`-role profile. The
  private preview's login is `dispatcher` (see below), so it doesn't see
  this.
- **`ResetDemoButton`** — POSTs `/api/demo/reset`, which re-verifies
  `isSandboxDemoCompany` server-side before calling `resetDemoTenant()`
  (never trusts the button's own gating alone). Surfaces the server's error
  message on failure instead of failing silently.
- **`DemoTutorial`** — only for `isPrivateSandboxDemoCompany`. A four-step
  anchored walkthrough (brand → dispatch → analytics → reset), desktop-only,
  dismissal remembered in `localStorage`.

## Why the demo login is `dispatcher`, not `admin`

Considered and decided against making the private preview's login `admin`
(which would unlock `/admin`, `/admin/technicians`, `/admin/templates`,
`/admin/users`, `/admin/settings` in the same session). Staying
`dispatcher` and hiding the admin CTA was the smaller, lower-risk change,
and keeps the reset baseline's scope small — an admin-capable demo login
would put company settings, technician identities, and templates within a
prospect's reach, all of which `resetDemoTenant()` deliberately does not
restore (see below). If this decision changes, revisit that reset scope
too.

## Tech preview: a floating widget, not a separate route

There is no `/demo/tech` route. Instead, `TechPhoneModal`
(`src/components/TechPhoneModal.tsx`) is a floating "Tech view" button on
`/dispatch` itself, opening an iPhone-chrome mockup. Important
architectural fact: **it runs under the viewer's own dispatcher/admin
session**, not a real technician session — there's no auth-impersonation
layer. That has real consequences:

- Its actions call the same `PATCH /api/jobs/[id]` a dispatcher would use,
  so it's bound by `requireApiRole`'s dispatcher/admin rules, not the
  narrower `TECHNICIAN_ALLOWED_STATUSES` a real technician session is
  restricted to.
- "Complete" is gated on an accepted quote existing (`hasAcceptedQuote`,
  fetched the same way `tech/page.tsx` computes it server-side), matching
  the real technician UI's rule — it used to only check the generic
  state-machine transition, which let a demo tech complete a job with no
  quote at all.
- "Build Quote" is disabled (non-mutating) once a job reaches `in_progress`,
  with an explanatory `title`. It used to PATCH the job straight to
  `quote_pending`, which no real technician session can do either — in the
  real product that transition is dispatcher-driven, via `QuoteBuilder` on
  the job detail page; a real technician's own "Build Quote" link is
  read-only (`/tech/job/[id]` has no mutation UI at all).
- Address/phone are real `https://maps.google.com/?q=...` and `tel:` links,
  copied from `/tech/job/[id]`'s markup, not decorative text.
- "Sign out" is inert on purpose: there is no separate technician session
  to sign out of. Making it functional would sign the *dispatcher* out of
  their own account mid-demo.

Reusing the real technician UI wholesale (a shared `TechJobView` component,
or a technician-session impersonation adapter) was considered and
explicitly deferred — it's a larger, security-relevant architectural
decision (issue #75), not a bug fix.

## External side effects: SMS is suppressed centrally, payment is a non-issue

Every SMS this app sends — intake, tech-action, quote-approval, invoice,
status updates — funnels through one worker, `processSmsOutboxBatch()`
(`src/lib/smsOutbox.ts`). That's the single place sandbox suppression is
decided: a sandbox tenant's queued messages are marked sent with a
`demo-simulated-*` id instead of ever calling Twilio. This is deliberately
**not** decided per-route via `is_demo` filters — that conflates a
data-visibility concern with an external-side-effect concern, which is
exactly the mistake PR #74 made and had to walk back.

Payment needed no equivalent suppression: sandbox companies are seeded with
`payment_provider: "manual"`, and `ManualPaymentProvider`
(`src/lib/payments/manual.ts`) never makes an external call — it only
writes to this app's own `invoices` table.

## What "Reset data" actually restores

`resetDemoTenant()` does a full destructive wipe and reseed of job-centric
state: jobs, quotes, quote line items, status events, the SMS outbox, and
technician `availability_status`/`current_job_id`. It also restores two
things beyond job state to a canonical baseline:

- **Technician name/phone**, matched *positionally* (ordered by
  `created_at`, mirroring the original seed script's insertion order) —
  not by name, which broke silently the moment a technician was renamed.
  `handle`/`pin`/`auth_user_id` are never touched; those are the
  technician's actual Supabase Auth login identity.
- **The canonical quote template** (`demoTemplate` in
  `src/lib/demo-data.ts`), created if missing or restored if drifted.

Deliberately **not** restored: company-level settings (name, email, phone,
timezone, `sms_sender_name`, `payment_provider`) and user roles. There's no
canonical source of truth for a given tenant's company settings without new
config infrastructure (the private preview's name/email were one-time CLI
args to the seed script, never persisted anywhere reset can read back), and
blanket-resetting user roles risks undoing a legitimate internal admin
account someone set up on purpose. If the demo login ever becomes
`admin`-capable, this gap becomes more load-bearing and should be
revisited.

## Open follow-ups (tracked under issue #75)

- Whether to eventually give `TechPhoneModal` a real shared-component or
  impersonation-based connection to the production technician UI/rules,
  instead of its current parallel (now rule-matched, but still separate)
  implementation. This is a larger refactor than the audit's other fixes
  and is left as a product/architecture decision rather than done
  unprompted; `src/lib/__tests__/demoTenantQuoteLifecycle.test.ts` and the
  per-route regression tests already guard the rule-matching in the
  meantime.
- Automated coverage for the two things this repo has no test harness
  for: rendering `/quote/[id]` and `/intake/quote/[token]` themselves
  (vs. the data they'd render, which the E2E suite does cover), and any
  component-level check of `KanbanBoard`, `DemoBanner`, or
  `TechPhoneModal`'s actual DOM output. Both would need a React
  Testing Library / jsdom render harness that doesn't exist anywhere in
  this codebase yet.
