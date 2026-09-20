# API Authorization

This documents the intended role/capability matrix for SwiftDispatch's
`/api/*` routes, per issue #49. It is the source of truth for "what must be
true for actor X to perform operation Y" — code changes to authorization
behavior should update this file in the same PR.

## Model

1. **Authentication** proves identity (a valid Supabase Auth session).
2. **Tenant isolation** proves company scope (`company_id` match).
3. **Role authorization** proves the caller may perform the requested
   operation.
4. **RLS** (tenant-scoped only today — see [RLS](#rls) below) is
   defense-in-depth, not the primary enforcement layer. The API layer is the
   source of truth for role authorization.

All four are enforced by one canonical primitive, `requireApiRole()` in
`src/lib/auth.ts` (`requireProfileWithRole()` is its redirect-based
counterpart for server-component pages). Both return/redirect:

- unauthenticated → `401` (API) / redirect (page)
- authenticated but role not in the allowed set → `403` / redirect
- authenticated, allowed role, but no `company_id` → `403` / redirect
- allowed → `{ supabase, profile, response: null }` with `profile.company_id`
  guaranteed non-null

`requireApiProfile()` still exists for the narrower case of "prove identity
only, no role-specific permission required" — it is not used by any route
where a specific role is required.

## Roles

- `technician` — sees only their own assigned jobs, via `/tech`.
- `dispatcher` — runs day-to-day job intake, assignment, and lifecycle via
  `/dispatch`.
- `admin` — dispatcher capabilities plus company settings, users,
  technicians, quote templates, payment provider connection.
- `super_admin` — impersonates a company via `/dispatch` (see `src/proxy.ts`);
  has no additional `/api` mutation routes of its own today.

## Permission matrix

| Route | technician | dispatcher | admin |
|---|---|---|---|
| `GET/POST /api/jobs` | ✗ | ✓ | ✓ |
| `PATCH /api/jobs/[id]` — status/technician assignment (general) | ✗ | ✓ | ✓ |
| `PATCH /api/jobs/[id]` — own-job status only (`en_route`/`in_progress`/`completed`, no `technician_id`) | ✓ (own assigned job only) | n/a (covered by general) | n/a |
| `POST /api/jobs/[id]/retry-sms` | ✗ | ✓ | ✓ |
| `POST /api/quotes` (build/update) | ✗ | ✓ | ✓ |
| `POST /api/quotes/[id]/line-items` | ✗ | ✓ | ✓ |
| `PATCH`/`DELETE /api/quotes/[id]/line-items/[itemId]` | ✗ | ✓ | ✓ |
| `POST /api/send-sms` (quote send) | ✗ | ✓ | ✓ |
| `PATCH /api/quotes/[id]/accept` — authenticated branch | ✗ | ✓ | ✓ |
| `PATCH /api/company` (close_status) | ✗ | ✗ | ✓ |
| `GET/PATCH /api/admin/settings` | ✗ | ✗ | ✓ |
| `GET/POST /api/admin/users` | ✗ | ✗ | ✓ |
| `GET/POST /api/admin/technicians`, `.../regenerate-pin` | ✗ | ✗ | ✓ |
| `GET /api/admin/templates` | ✗ | ✓ | ✓ |
| `POST /api/admin/templates`, `PATCH/DELETE .../[id]` | ✗ | ✗ | ✓ |
| `GET /api/admin/square/connect`, `GET /api/admin/square/callback` | ✗ | ✗ | ✓ |
| `/quote/[id]` (page — quote review) | ✗ | ✓ | ✓ |

Not role-gated by design (token/secret auth instead, unchanged by #49):

- `POST /api/intake`, `GET /api/intake/status` — public intake, no session.
- `GET /api/tech-action` — technician SMS-token action links.
- `POST /api/tech/login` — technician handle+PIN login.
- `POST /api/quotes/[id]/decline`, and the customer-token branch of
  `PATCH /api/quotes/[id]/accept` — customer quote-approval token.
- `internal/**` — worker-secret/cron-secret header auth.

**Reviewed, intentionally unchanged:** `POST /api/demo/reset` uses
`requireApiProfile()` (any authenticated company member), not a role check.
It only ever mutates `is_demo=true` tenant data, isn't in #49's priority
list, and `ResetDemoButton` may be shown to any authenticated demo-tenant
member via `DemoBanner`. Restricting it wasn't required and there's no
evidence the current UX is wrong — flagged here rather than silently left
inconsistent with everything else.

## `POST /api/jobs` — technician tenant ownership

Fixed alongside #58's behavior-test coverage pass: `technician_id` is a
caller-supplied field, but `jobs.technician_id` is a plain FK with no
`(technician_id, company_id)` composite constraint, and the jobs-insert RLS
policy only validates the *job's own* `company_id` — neither stopped a
dispatcher from submitting another company's technician UUID and having it
persisted onto their own company's job (status `assigned`, with SMS/
availability side effects silently no-op'ing since the technician row
itself stays RLS-protected). The route now resolves the technician through
the company-scoped query (`.eq('company_id', profile.company_id)`, backed
by the technicians table's own RLS policy as defense-in-depth) before ever
writing it onto a job, rejecting with `404` if it doesn't resolve.

## Cross-tenant resource reference audit (issue #64)

Deliberate follow-up to the `POST /api/jobs` finding above: audited every
mutation route (`POST`/`PATCH`/`DELETE` across `src/app/api/**`) for the
same bug class — a client-supplied id referencing a *different* table,
written or acted on without confirming it belongs to the caller's own
company. Two more instances found and fixed, both the identical pattern:

- **`PATCH /api/jobs/[id]`** — `technician_id` on the dispatcher/admin path
  had the exact same gap as the `POST /api/jobs` case above (RLS protected
  the foreign technician's own row from mutation, but not the job's
  `technician_id` field itself). Fixed identically: a company-scoped
  `technicians` lookup before the id is written into the patch, `404` if it
  doesn't resolve. The technician-role branch was never affected — it
  can't submit `technician_id` in its request at all.
- **`POST /api/jobs`** — `customer_id` had *no* check at all, not even a
  partial one. `jobs.customer_id` was added as a bare `uuid` column with no
  FK constraint (`supabase/migrations/202505010001_job_timestamp_columns.sql`),
  so RLS on `customers` provides zero protection here — nothing in that
  code path ever queried `customers`. Fixed with the same company-scoped
  lookup pattern. Lower practical severity than the technician case since
  `jobs.customer_id` isn't joined/displayed anywhere today, but the same
  defect class and the same fix.

Everything else audited — the rest of the dispatch/quote routes, every
admin route, and every public/token/internal route (`intake`,
`tech-action`, `tech/login`, `demo/reset`, `internal/**`) — was clean: each
foreign id is either explicitly company-scoped in its query, server-derived
from an already-scoped row rather than taken raw from the client, or the
route resolves its own tenant scope from a signed token/slug/session rather
than trusting client input for it. `GET /api/tech-action` is worth calling
out positively — its technician-availability update already pulls the
technician id from the DB-fetched job row, never the request, i.e. it
already implements this defense correctly.

**Resolved (issue #66):** `POST /api/jobs` and `PATCH /api/jobs/[id]` used
to insert `status_events` rows via the session-scoped Supabase client (from
`requireApiRole`), not the admin client. Confirmed directly against the
live Supabase project (`vfpodezcyufjnqkcpzcn`): `status_events` has exactly
one RLS policy, a `SELECT`-only policy for company members — no `INSERT`
policy exists, and `relforcerowsecurity` is `false` (so the finding wasn't
even about the `FORCE` setting; RLS applies to the `authenticated` role
regardless). The `authenticated` role does have a table-level `INSERT`
grant, which is exactly the shape that makes this failure silent rather
than a permission error: the insert simply matches zero rows for the
`with_check` clause and is dropped. Confirmed the real-world impact
directly: 654 non-demo `manual`/`call`-sourced jobs had **zero**
`status_events` rows, and the only `dispatcher`-attributed rows that did
exist all had `actor_id: null` — the exact signature of the demo-seed
script's service-role inserts (`scripts/seed-live-qa.mjs`), not of a real
API request (which always sets `actor_id: profile.id`). Fixed by routing
both call sites through `createSupabaseAdminClient()`, matching how
`intake`/`tech-action` already write `status_events`, and now checking
(and logging) the insert's `error` at both call sites instead of ignoring
it.

## `PATCH /api/jobs/[id]` — technician branch

This route is intentionally shared rather than split: dispatcher/admin
retain full capability (technician assignment, arbitrary valid status
transitions, cancellation), while a `technician`-role caller is restricted
to exactly what `TechClientComponents.tsx` sends —

1. the request body contains `status` and nothing else (no `technician_id`,
   `note`, or `cancellation_reason`);
2. the requested status is one of `en_route`, `in_progress`, `completed`;
3. the job's `technician_id` matches the caller's own `technicians` row
   (looked up by `auth_user_id`, the same pattern already used in
   `src/app/(app)/tech/page.tsx` and `tech/job/[id]/page.tsx`).

Anything else is `403`. This was chosen over a separate technician-only
route because the underlying mutation logic (state-machine validation,
canonical-state response) is identical and already shared; duplicating it
would reproduce the divergence risk tracked under #50.

## Actor attribution

`status_events.actor_role` previously collapsed any non-admin caller into
`'dispatcher'` (`profile.role === 'admin' ? 'admin' : 'dispatcher'`), which
mislabeled every technician-initiated status update in the audit trail even
though the DB's own check constraint already allows `'technician'`. Fixed to
record `profile.role` directly, which `requireApiRole()` already validated
against the DB's allowed values.

## Matrix drift check (issue #63)

`src/lib/__tests__/authorizationMatrix.test.ts` mechanically enforces that
the matrix above stays true: it statically parses every
`requireApiRole([...])` call site under `src/app/api/**` and cross-checks
its allowed-roles list against a hand-maintained mirror of this file's
table kept in that test. A route's role list changing without this file
being updated to match (or vice versa) fails CI, naming the specific route
— this is the "systematic, not incidental" guarantee the per-route
`route.test.ts` files can't provide on their own, since each of those only
proves its own author's chosen test cases behave as expected.

**Whoever changes a route's `requireApiRole([...])` call must update both
this table and `EXPECTED_MATRIX` in that test file in the same PR.**

Coverage audit performed alongside adding that test: every matrix cell
above has at least one allow-or-deny test in its route's `route.test.ts`,
with one exception found and fixed — `PATCH /api/company` had no test file
at all despite being in this matrix; added
`src/app/api/company/route.test.ts`. For routes where multiple roles are
listed `✓` (e.g. `dispatcher` and `admin` both allowed), a single
representative allow-test is treated as sufficient coverage rather than one
test per allowed role, confirmed by checking that route's code never
branches on `profile.role` after the `requireApiRole()` gate (grep across
`src/app/api/**` shows only `PATCH /api/jobs/[id]` does this, for the
technician own-job-only restriction described above — already covered by
that route's dedicated technician tests). Denial coverage similarly doesn't
need one test per disallowed role: `requireApiRole()`'s rejection
(`!allowedRoles.includes(data.role)`) is a single generic boolean check
with no role-specific branching, so one representative denied-role test
proves the boundary for every other disallowed role too.

## RLS

Reviewed (not redesigned, per issue #49 scope): every RLS policy on `jobs`,
`quotes`, `quote_line_items`, and `technicians` in `supabase/schema.sql` is
`"company users can ..."` — tenant-scoped only, with no role predicate. Role
enforcement lives entirely at the API layer (`requireApiRole()`) for now;
RLS remains tenant-isolation defense-in-depth. Adding role-aware RLS as a
second enforcement layer is a reasonable future hardening step but isn't
required by this issue and is left as a separate, explicitly deferred
finding rather than attempted here.
