# SMS Outbox: Lease Semantics and Delivery Contract

Per issue #51. `src/lib/smsOutbox.ts` runs `sms_outbox` as a lease-based job
queue: rows move `pending → processing → sent`, with a `retrying` branch on
provider failure that eventually reaches `failed` once `max_attempts` is
exhausted. This documents the locking model, the stale-lease recovery added
in #51, and the delivery contract callers should assume.

## Claiming a row

`claimMessage(id)` and the new `reclaimStale(row)` are both a single atomic
conditional `UPDATE ... WHERE id = X AND <status/lease condition>`. Postgres
serializes concurrent `UPDATE`s to the same row; a losing writer's `WHERE`
clause re-evaluates against the winner's already-committed change and
matches zero rows. That's the entire concurrency guarantee this file relies
on — no `SELECT ... FOR UPDATE`, advisory lock, or RPC is needed for
correctness at current scale:

- `claimMessage(id)` — `status IN ('pending','retrying') AND available_at <=
  now()`. Unchanged by #51.
- `reclaimStale(row)` — `status = 'processing' AND locked_at <=
  now() - PROCESSING_LEASE_MS`. New in #51, structurally identical.

Two workers racing `claimMessage` (or two racing `reclaimStale`, or one of
each against the same row) can never both win, and a row with an active
lease can never match `reclaimStale`'s `WHERE` clause at all.

## The stale-lease problem this fixes

Before #51, a row stuck in `processing` — worker crash, interrupted
deployment, or an unhandled failure between `claimMessage()` and
`markSent()`/`markRetry()` — was invisible to every future worker loop
forever: `loadReadyMessages()` (now `loadReadyCandidates()`) only ever
looked at `pending`/`retrying`. That was silent, permanent operational data
loss for whatever job/customer notification never went out.

`processSmsOutboxBatch()` now calls `loadCandidates(limit)`, which merges
two queries — `loadReadyCandidates()` (unchanged) and
`loadStaleProcessingCandidates()` (new: `status = 'processing' AND
locked_at <= staleThreshold`) — sorted by `created_at` and capped to
`limit`. These are two plain `eq`/`in`/`lte` queries merged in JS, not a
single `.or(...)` PostgREST filter string: hand-building that string with
ISO timestamps (which contain `.` and `:`, both structurally significant in
the filter DSL) isn't worth the risk versus the query-builder shapes already
proven elsewhere in this file.

For each candidate, the batch loop calls `reclaimStale()` if the row's
`status` is `processing` (stale, since it only appears as a candidate once
its lease has expired) or `claimMessage()` otherwise. Everything downstream
of a successful claim — send, `markSent`, `markRetry`, attempt/backoff
accounting — is identical for a fresh claim and a stale reclaim; reclaiming
doesn't touch `attempt_count`, `max_attempts`, or reset backoff. The
returned summary's `staleReclaimed` count is tracked separately from
`sent`/`retried`/`failed` so operators can see recovery volume distinctly
from normal throughput.

## Lease duration

`PROCESSING_LEASE_MS = 5 minutes`. A real Twilio API call resolves in well
under a minute even accounting for HTTP-client-level retries, so 5 minutes
gives generous margin: a merely-slow-but-alive worker is never mistaken for
dead, while abandoned work is still recovered promptly rather than left
stranded for hours.

## Delivery contract: at-least-once, not exactly-once

If a worker process dies between `sendSms()` returning a Twilio message SID
and `markSent()` persisting that result, the row's lease eventually expires
and a later worker reclaims and resends it. Twilio has no idempotency-key
mechanism to prevent that duplicate send, and building one (e.g. checking
Twilio's message history before resending) is more machinery than this
outbox needs today.

`dedupe_key` (enforced unique at enqueue time in `enqueueSms()`) bounds
duplicate **enqueues** of the same logical message — it does not bound
duplicate **sends** within one row's reclaim lifecycle. In practice the
exposure window is narrow: a crash has to land specifically between
Twilio's HTTP response and the `markSent()` write, and
`PROCESSING_LEASE_MS` is set well above typical send latency. This is
accepted as a bounded, documented residual risk rather than solved outright
— consistent with the issue's explicit allowance to document an
at-least-once contract when provider-level idempotency isn't available.

## Out of scope (per issue #51)

- A Postgres function/RPC for atomic multi-row claiming (`FOR UPDATE SKIP
  LOCKED`) — reasonable future step if worker count/throughput grows enough
  to matter, not required for correctness at current scale, and not
  verifiable without a live database in this environment.
- Provider-side (Twilio) duplicate-send detection/idempotency.
- Replacing Twilio, or introducing Kafka/SQS/other distributed-queue
  infrastructure.
