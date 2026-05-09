# Load Testing

Use this doc when we want to push SwiftDispatch until something breaks.

## Safety First

- Use a QA or staging tenant, not a live customer tenant.
- Set `DISABLE_OUTBOUND_SMS=true` on the target app before running load against intake or quote SMS paths.
- Prefer a deployed staging URL or a dedicated local dev server with seeded QA data.

## Env

The load scripts read `.env.local` automatically.

Useful variables:

```env
LOAD_BASE_URL=http://localhost:3000
LOAD_COMPANY_SLUG=northwind-comfort-live-qa
LOAD_MULTI_COMPANY_SLUGS=northwind-comfort-live-qa,load-fleet-hvac-1,load-fleet-hvac-2,load-fleet-hvac-3
DISABLE_OUTBOUND_SMS=true
```

Optional tuning:

```env
LOAD_WARMUP_CONNECTIONS=5
LOAD_WARMUP_DURATION_SECONDS=10
LOAD_INTAKE_CONNECTIONS=25
LOAD_INTAKE_DURATION_SECONDS=30
LOAD_SPIKE_CONNECTIONS=75
LOAD_SPIKE_DURATION_SECONDS=15
LOAD_STATUS_CONNECTIONS=40
LOAD_STATUS_DURATION_SECONDS=20

LOAD_TECH_CONCURRENCY=25
LOAD_TECH_DURATION_SECONDS=30
LOAD_TECH_JOB_COUNT=75

LOAD_FLEET_COMPANY_COUNT=4
```

## Public Flow

This stresses the public intake submit path and the customer status-check read path.

```powershell
npm run test:load:public
```

What it does:

- runs one intake preflight request
- captures the returned `statusToken`
- warms up intake traffic
- runs a sustained intake phase
- runs a spike intake phase
- hammers the status page read path

Important note:

- This creates real intake jobs for the target company. Use a QA tenant for repeated runs.

## Technician Action Flow

This stresses the SMS link route used by technicians.

```powershell
npm run test:load:tech
```

What it does:

- looks up the company by `LOAD_COMPANY_SLUG`
- finds one technician in that company
- seeds demo-mode assigned jobs
- signs action tokens with `TECH_TOKEN_SECRET`
- runs concurrent `GET /api/tech-action?token=...` traffic

## Office Flow

This stresses authenticated dispatcher/admin traffic for one company.

```powershell
npm run test:load:office
```

What it does:

- signs in a real dispatcher and admin user through Supabase SSR cookies
- loads `/dispatch` and `/admin`
- creates a job through `POST /api/jobs`
- runs the valid office-side status sequence through `PATCH /api/jobs/[id]`
- records page-read and mutation status codes separately

## Multi-Company Fleet Setup

Use this when we want to simulate several HVAC companies dispatching at once instead of hammering one tenant.

```powershell
npm run seed:load:fleet
```

What it does:

- creates or refreshes `LOAD_FLEET_COMPANY_COUNT` QA companies
- gives each company an admin, dispatcher, three technicians, and one quote template
- uses slugs like `load-fleet-hvac-1`, `load-fleet-hvac-2`, and so on

## Multi-Company Public Flow

This runs intake and status-read load across multiple company slugs in parallel.

```powershell
npm run test:load:multi:public
```

What it does:

- runs one intake preflight per company
- keeps traffic tenant-scoped by `companySlug`
- runs warmup, sustained, spike, and status-read phases for each company in parallel
- prints per-company stats plus fleet totals

## Multi-Company Tech Flow

This runs technician action traffic across multiple companies in parallel.

```powershell
npm run test:load:multi:tech
```

What it does:

- looks up each company from `LOAD_MULTI_COMPANY_SLUGS`
- seeds demo assigned jobs per company
- signs tech action tokens per job
- runs concurrent tech-action traffic across every company at once
- prints fleet-wide aggregate results

## Multi-Company Office Flow

This runs authenticated dispatcher/admin traffic across several companies in parallel.

```powershell
npm run test:load:multi:office
```

What it does:

- signs in one dispatcher and one admin per company slug
- loads `/dispatch` and `/admin` for each company
- creates and advances jobs through the board-side API flow
- reports fleet-wide request and latency totals

## What To Watch First

- `non2xx`, `errors`, and `timeouts`
- latency p95 / p99 under sustained load
- Supabase connection saturation or slower writes
- status-event insert failures
- tech action 429 behavior and limiter consistency
- Vercel function or runtime throttling if run against a deployment

## Break-It Strategy

1. Run `npm run test:load:public` at defaults.
2. Double `LOAD_INTAKE_CONNECTIONS` and `LOAD_SPIKE_CONNECTIONS`.
3. Run `npm run test:load:tech`.
4. Increase `LOAD_TECH_CONCURRENCY` until p95 or non-2xx degrades sharply.
5. Repeat against staging after local bottlenecks are understood.

For multi-company validation:

1. Run `npm run seed:load:fleet`.
2. Set `LOAD_MULTI_COMPANY_SLUGS` to 3-5 fleet tenants plus the main QA tenant.
3. Run `npm run test:load:multi:public`.
4. Run `npm run test:load:multi:tech`.
5. Run `npm run test:load:multi:office`.
6. Raise per-company concurrency gradually instead of jumping straight to huge fleet totals.

## Likely First Failure Points

- Supabase write-heavy flows on intake and status events
- Twilio side effects if SMS disable is forgotten
- tech action limiter behavior under very hot repeated links
- invoice creation latency once payment-enabled quote acceptance is mixed into broader tests
- admin/dispatch page render cost under simultaneous office traffic
