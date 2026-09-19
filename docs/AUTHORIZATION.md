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

## RLS

Reviewed (not redesigned, per issue #49 scope): every RLS policy on `jobs`,
`quotes`, `quote_line_items`, and `technicians` in `supabase/schema.sql` is
`"company users can ..."` — tenant-scoped only, with no role predicate. Role
enforcement lives entirely at the API layer (`requireApiRole()`) for now;
RLS remains tenant-isolation defense-in-depth. Adding role-aware RLS as a
second enforcement layer is a reasonable future hardening step but isn't
required by this issue and is left as a separate, explicitly deferred
finding rather than attempted here.
