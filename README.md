# SwiftDispatch

**Dispatch software for HVAC teams that have outgrown spreadsheets, group texts, and whiteboards.**

**Live app:** https://swiftdispatch.app

SwiftDispatch gives dispatchers a live job board, gives technicians one-tap field updates without requiring an app install, and keeps customers informed through automated messaging.

> **Status:** Active product development with a live demo environment.

## What It Does

- **Live dispatch board** for moving jobs from intake through completion
- **Technician status links** for En Route, Arrived, and Complete updates from the field
- **SMS quote approval** for on-site estimates
- **Customer intake forms** for direct service requests
- **Operational analytics** for response time, quote acceptance, revenue, and no-access trends
- **Background SMS delivery** through an outbox/worker model
- **Tenant-aware demo workspace** with automatic daily reset

## Demo

A seeded sandbox is available at https://swiftdispatch.app.

| Field | Value |
| --- | --- |
| URL | https://swiftdispatch.app/login |
| Email | `demo@swiftdispatch.app` |
| Password | `demo` |
| Role | Dispatcher |

The demo workspace resets daily so visitors can freely create, assign, update, and cancel jobs without permanently changing the environment.

## Architecture at a Glance

SwiftDispatch is a web application backed by Supabase and external messaging/payment integrations.

```text
Dispatcher / Customer / Technician
             ↓
        Next.js app
             ↓
          Supabase
             ↓
   SMS + external services
```

Public intake and technician-action paths are designed with rate limiting and asynchronous messaging in mind so user-facing requests do not depend on slow downstream delivery.

## Quick Start

### Requirements

- Node.js/npm
- Supabase project
- Twilio credentials for SMS workflows
- Application URL and secrets from `.env.example`

### Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Apply the SQL migrations under `supabase/migrations/` before exercising database-backed workflows.

For full environment setup and day-to-day operational guidance, see [`OPERATIONS.md`](./OPERATIONS.md).

## Production Notes

For production deployments:

- configure Redis-backed rate limiting with `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`;
- configure `INTERNAL_WORKER_SECRET` and run the SMS worker against the internal outbox endpoint;
- configure `CRON_SECRET` for authenticated demo resets when using the hosted sandbox;
- set all environment variables from `.env.example` in the deployment environment;
- keep public intake and status-update limits tuned through the provided rate-limit configuration rather than hard-coding production thresholds.

The application is designed for Vercel deployment.

## Project Docs

- [`OPERATIONS.md`](./OPERATIONS.md) — setup, onboarding, and operating the product
- [`ROADMAP.md`](./ROADMAP.md) — launch scope and planned product work
- [`CONTRIBUTING.md`](./CONTRIBUTING.md) — contribution workflow
- [`docs/AI_WORKFLOW_GUARDRAILS.md`](./docs/AI_WORKFLOW_GUARDRAILS.md) — required guardrails for AI-assisted implementation

## Engineering Principles

- Prefer the smallest safe change over speculative rewrites.
- Treat queues, retries, idempotency, rollback, indexing, caching, and rate limits as production concerns, not cleanup work.
- Keep public request paths fast and move slow/retryable side effects out of band where practical.
- Avoid leaking tenant, customer, or credential data across trust boundaries.
- Keep operational documentation aligned with the deployed system.

## Roadmap

Current gaps include broader notification channels, customer accounts, and additional payment support. Square-connected payments are supported where configured; Stripe remains future work.
