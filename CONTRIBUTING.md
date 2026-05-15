# SwiftDispatch — Contributing & Current Status

**Phase:** Phase 1 (Private Beta) — in progress  
**Goal:** A small HVAC team can complete the full operational workflow without developer intervention.

---

## What's working

- Full dispatch board (Kanban, live Supabase Realtime)
- Dispatcher creates jobs manually or via customer intake form
- Technician receives SMS assignment, taps one-tap status links (En Route / Arrived / Complete)
- Customer receives SMS updates at each transition
- Tech portal PIN login for quote building
- Quote approval via SMS token link
- Invoice view at `/invoice/[jobId]`
- Admin panel: technicians, quote templates, company settings
- Square payment integration (requires OAuth setup in Admin Settings)
- SMS outbox worker for background delivery (`npm run worker:sms`)
- Superadmin: company creation, cross-company dispatch view
- Seeded QA tenant (`npm run seed:live-qa`)

---

## Known limitations (Phase 1 — accepted)

- Stripe is stubbed: code exists but does not call the Stripe API. Square is the only live payment provider.
- No PDF invoices. Browser Print → Save as PDF is the workaround.
- No email notifications. Customer communication is SMS only.
- No customer accounts. Customers track jobs via token link.
- No automated SMS to technician when a quote is declined (dispatcher must relay manually).
- Single timezone per company, set in Admin → Settings.
- SMS delivery is best-effort — no retry queue if Twilio is unreachable.

---

## Open issues

### 1 — E2E test stability
**Scope:** `src/e2e/setup.ts`, `src/e2e/job-flow.test.ts`
- Make setup resilient to slow startups / retries
- Add clearer timeout diagnostics
- Split critical-path smoke from slower full-flow tests

**Done when:** `npm run test:e2e` passes reliably across 3 consecutive runs with actionable failure logs.

### 2 — CI quality gates
**Scope:** `package.json`
- Add a `test:ci` script combining lint + unit + at least one smoke E2E

**Done when:** a single command validates all core quality gates before opening a PR.

### 3 — Env validation
**Scope:** new module (e.g. `src/lib/env.ts`)
- Centralize env checks with typed parsing
- Fail fast at startup for missing/malformed required vars

**Done when:** startup fails with a clear error for each missing integration; tests cover invalid env scenarios.

### 4 — Payment contract tests
**Scope:** `src/lib/payments/*`
- Table-driven tests for Stripe / Square / Manual covering success and failure edge cases
- Validate normalized response contract across all providers

**Done when:** breaking a provider adapter fails the test suite.

### 5 — RBAC route coverage
**Scope:** tech and admin route handlers
- Tests for allowed / blocked access per role (admin, dispatcher, technician, unauthenticated)
- Deterministic responses for unauthorized attempts

**Done when:** role-based access is explicitly tested for each protected route.

### 6 — Seeded QA playbook
**Scope:** `scripts/seed-live-qa.mjs`, new ops doc section
- Document seed credentials, tenants, and expected outcomes per role

**Done when:** a new teammate can run the full demo flow with no tribal knowledge.

---

## Suggested branch names

- `feature/e2e-timeout-stability`
- `feature/ci-quality-gates`
- `feature/env-validation-hardening`
- `feature/payment-contract-tests`
- `feature/rbac-route-coverage`
- `feature/seeded-qa-playbook`

---

## Development commands

```bash
npm run dev              # local dev server
npm test                 # unit tests (no env vars required)
npm run test:e2e         # integration E2E (requires TEST_INTEGRATION=true + env vars)
npm run seed:live-qa     # reset QA tenant
npm run worker:sms       # run SMS outbox worker locally
npm run lint             # lint
npm run build            # production build
```

For full launch readiness and phase scope → `ROADMAP.md`  
For acceptance tests → `docs/ACCEPTANCE_TESTS.md`  
For operations guide → `OPERATIONS.md`
