import 'server-only'

import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { sendSms } from '@/lib/twilio'

export type SmsOutboxStatus = 'pending' | 'processing' | 'sent' | 'retrying' | 'failed'

type SmsOutboxRow = {
  id: string
  company_id: string
  job_id: string | null
  to_phone: string
  body: string
  message_type: string
  dedupe_key: string
  status: SmsOutboxStatus
  attempt_count: number
  max_attempts: number
  provider_message_id: string | null
  last_error: string | null
  available_at: string
  locked_at: string | null
  sent_at: string | null
  created_at: string
  updated_at: string
}

type EnqueueSmsInput = {
  companyId: string
  jobId?: string | null
  to: string
  body: string
  messageType: string
  dedupeKey: string
}

function nowIso() {
  return new Date().toISOString()
}

function backoffMs(attemptCount: number) {
  const steps = [30_000, 120_000, 300_000, 900_000]
  return steps[Math.min(attemptCount - 1, steps.length - 1)]
}

// A row stuck in 'processing' (worker crashed, deployment interrupted
// execution, or an unhandled failure between claimMessage() and
// markSent()/markRetry()) is otherwise invisible to every future worker
// loop forever -- see reclaimStale() below. 5 minutes is comfortably
// longer than a real Twilio API call ever takes (well under a minute even
// accounting for HTTP-client-level retries), so a merely-slow-but-alive
// worker is never mistaken for dead, while abandoned work is still
// recovered promptly rather than left stranded for hours.
const PROCESSING_LEASE_MS = 5 * 60 * 1000

export async function enqueueSms(input: EnqueueSmsInput): Promise<void> {
  const supabase = createSupabaseAdminClient()
  const { error } = await supabase
    .from('sms_outbox')
    .upsert(
      {
        company_id: input.companyId,
        job_id: input.jobId ?? null,
        to_phone: input.to,
        body: input.body,
        message_type: input.messageType,
        dedupe_key: input.dedupeKey,
        status: 'pending',
        attempt_count: 0,
        max_attempts: 5,
        available_at: nowIso(),
        last_error: null,
        provider_message_id: null,
        sent_at: null,
        locked_at: null,
      },
      { onConflict: 'dedupe_key', ignoreDuplicates: true }
    )

  if (error) {
    throw new Error(`Failed to enqueue SMS: ${error.message}`)
  }
}

async function claimMessage(id: string): Promise<SmsOutboxRow | null> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('sms_outbox')
    .update({
      status: 'processing',
      locked_at: nowIso(),
      updated_at: nowIso(),
    })
    .eq('id', id)
    .in('status', ['pending', 'retrying'])
    .lte('available_at', nowIso())
    .select('*')
    .single()

  if (error || !data) return null
  return data as SmsOutboxRow
}

// Reclaims a row whose lease has expired -- structurally identical to
// claimMessage() above (a single atomic conditional UPDATE), just matching
// 'processing' + a stale locked_at instead of 'pending'/'retrying'. This
// inherits the same concurrency guarantee claimMessage() already relies on:
// Postgres serializes concurrent UPDATEs to the same row, and a second
// worker's UPDATE re-evaluates its WHERE clause against the first worker's
// committed change -- once locked_at is fresh, it matches zero rows. So two
// workers can't both reclaim the same row, and a row with an active
// (non-stale) lease can never match this WHERE clause at all. No new
// concurrency primitive (e.g. a `FOR UPDATE SKIP LOCKED` claim function)
// is needed for correctness at this scale; that would be the next step if
// worker count/throughput grows enough to matter.
//
// Everything downstream of a successful reclaim (send, markSent, markRetry,
// attempt/backoff accounting) is identical to a normal claim -- a
// stale-reclaimed row goes through the exact same send-and-finalize path,
// so existing retry/backoff behavior is unchanged, not reinvented.
async function reclaimStale(row: SmsOutboxRow): Promise<SmsOutboxRow | null> {
  const supabase = createSupabaseAdminClient()
  const staleThreshold = new Date(Date.now() - PROCESSING_LEASE_MS).toISOString()
  const { data, error } = await supabase
    .from('sms_outbox')
    .update({
      status: 'processing',
      locked_at: nowIso(),
      updated_at: nowIso(),
    })
    .eq('id', row.id)
    .eq('status', 'processing')
    .lte('locked_at', staleThreshold)
    .select('*')
    .single()

  if (error || !data) return null
  return data as SmsOutboxRow
}

