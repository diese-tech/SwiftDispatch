# Launch Readiness

Use this as the single source of truth for remaining launch work.

## Status legend
- Priority: P0 (must), P1 (should), P2 (nice)
- Owner: `@owner`
- Status: `todo | in_progress | blocked | done`

## Phase 1 — Prove it works

- [ ] **P0** Core auth + role access matrix
  - Owner: `@owner`
  - Status: `todo`
  - Exit criteria: all route/role smoke tests pass from `docs/QA_SMOKE_TESTS.md` with no blocker defects.
- [ ] **P0** Dispatch → technician → quote → invoice happy path
  - Owner: `@owner`
  - Status: `todo`
  - Exit criteria: one full job lifecycle completed in staging and production-like environment.
- [ ] **P1** Demo tenant reset repeatability
  - Owner: `@owner`
  - Status: `todo`
  - Exit criteria: demo seed/reset runs twice consecutively with no manual DB patching.
- [ ] **P1** Production env validation
  - Owner: `@owner`
  - Status: `todo`
  - Exit criteria: all required env vars present, OAuth/callback URLs verified, Twilio + Supabase live checks pass.

## Phase 2 — Prove people use it

- [ ] **P0** Analytics instrumentation baseline live
  - Owner: `@owner`
  - Status: `todo`
  - Exit criteria: P0/P1 events in `docs/ANALYTICS_EVENTS.md` appear in analytics within 5 minutes.
- [ ] **P1** Funnel visibility dashboard
  - Owner: `@owner`
  - Status: `todo`
  - Exit criteria: can answer weekly: visits → demo clicks → signups → active dispatch usage.
- [ ] **P1** Operational usage heartbeat
  - Owner: `@owner`
  - Status: `todo`
  - Exit criteria: weekly count of jobs created, dispatched, quoted, invoiced, completed is visible.

## Phase 3 — Prove it sells

- [ ] **P0** Demo conversion loop
  - Owner: `@owner`
  - Status: `todo`
  - Exit criteria: every demo request has source, outcome, and next step tracked.
- [ ] **P1** Pricing/packaging validation cadence
  - Owner: `@owner`
  - Status: `todo`
  - Exit criteria: at least 5 sales conversations logged with objections + pricing feedback.
- [ ] **P1** Activation definition and reporting
  - Owner: `@owner`
  - Status: `todo`
  - Exit criteria: one agreed activation event (e.g., first dispatched job) reported weekly.

## Phase 4 — Prove it won’t rot

- [ ] **P0** Release checklist discipline
  - Owner: `@owner`
  - Status: `todo`
  - Exit criteria: every deploy follows `docs/DEPLOYMENT_CHECKLIST.md` and records pass/fail notes.
- [ ] **P0** Error monitoring + on-call response playbook
  - Owner: `@owner`
  - Status: `todo`
  - Exit criteria: critical alert path tested end-to-end with a synthetic failure.
- [ ] **P1** Performance guardrail cadence
  - Owner: `@owner`
  - Status: `todo`
  - Exit criteria: Lighthouse + VibeDoctor rescans tracked each release; regressions assigned within 24h.
- [ ] **P1** Backup/restore confidence
  - Owner: `@owner`
  - Status: `todo`
  - Exit criteria: one restore drill completed and documented.
