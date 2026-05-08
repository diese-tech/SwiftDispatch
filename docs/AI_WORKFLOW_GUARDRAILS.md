# AI Workflow Guardrails

Review this document before implementation, debugging, refactoring, migrations, or production fixes in this repository.

## Core Rule

Move fast, but move surgically. Prefer the smallest safe change that solves the measured problem. Avoid broad rewrites, speculative refactors, or unrelated cleanup.

## Repo-Specific Focus

- Preserve tenant isolation.
- Make SMS, dispatch, and event jobs retry-safe.
- Prefer queue-based async processing over synchronous fan-out.
- Watch connection pool pressure and realtime scaling behavior.
- Isolate public, admin, and background workloads.
- Minimize blast radius around auth, billing, invoicing, and customer data.
- Plan safe migrations and rollback paths.

## Required Before Changing Code

- Identify the specific problem and files likely involved.
- Name the expected impact and rollback path.
- Check whether the change affects public traffic, background jobs, auth, billing, customer data, data integrity, or production operations.
- Avoid touching unrelated files.

## Architecture Defaults

- Prefer queue-based async processing over synchronous fan-out.
- Prefer append-only events or buffers over hot-row mutation.
- Prefer current-state projections over live aggregation queries.
- Prefer indexed lookups over raw-table scans.
- Prefer bounded concurrency, batching, and backoff.
- Prefer idempotent and retry-safe jobs.

## Change Review Checklist

Before finalizing a change, answer what changed, why it is safe, what could break, how to roll back, and what validation proves the change.
