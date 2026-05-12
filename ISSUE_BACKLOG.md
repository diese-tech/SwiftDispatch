# SwiftDispatch Repo Backlog (Actionable Issues)

This backlog turns the current TODO note into concrete, scoped issues that can be tackled in upcoming feature branches.

## 1) Stabilize browser E2E flow and remove localhost timeout flakiness
- **Why now:** `TODO.md` explicitly calls out localhost E2E timeout instability.
- **Scope:**
  - Make `src/e2e/setup.ts` resilient to slow startups/retries.
  - Add clearer timeout diagnostics in `src/e2e/job-flow.test.ts`.
  - Split critical-path smoke tests from slower full-flow tests.
- **Acceptance criteria:**
  - `npm run test:e2e` passes reliably across 3 consecutive local runs.
  - Failures include actionable logs (which stage timed out and which URL/step failed).

## 2) Add CI guardrails for lint + unit + E2E smoke
- **Why now:** the repo has scripts for lint/unit/E2E, but no visible baseline task list that enforces all of them together.
- **Scope:**
  - Add a combined verification script (e.g. `test:ci`) in `package.json`.
  - Ensure lint, unit tests, and at least one smoke E2E are run in that script.
- **Acceptance criteria:**
  - A single command validates core quality gates.
  - New contributors can run one command before opening PRs.

## 3) Harden environment validation for runtime-critical integrations
- **Why now:** the codebase includes Supabase, Twilio, and multiple payment providers, which are sensitive to missing/malformed env vars.
- **Scope:**
  - Centralize env checks with typed parsing in a single module.
  - Validate required keys at app startup for each enabled feature flag.
- **Acceptance criteria:**
  - Startup fails fast with clear, non-ambiguous configuration errors.
  - Tests cover invalid/missing env variable scenarios.

## 4) Expand payment provider integration tests
- **Why now:** payment adapters exist for Stripe/Square/Manual but regression risk is high when provider-specific payloads evolve.
- **Scope:**
  - Add table-driven tests for `src/lib/payments/*` covering success/failure edge cases.
  - Validate normalized response contracts from each provider.
- **Acceptance criteria:**
  - Consistent output schema enforced across all providers.
  - Contract tests prevent accidental breaking changes.

## 5) Add role-based route/access coverage for admin → dispatcher → technician flow
- **Why now:** recent work focused on onboarding and role handoff; this should be protected with tests.
- **Scope:**
  - Add tests for allowed/blocked access in tech pages and internal app routes.
  - Include unauthenticated, wrong-role, and valid-role cases.
- **Acceptance criteria:**
  - Route-level access behavior is explicitly tested for each role.
  - Unauthorized attempts produce deterministic responses (redirect or 403).

## 6) Document and automate seeded QA walkthrough lifecycle
- **Why now:** `seed:live-qa` is central to demos and QA, but its usage/assumptions should be explicitly documented.
- **Scope:**
  - Add a short playbook for seeding, login credentials/tenants, and cleanup/reset.
  - Include expected outcomes per role in the walkthrough.
- **Acceptance criteria:**
  - A new teammate can run the demo flow without tribal knowledge.
  - Seed scripts and walkthrough docs stay in sync.

---

## Suggested next feature branches
- `feature/e2e-timeout-stability`
- `feature/ci-quality-gates`
- `feature/env-validation-hardening`
- `feature/payment-contract-tests`
- `feature/rbac-route-coverage`
- `feature/seeded-qa-playbook`
