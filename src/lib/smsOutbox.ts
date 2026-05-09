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

async function loadReadyMessages(limit: number): Promise<SmsOutboxRow[]> {
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

export async function processSmsOutboxBatch(limit = 25) {
  const ready = await loadReadyMessages(limit)
  let processed = 0
  let sent = 0
  let retried = 0
  let failed = 0

  for (const candidate of ready) {
    const claimed = await claimMessage(candidate.id)
    if (!claimed) continue

    processed += 1

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
    scanned: ready.length,
    processed,
    sent,
    retried,
    failed,
  }
}
