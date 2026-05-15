# SwiftDispatch — Roadmap

---

## Phase 1 — Private Beta

**Status:** In progress  
**Goal:** A small HVAC team can complete the full operational workflow without manual DB intervention, external scripts, or developer babysitting.

### The Phase 1 Workflow

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

### Routes in Scope

**Customer-facing (unauthenticated)**

| Route | Purpose |
|---|---|
| `/intake/[slug]` | Customer submits service request |
| `/intake/status/[token]` | Customer tracks job status |
| `/intake/quote/[token]` | Customer reviews and approves/declines quote |

**Dispatcher / Admin (authenticated)**

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

**Technician-facing (PIN auth)**

| Route | Purpose |
|---|---|
| `/tech/login` | PIN login |
| `/tech` | Tech portal — active job list |
| `/tech/job/[id]` | Build and submit quote |

**Internal / Background**

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

### Job Status State Machine

```
new → assigned → en_route → in_progress → quote_pending → completed
                                         ↑
                              quote_pending → in_progress (quote declined)

no_access → new (reschedule)
any active state → cancelled
```

All transitions enforced by `src/lib/stateMachine.ts`.

### Blockers (must fix before private beta)

| Finding | Notes |
|---|---|
| Multi-tenant auth and Supabase RLS hardening | Cross-tenant data leakage is a launch blocker. All tenant-owned tables must have RLS. Realtime subscriptions must not leak across tenants. |
| Complete dispatcher-to-technician workflow | The full loop must work without dead ends or missing guards. |
| API routes must enforce tenant scoping server-side | `withCompany` / `requireApiProfile` must be used consistently. RLS alone is not sufficient if service role key is used in certain paths. |
| Technician SMS token expiry handling | Expired tokens must fail gracefully. Tech must be able to update status via `/tech` portal as fallback. |
| SMS consent gate must hold | No SMS must ever be sent without recorded consent. |

### Important Polish (complete before private beta if time allows)

| Finding | Notes |
|---|---|
| Loading, error, and empty states | Product must feel trustworthy under realistic use. |
| Demo tenant with realistic seeded data | Seed/reset process must be documented and repeatable. |
| ~~Fix malformed `.gitignore`~~ | Resolved and committed. |
| Invoice print UX | Browser print is the current workaround. Document it clearly. |
| Quote decline dispatcher notification | When a customer declines a quote, the system does not alert the tech. Dispatcher must relay manually. Acceptable gap for Phase 1. |

### Deferred to Phase 2+

| Item | Notes |
|---|---|
| PDF invoice downloads | Print → PDF works for Phase 1. |
| Email notifications | All customer communication is SMS for Phase 1. |
| Customer login / job history | Customers track via token link. |
| Stripe payment integration | Square is wired; manual invoicing is the fallback. |
| Multi-location / multi-timezone support | Single timezone per company is sufficient. |
| Advanced analytics | `/analytics` route exists but is out of scope. |
| AI dispatching or routing | Explicitly out of scope. |
| Enterprise permissions (SSO, RBAC expansion) | Phase 2+. |
| Mobile native app | See Phase 2 below. |
| Automated tech-decline SMS notification | Quality-of-life improvement, deferred. |

### Architecture Risks to Monitor

**Tenant isolation via RLS vs service role key** — Several API routes use the Supabase service role key for operations that bypass RLS. Each such route must perform its own company-scope check before acting.

**Realtime subscriptions** — Supabase Realtime channels must filter by `company_id`. A subscription without a company filter could leak job updates across tenants.

**Tech SMS tokens** — Tokens are JWT-signed and single-use by intent, but the outbox does not enforce deduplication at the DB layer. Duplicate status delivery is possible under load but is guarded by `isValidTransition`.

**SMS outbox reliability** — `/api/internal/sms-outbox` is a push worker. If Twilio is unreachable or the worker misses a call, SMS is silently dropped. No retry queue exists. Document this limitation clearly; do not add a full retry system unless SMS failures become a blocker in beta.

### Definition of Done (Phase 1)

- [ ] A dispatcher can log in, create a job, assign a technician, and monitor the board.
- [ ] A technician receives an SMS, taps status links, and updates job state from the field.
- [ ] A customer submits a request via the intake form and receives SMS confirmations.
- [ ] A customer can view and approve a quote via SMS link.
- [ ] A completed job has a printable invoice.
- [ ] No cross-tenant data access is possible via any route or realtime subscription.
- [ ] The full workflow is completable using only seeded demo data with no developer intervention.
- [ ] All acceptance tests in `docs/ACCEPTANCE_TESTS.md` pass.

---

## Launch Readiness Checklist

### Phase 1 — Prove it works

- [ ] **P0** Core auth + role access matrix — exit: all route/role smoke tests pass with no blocker defects.
- [ ] **P0** Dispatch → technician → quote → invoice happy path — exit: one full job lifecycle completed in staging.
- [ ] **P1** Demo tenant reset repeatability — exit: `npm run seed:live-qa` runs twice consecutively with no manual DB patching.
- [ ] **P1** Production env validation — exit: all required env vars present, OAuth/callback URLs verified, Twilio + Supabase live checks pass.