async function loadReadyCandidates(limit: number): Promise<SmsOutboxRow[]> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('sms_outbox')
    .select('*')
    .in('status', ['pending', 'retrying'])
    .lte('available_at', nowIso())
    .order('created_at', { ascending: true })
    .limit(limit)

  if (error || !data) {
    throw new Error(`Failed to load SMS outbox: ${error?.message ?? 'unknown error'}`)
  }

  return data as SmsOutboxRow[]
}

async function loadStaleProcessingCandidates(limit: number): Promise<SmsOutboxRow[]> {
  const supabase = createSupabaseAdminClient()
  const staleThreshold = new Date(Date.now() - PROCESSING_LEASE_MS).toISOString()
  const { data, error } = await supabase
    .from('sms_outbox')
    .select('*')
    .eq('status', 'processing')
    .lte('locked_at', staleThreshold)
    .order('created_at', { ascending: true })
    .limit(limit)

  if (error || !data) {
    throw new Error(`Failed to load stale SMS outbox rows: ${error?.message ?? 'unknown error'}`)
  }

  return data as SmsOutboxRow[]
}

// Two plain queries merged in JS, rather than one combined `.or(...)`
// PostgREST filter string -- hand-building that string with ISO timestamps
// (which contain '.' and ':', structurally significant in the filter DSL)
// isn't worth the risk when both queries here are the same simple
// eq/in/lte shape already used elsewhere in this file.
async function loadCandidates(limit: number): Promise<SmsOutboxRow[]> {
  const [ready, stale] = await Promise.all([
    loadReadyCandidates(limit),
    loadStaleProcessingCandidates(limit),
  ])

  return [...ready, ...stale]
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .slice(0, limit)
}

async function markSent(message: SmsOutboxRow, providerMessageId: string) {
  const supabase = createSupabaseAdminClient()
  await supabase
    .from('sms_outbox')
    .update({
      status: 'sent',
      provider_message_id: providerMessageId,
      sent_at: nowIso(),
      locked_at: null,
      updated_at: nowIso(),
      last_error: null,
    })
    .eq('id', message.id)
}

async function markRetry(message: SmsOutboxRow, errorMessage: string) {
  const nextAttemptCount = message.attempt_count + 1
  const failed = nextAttemptCount >= message.max_attempts
  const supabase = createSupabaseAdminClient()
  await supabase
    .from('sms_outbox')
    .update({
      status: failed ? 'failed' : 'retrying',
      attempt_count: nextAttemptCount,
      last_error: errorMessage.slice(0, 500),
      available_at: failed
        ? message.available_at
        : new Date(Date.now() + backoffMs(nextAttemptCount)).toISOString(),
      locked_at: null,
      updated_at: nowIso(),
    })
    .eq('id', message.id)
}

// Delivery contract: at-least-once, not exactly-once. If the process dies
// between sendSms() returning a Twilio message SID and markSent()
// persisting it, the row's lease eventually expires and a later worker
// reclaims and resends it -- Twilio has no idempotency-key mechanism to
// prevent that duplicate send, and building one (e.g. checking Twilio's
// message history before resending) is more machinery than this outbox
// needs. dedupe_key (enforced unique at enqueue time, see enqueueSms above)
// bounds duplicate *enqueues* of the same logical message; it does not
// bound duplicate *sends* within one row's reclaim lifecycle. In practice
// the exposure window is narrow -- a crash has to land specifically between
// Twilio's HTTP response and the DB write, and PROCESSING_LEASE_MS is set
// well above typical send latency -- so this is accepted as a bounded,
// documented residual risk rather than solved outright.
export async function processSmsOutboxBatch(limit = 25) {
  const candidates = await loadCandidates(limit)
  let processed = 0
  let staleReclaimed = 0
  let sent = 0
  let retried = 0
  let failed = 0

  for (const candidate of candidates) {
    const wasStale = candidate.status === 'processing'
    const claimed = wasStale ? await reclaimStale(candidate) : await claimMessage(candidate.id)
    if (!claimed) continue

    processed += 1
    if (wasStale) staleReclaimed += 1

    try {
      const providerMessageId = await sendSms(claimed.to_phone, claimed.body)
      await markSent(claimed, providerMessageId)
      sent += 1
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown SMS worker error'
      await markRetry(claimed, message)
      if (claimed.attempt_count + 1 >= claimed.max_attempts) {
        failed += 1
      } else {
        retried += 1
      }
    }
  }

  return {
    scanned: candidates.length,
    processed,
    staleReclaimed,
    sent,
    retried,
    failed,
  }
}
