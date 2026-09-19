# Client Mutation Inventory

Per issue #50. Every client-side `fetch()` call that mutates server state,
classified per the issue's taxonomy, with what changed and what's still open.

- **optimistic** — UI changes before the request resolves.
- **pessimistic** — UI changes only after a confirmed response.
- **server-canonical-required** — success path should (and does) consume the
  server's returned entity rather than trust a client-computed value.

The systemic bug this issue targets: an unguarded `await fetch(...)` — no
try/catch — means a rejected promise (offline, DNS failure, aborted request)
skips whatever cleanup/rollback sits after it. For a pessimistic flow that's
a stuck loading flag; for an optimistic one it's silent, permanent
divergence from server truth.

## Fixed in #50

| File / handler | Endpoint | Class | Before | After |
|---|---|---|---|---|
| `KanbanBoard.confirmMove()` | `PATCH /api/jobs/[id]` | optimistic | Unguarded fetch; rollback only on non-2xx, never on rejection. Canonical response discarded on success. | Routed through `moveJobStatus()` (`src/lib/jobMutations.ts`, built on `fetchMutation`). Rolls back on HTTP failure **and** transport failure alike. Success reconciles with the canonical server job via `reconcileCanonicalJob()`. |
| `KanbanBoard.createJob()` | `POST /api/jobs` | pessimistic / server-canonical-required | Unguarded fetch; `saving` stuck `true` forever on rejection. | Routed through `createJobRequest()`. `setSaving(false)` now runs unconditionally since the request function never throws. |
| `technicianAssignment.ts: assignTechnician()` | `PATCH /api/jobs/[id]` | optimistic | Already correct (fixed in #45/PR #48) — its own try/catch + rollback contract. | Same public behavior, now implemented as a thin wrapper over the shared `fetchMutation()` instead of a parallel hand-rolled implementation. |
| `QuoteBuilder.updateItem()` | `PATCH /api/quotes/[id]/line-items/[itemId]` | **optimistic, previously no rollback at all** | Edit applied immediately; never reverted on HTTP failure *or* transport failure. Unguarded fetch also left `savingIds` stuck on rejection. | Captures the pre-edit item; rolls back to it on any failure kind; on success, replaces with the server-returned item instead of trusting the local edit forever. |
| `QuoteBuilder.deleteItem()` | `DELETE /api/quotes/[id]/line-items/[itemId]` | **optimistic, previously no rollback at all** | Row removed immediately; never restored on HTTP failure *or* transport failure (rejection skipped even the existing error message). | Captures the pre-delete `items` array; restores it on any failure kind. |
| `QuoteBuilder.ensureQuote()` / `addLineItem()` / `sendQuote()` | `POST /api/quotes`, `POST /api/quotes/[id]/line-items`, `POST /api/send-sms` | pessimistic | Unguarded fetch; a rejection left `generalError` unset (silently swallowed) or `sendStatus` stuck at `"sending"` forever. | Routed through `fetchMutation()` — same UI copy, but a rejected fetch now surfaces the same failure path as an HTTP error instead of hanging. |

Shared abstraction: `src/lib/apiMutation.ts` — `fetchMutation<T>(input, init,
extract)` returns a `MutationResult<T>` (`{ok:true, data}` or `{ok:false,
kind: 'http'|'network'|'invalid_response', message, status?}`) and never
throws. `extract` pulls the caller's expected field out of the parsed body;
a 2xx response missing it is treated as `invalid_response`, not a false
success.

## Reviewed, deferred (not fixed in #50)

None of these are optimistic — the bug present is a stuck loading flag on a
rejected fetch (the button stays disabled), not silent data divergence.
Lower severity than the optimistic-without-rollback bugs above, and fixing
every mutation surface in the codebase in one PR is explicitly out of scope
for this issue ("make client mutation behavior predictable first, then let
individual workflows remain simple").

| File / handler | Endpoint | Issue present |
|---|---|---|
| `CommandPalette.createJob()` | `POST /api/jobs` | Unguarded fetch; `newJobState` stuck at `"saving"` on rejection. |
| `SmsFailurePanel.retry()` | `POST /api/jobs/[id]/retry-sms` | Unguarded fetch; status stuck at `"retrying"` on rejection. |
| `AcceptQuoteButton.acceptQuote()` | `PATCH /api/quotes/[id]/accept` | Unguarded fetch; `loading` stuck `true` on rejection; no error UI at all today for a non-2xx response either. |
| `QuoteApprovalForm.handleAccept()` / `handleDecline()` | `PATCH /api/quotes/[id]/accept`, `POST /api/quotes/[id]/decline` | Same stuck-loading-on-rejection pattern. |
| `ResetDemoButton.handleReset()` | `POST /api/demo/reset` | Has try/finally (loading correctly clears), but no `catch` — a network failure is never surfaced to the operator. |

## Already correct — no change needed

`TechPhoneModal.postStatus()`, `TechClientComponents.TechJobActionsClient.postStatus()`,
`IntakeForm.onSubmit()`, `tech/login onSubmit()` — all already wrap their
fetch in try/catch/finally, clear loading unconditionally, and pull
canonical state via a refetch/`router.refresh()` on success.