### Phase 2 — Prove people use it

- [ ] **P0** Analytics instrumentation baseline live — exit: P0/P1 events (see Analytics Events below) appear in analytics within 5 minutes.
- [ ] **P1** Funnel visibility dashboard — exit: can answer weekly: visits → demo clicks → signups → active dispatch usage.
- [ ] **P1** Operational usage heartbeat — exit: weekly count of jobs created, dispatched, quoted, invoiced, completed is visible.

### Phase 3 — Prove it sells

- [ ] **P0** Demo conversion loop — exit: every demo request has source, outcome, and next step tracked.
- [ ] **P1** Pricing/packaging validation cadence — exit: at least 5 sales conversations logged with objections and pricing feedback.
- [ ] **P1** Activation definition and reporting — exit: one agreed activation event (e.g., first dispatched job) reported weekly.

### Phase 4 — Prove it won't rot

- [ ] **P0** Release checklist discipline — exit: every deploy follows `docs/DEPLOYMENT_CHECKLIST.md` and records pass/fail notes.
- [ ] **P0** Error monitoring + on-call response playbook — exit: critical alert path tested end-to-end with a synthetic failure.
- [ ] **P1** Performance guardrail cadence — exit: Lighthouse rescans tracked each release; regressions assigned within 24h.
- [ ] **P1** Backup/restore confidence — exit: one restore drill completed and documented.

---

## Analytics Events

Keep event naming stable. Prefer snake_case.

| Event | Trigger | Properties (minimum) | Priority |
|---|---|---|---|
| `demo_clicked` | User clicks demo CTA | `page`, `cta_location`, `utm_source`, `utm_campaign` | P0 |
| `signup_started` | User begins signup form | `page`, `entrypoint`, `utm_source` | P0 |
| `signup_completed` | Account/company signup completed | `plan`, `company_id`, `user_role` | P0 |
| `login_success` | Successful login | `role`, `redirect_to`, `company_id` | P0 |
| `roi_calculator_used` | ROI calculator submitted | `inputs_hash`, `estimated_roi_band`, `page` | P1 |
| `job_created` | New job record created | `company_id`, `source`, `priority`, `is_demo` | P0 |
| `job_dispatched` | Job assigned to technician | `company_id`, `technician_id`, `job_priority` | P0 |
| `tech_status_updated` | Technician posts status | `company_id`, `technician_id`, `status`, `job_id` | P1 |
| `quote_created` | Quote created from job | `company_id`, `job_id`, `line_item_count`, `amount_total` | P0 |
| `invoice_created` | Invoice generated | `company_id`, `job_id`, `amount_total`, `payment_provider` | P1 |
| `job_completed` | Job moved to completed | `company_id`, `job_id`, `resolution_time_minutes` | P0 |

**Implementation notes**
- [ ] Emit events server-side for authoritative business actions when possible.
- [ ] Emit client-side events for top-of-funnel UX interactions (e.g., CTA clicks).
- [ ] Include `company_id` on all product events.
- [ ] Avoid PII in event properties; hash or bucket values where possible.

---

## Phase 2 — Mobile App

### Recommendation

Build phase 2 mobile around technicians first. Dispatcher and customer apps are out of scope.

Why:
- Technician usage is naturally mobile.
- The workflows are already defined in the current product.
- The value is immediate: status updates, customer contact, maps, quote follow-through.
- It keeps scope narrow enough to ship without turning into a second full platform.

### Phase 2 App Scope

**Primary user:** Technician

**Core jobs to be done:**
1. See the assigned job immediately after login.
2. Call the customer.
3. Open directions.
4. Update job status (en route, arrived, quote pending, completed).
5. View job detail and timeline.
6. Open or continue quote workflow.

**Not phase 2:**
- Photo upload
- Push notifications
- Offline mode
- Full invoice handling
- Customer payments

### Existing Routes to Reuse

The mobile app should reuse the same API routes and data contracts, not invent a parallel system:
- `/tech`, `/tech/job/[id]`
- `/intake/[slug]`, `/dispatch`

### Suggested Architecture

**Expo + React Native** — fastest path to iOS and Android from one codebase, good fit for camera, maps, deep linking, and notifications. Keep Supabase auth aligned with the existing product.

### Phase 2 Screens

1. Login
2. Technician home
3. Job detail
4. Quote handoff / quote summary
5. Completion confirmation

### Work Sequence

1. Keep improving mobile web behavior on existing technician and intake routes.
2. Lock the technician app information architecture.
3. Create low-fidelity screen flows from the current route structure.
4. Start the Expo scaffold only after the screen flow is approved.
5. Reuse real API/auth flows from production as early as possible.

### What Not To Do

- Do not build a full dispatcher app.
- Do not build a customer app first.
- Do not split into separate mobile backends.
- Do not overbuild offline sync before the core workflow proves valuable.
