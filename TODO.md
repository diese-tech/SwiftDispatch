# SwiftDispatch — Current Status & Next Steps

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

## Open work

See `ISSUE_BACKLOG.md` for scoped issues. Highest priority:

1. **E2E test stability** — localhost E2E timeouts still flaky; needs retry/timeout hardening in `src/e2e/`
2. **CI quality gates** — no combined `test:ci` script that enforces lint + unit + smoke E2E together
3. **Env validation** — no startup fail-fast for missing/malformed required env vars
4. **Payment contract tests** — Stripe/Square/Manual adapters need table-driven tests against the shared contract
5. **RBAC route coverage** — role-based access (admin / dispatcher / technician / unauthenticated) not explicitly tested at the route level

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

For full launch readiness criteria → `docs/LAUNCH_READINESS.md`  
For acceptance tests → `docs/ACCEPTANCE_TESTS.md`  
For operations guide → `OPERATIONS.md`
