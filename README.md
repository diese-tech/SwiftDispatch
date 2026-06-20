# SwiftDispatch

**Dispatch software built for HVAC teams — not spreadsheets.**

**Live app:** https://swiftdispatch.app

---

## Why it exists

HVAC dispatch runs on phone calls, group texts, and whiteboards. Jobs get lost. Techs don't know what's next. Customers call back because nobody told them what's happening.

SwiftDispatch replaces that with a single system: dispatchers see every job on a live board, techs get SMS links to update their status from the field, and customers get automatic updates without anyone picking up the phone.

---

## What it does

- **Live dispatch board** — drag jobs across columns as they move from new to complete
- **One-tap tech updates** — techs tap a link in their assignment SMS to mark En Route, Arrived, or Complete. No app install.
- **SMS quote approval** — techs build quotes on-site, customers approve by text
- **Customer intake form** — shareable link (`/intake/your-company`) lets customers submit requests directly
- **Analytics** — response times, quote acceptance rate, revenue per tech, no-access rate

---

## Quick start

1. Clone the repo and run `npm install`
2. Copy `.env.example` to `.env.local` and add your Supabase, Twilio, and app URL credentials
3. Run the SQL migrations in `supabase/migrations/` in order, including the new `sms_outbox` migration for background SMS delivery
4. Create your company and first admin user in Supabase
5. `npm run dev` → open `http://localhost:3000`

For full setup, onboarding your team, and day-to-day workflows → see [OPERATIONS.md](./OPERATIONS.md)  
For phase scope, launch checklist, analytics events, and mobile roadmap → see [ROADMAP.md](./ROADMAP.md)  
For open issues and contributing → see [CONTRIBUTING.md](./CONTRIBUTING.md)

---

## Required AI Workflow Review

Before beginning AI-assisted implementation, debugging, refactoring, migration, or production fix work in this repository, review [docs/AI_WORKFLOW_GUARDRAILS.md](./docs/AI_WORKFLOW_GUARDRAILS.md).

Default behavior: smallest safe change, lowest blast radius, no unrelated file edits, no speculative rewrites, and explicit consideration of scale, queues, caching, indexes, retries, idempotency, rollback, and operational safety.

## Deploying

For production traffic, set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` so technician action rate limiting is backed by Redis instead of in-memory process state.

Set `INTERNAL_WORKER_SECRET` and run an SMS worker against `POST /api/internal/sms-outbox` so customer confirmations are processed out of band instead of on the public intake request path. In local development, `npm run worker:sms` will poll that route every few seconds.

For the demo sandbox, set `CRON_SECRET` to the Vercel cron secret so the daily reset at `/api/internal/reset-demo` is authenticated. The same secret is sent automatically by Vercel's cron runner. To reset manually, send `Authorization: Bearer <INTERNAL_WORKER_SECRET>` to the same endpoint.

Public intake protection is also tunable through `INTAKE_RATE_LIMIT_*` and `INTAKE_STATUS_RATE_LIMIT_*` env vars so you can adjust backpressure without another code deploy.

Standard Vercel deploy. Add all `.env.example` variables in Vercel → Project Settings → Environment Variables. Set `NEXT_PUBLIC_APP_URL` to your Vercel URL.

---

## Not yet available

- Online payments are available when a company connects Square; Stripe is still not wired
- Email notifications
- Customer accounts

## Bundle analysis

To compare client bundle composition before/after performance changes:

1. Install the analyzer (not in default dependencies): `npm install --save-dev @next/bundle-analyzer`
2. Run a normal production build baseline: `npm run build`
3. Run analyzer build: `npm run analyze`
4. Open analyzer output (`.next/analyze/client.html` and server/edge reports when generated) and compare the largest client chunks and shared runtime modules.
