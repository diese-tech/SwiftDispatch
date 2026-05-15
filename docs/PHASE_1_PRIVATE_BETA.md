# SwiftDispatch — Phase 1 Private Beta Scope

**Status:** In progress  
**Goal:** A small HVAC team can complete the full operational workflow without manual DB intervention, external scripts, or developer babysitting.

---

## The Phase 1 Workflow

Phase 1 is complete when this loop is fully operational end-to-end:

```
Customer request
  → Job created (manual or intake form)
  → Dispatcher assigns technician
  → Technician receives SMS, updates status from field
  → Customer receives live SMS updates
  → Technician submits quote (if needed)
  → Customer approves quote
  → Job marked completed
  → Invoice available to print
```

Every step must work without developer intervention. No broken buttons, no dead-end states, no missing guards.

---

## Routes and Screens In Scope

### Customer-facing (unauthenticated)
| Route | Purpose |
|---|---|
| `/intake/[slug]` | Customer submits service request |
| `/intake/status/[token]` | Customer tracks job status |
| `/intake/quote/[token]` | Customer reviews and approves/declines quote |

### Dispatcher / Admin (authenticated)
| Route | Purpose |
|---|---|
| `/login` | Dispatcher and admin sign-in |
| `/dispatch` | Kanban board — live job view |
| `/dispatch/jobs/new` | Create job manually |
| `/job/[id]` | Job detail — assign tech, update status, view history |
| `/admin` | Admin panel |
| `/admin/technicians` | Manage technician records and PINs |
| `/admin/templates` | Quote templates |
| `/admin/settings` | Company slug, timezone, SMS sender name, payment config |
| `/invoice/[jobId]` | Print-ready invoice |

### Technician-facing (PIN auth)
| Route | Purpose |
|---|---|
| `/tech/login` | PIN login |
| `/tech` | Tech portal — active job list |
| `/tech/job/[id]` | Build and submit quote |

### Internal / Background
| Route | Purpose |
|---|---|
| `/api/intake` | Intake form submission |
| `/api/intake/status` | Status token resolution |
| `/api/jobs` | Job CRUD |
| `/api/jobs/[id]` | Job update (status, assignment) |
| `/api/tech-action` | SMS one-tap status links |
| `/api/quotes/*` | Quote and line-item management |
| `/api/send-sms` | Outbound SMS trigger |
| `/api/internal/sms-outbox` | SMS queue worker |
| `/api/admin/technicians` | Technician management |
| `/api/admin/templates` | Template management |
| `/api/admin/settings` | Company settings |

---

## Job Status State Machine

```
new → assigned → en_route → in_progress → quote_pending → completed
                                         ↑
                              quote_pending → in_progress (quote declined)

no_access → new (reschedule)
any active state → cancelled
```

All transitions are enforced by `src/lib/stateMachine.ts`. The state machine must be respected by all API routes and UI actions.

---

## Audit Findings — Blocker / Polish / Defer

### Blockers (must fix before private beta)

| Finding | Issue | Notes |
|---|---|---|
| Multi-tenant auth and Supabase RLS hardening | #9 | Cross-tenant data leakage is a launch blocker. All tenant-owned tables must have RLS. Realtime subscriptions must not leak across tenants. |
| Complete dispatcher-to-technician workflow | #10 | The full loop must work without dead ends or missing guards. Includes: job creation, assignment, SMS delivery, tech status updates, quote flow, completion. |
| API routes must enforce tenant scoping server-side | #9 | `withCompany` / `requireApiProfile` must be used consistently. RLS alone is not sufficient if service role key is used in certain paths. |
| Technician SMS token expiry handling | — | Expired tokens must fail gracefully. Tech must be able to update status via `/tech` portal as fallback. |
| SMS consent gate must hold | — | No SMS must ever be sent without recorded consent. This applies to intake, assignment, quote, and status SMS paths. |

### Important Polish (complete before private beta if time allows)

| Finding | Issue | Notes |
|---|---|---|
| Loading, error, and empty states | #12 | Product must feel trustworthy under realistic use. Blank loading screens and unexplained errors hurt demo confidence. |
| Demo tenant with realistic seeded data | #11 | Private beta demos and onboarding require believable data. Seed/reset process must be documented and repeatable. |
| ~~Fix malformed `.gitignore`~~ | #7 | Resolved and committed. `.gitignore` is clean. |
| Invoice print UX | — | Browser print is the current workaround. Document it clearly in the UI or operations guide. |
| Quote decline dispatcher notification | — | When a customer declines a quote, the system does not alert the tech. Dispatcher must relay manually. This is an acceptable gap for Phase 1 but should be called out in OPERATIONS.md. |

### Defer to Phase 2+

| Finding | Notes |
|---|---|
| PDF invoice downloads | Not needed for private beta. Print → PDF works. |
| Email notifications | All customer communication is SMS for Phase 1. |
| Customer login / job history | Customers track via token link. No accounts needed for Phase 1. |
| Stripe payment integration | Square is wired; manual invoicing is acceptable fallback. |
| Scroll-reveal / landing page animations | Issue #5. Marketing polish deferred. |
| Multi-location / multi-timezone support | Single timezone per company is sufficient for private beta. |
| Advanced analytics | `/analytics` route exists but is out of scope for Phase 1. |
| AI dispatching or routing | Explicitly out of scope. |
| Enterprise permissions (SSO, RBAC expansion) | Phase 2+. |
| Mobile native app | See `MOBILE_APP_ROADMAP.md`. Not Phase 1. |
| Automated tech-decline SMS notification | Quality-of-life improvement. Deferred. |

---

## Non-Goals

- Do not add AI features.
- Do not add new third-party integrations.
- Do not redesign the product UI.
- Do not build enterprise workflows (multi-location, org hierarchies, SSO).
- Do not add customer accounts or login.
- Do not add a native mobile app.
- Do not add heavy marketing animations or redesign the landing page.
- Do not expand the state machine beyond the current job statuses.

---

## Architecture Risks to Monitor

**Tenant isolation via RLS vs service role key**  
Several API routes use the Supabase service role key (admin client) for operations that need to bypass RLS. Each such route must perform its own company-scope check before acting. Any route that uses the admin client and accepts user input must be audited.

**Realtime subscriptions**  
Supabase Realtime channels must filter by `company_id`. A subscription without a company filter could leak job updates across tenants if a user constructs a direct channel.

**Tech SMS tokens**  
Tech action tokens are JWT-signed with `TECH_TOKEN_SECRET`. Tokens are single-use by intent but the outbox does not enforce deduplication at the DB layer. Under load, duplicate delivery of a status update is possible. This is acceptable for Phase 1 but must not corrupt the state machine (already guarded by `isValidTransition`).

**SMS outbox reliability**  
`/api/internal/sms-outbox` is a push worker. If Twilio is unreachable or the worker misses a call, SMS is silently dropped. No retry queue exists today. For Phase 1, document this limitation clearly. Do not add a full retry system unless SMS failures become a blocker in beta.

**Demo mode flag**  
`demo_mode_enabled` on companies gates certain behaviors. Verify it does not suppress security checks or RLS in any path.

---

## Definition of Done (Phase 1)

- [ ] A dispatcher can log in, create a job, assign a technician, and monitor the board.
- [ ] A technician receives an SMS, taps status links, and updates job state from the field.
- [ ] A customer submits a request via the intake form and receives SMS confirmations.
- [ ] A customer can view and approve a quote via SMS link.
- [ ] A completed job has a printable invoice.
- [ ] No cross-tenant data access is possible via any route or realtime subscription.
- [ ] The full workflow is completable using only seeded demo data with no developer intervention.
- [ ] All acceptance tests in `docs/ACCEPTANCE_TESTS.md` pass.
