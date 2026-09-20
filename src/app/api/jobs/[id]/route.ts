import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireApiRole } from '@/lib/auth'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { assertValidTransition, type JobStatus } from '@/lib/stateMachine'
import { queueCustomerStatusSms, queueTechnicianAssignmentSms } from '@/lib/jobNotifications'
import type { SmsConsentType } from '@/lib/smsGate'

const PatchJobSchema = z.object({
  status: z.enum(['new', 'assigned', 'en_route', 'in_progress', 'quote_pending', 'completed', 'cancelled', 'no_access']).optional(),
  technician_id: z.string().uuid().nullable().optional(),
  note: z.string().optional(),
  cancellation_reason: z.string().optional(),
})

const TIMESTAMP_COLUMNS: Partial<Record<JobStatus, string>> = {
  assigned:      'assigned_at',
  en_route:      'en_route_at',
  in_progress:   'arrived_at',
  completed:     'completed_at',
  cancelled:     'cancelled_at',
}

// A technician may only move their own assigned job through these statuses,
// and only by sending `status` alone -- no technician (re)assignment, no
// cancellation. This mirrors exactly what TechClientComponents.tsx sends.
const TECHNICIAN_ALLOWED_STATUSES: JobStatus[] = ['en_route', 'in_progress', 'completed']

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { profile, response, supabase } = await requireApiRole(['dispatcher', 'admin', 'technician'])
  if (response || !profile) return response

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = PatchJobSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', fields: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const { status: newStatus, technician_id, note, cancellation_reason } = parsed.data

  if (profile.role === 'technician') {
    const isStatusOnlyRequest =
      newStatus !== undefined &&
      !('technician_id' in parsed.data) &&
      note === undefined &&
      cancellation_reason === undefined
    if (!isStatusOnlyRequest || !TECHNICIAN_ALLOWED_STATUSES.includes(newStatus)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  // Fetch current job
  const { data: currentJob, error: fetchError } = await supabase
    .from('jobs')
    .select('id, status, technician_id, company_id, sms_consent_type, customer_name, phone, address, issue')
    .eq('id', id)
    .eq('company_id', profile.company_id)
    .single()

  if (fetchError || !currentJob) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

  // For a technician caller, the resolved technician row id -- carried forward
  // so the final write can re-assert ownership atomically, not just at this
  // read. Without this, dispatch reassigning the job between this check and
  // the write below would let the former technician's request still land.
  let technicianOwnerId: string | undefined

  if (profile.role === 'technician') {
    const { data: technician } = await supabase
      .from('technicians')
      .select('id')
      .eq('auth_user_id', profile.id)
      .eq('company_id', profile.company_id)
      .maybeSingle()

    if (!technician || currentJob.technician_id !== technician.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    technicianOwnerId = technician.id
  }

  const patch: Record<string, unknown> = {}
  const now = new Date().toISOString()
  let shouldSendAssignmentSms = false

  // Handle status change with state machine validation
  if (newStatus && newStatus !== currentJob.status) {
    try {
      assertValidTransition(currentJob.status as JobStatus, newStatus)
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'Invalid transition' },
        { status: 409 }
      )
    }

    patch.status = newStatus
    const tsCol = TIMESTAMP_COLUMNS[newStatus]
    if (tsCol) patch[tsCol] = now
    if (newStatus === 'cancelled' && cancellation_reason) {
      patch.cancellation_reason = cancellation_reason
    }
  }

  // Handle technician assignment
  if ('technician_id' in parsed.data) {
    // jobs.technician_id is a plain FK with no (technician_id, company_id)
    // tenant constraint, and the jobs update below is scoped only to THIS
    // job's own company_id -- neither stops this job from being assigned a
    // technician_id belonging to a different company. A technician caller
    // can never reach this branch at all (line 51-59 above rejects any
    // request including `technician_id` from a technician role), so this
    // only guards the dispatcher/admin path. Same check, same reasoning as
    // POST /api/jobs's technician_id validation.
    if (technician_id) {
      const { data: technician, error: technicianError } = await supabase
        .from('technicians')
        .select('id')
        .eq('id', technician_id)
        .eq('company_id', profile.company_id)
        .maybeSingle()

      if (technicianError || !technician) {
        return NextResponse.json({ error: 'Technician not found' }, { status: 404 })
      }
    }

    patch.technician_id = technician_id ?? null

    if (technician_id && !currentJob.technician_id) {
      // First assignment — also transition to assigned if currently new
      if (currentJob.status === 'new' && !newStatus) {
        try {
          assertValidTransition(currentJob.status as JobStatus, 'assigned')
          patch.status = 'assigned'
          patch.assigned_at = now
        } catch { /* skip auto-transition if not valid */ }
      }

      // Update technician availability
      await supabase
        .from('technicians')
        .update({ availability_status: 'on_job', current_job_id: id })
        .eq('id', technician_id)
      shouldSendAssignmentSms = true
    } else if (
      technician_id &&
      currentJob.technician_id &&
      technician_id !== currentJob.technician_id
    ) {
      await supabase
        .from('technicians')
        .update({ availability_status: 'available', current_job_id: null })
        .eq('id', currentJob.technician_id)
      await supabase
        .from('technicians')
        .update({ availability_status: 'on_job', current_job_id: id })
        .eq('id', technician_id)
      shouldSendAssignmentSms = true
    } else if (!technician_id && currentJob.technician_id) {
      // Unassignment
      await supabase
        .from('technicians')
        .update({ availability_status: 'available', current_job_id: null })
        .eq('id', currentJob.technician_id)
    }
  }

  if (Object.keys(patch).length === 0) {
    // A requested status that already matches persisted state is a legitimate
    // no-op (e.g. a stale board re-confirming a move that already landed via
    // technician assignment), not a client error — return canonical state
    // instead of surfacing "No changes provided" to the operator.
    if (newStatus && newStatus === currentJob.status) {
      let canonicalQuery = supabase
        .from('jobs')
        .select('*, technicians!jobs_technician_id_fkey(id,name,phone)')
        .eq('id', id)
        .eq('company_id', profile.company_id)
      if (technicianOwnerId) canonicalQuery = canonicalQuery.eq('technician_id', technicianOwnerId)

      const { data: canonicalJob, error: canonicalError } = await canonicalQuery.single()

      if (canonicalError || !canonicalJob) {
        // A technician-scoped miss here means ownership changed since the
        // check above (e.g. reassigned mid-request), not a missing job.
        return technicianOwnerId
          ? NextResponse.json({ error: 'Forbidden' }, { status: 403 })
          : NextResponse.json({ error: 'Job not found' }, { status: 404 })
      }

      return NextResponse.json({ job: canonicalJob })
    }

    return NextResponse.json({ error: 'No changes provided' }, { status: 400 })
  }

  let updateQuery = supabase
    .from('jobs')
    .update(patch)
    .eq('id', id)
    .eq('company_id', profile.company_id)
  if (technicianOwnerId) updateQuery = updateQuery.eq('technician_id', technicianOwnerId)

  const { data, error } = await updateQuery
    .select('*, technicians!jobs_technician_id_fkey(id,name,phone)')
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  if (!data) {
    // Zero rows matched the update predicate. For a technician caller this
    // means ownership changed between the check above and this write (e.g.
    // dispatch reassigned the job mid-request) -- not a missing job.
    return technicianOwnerId
      ? NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      : NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

  // Write status event if status changed. status_events has no INSERT RLS
  // policy for the authenticated role (only SELECT) -- confirmed against
  // the live project for issue #66, so this must go through the admin
  // client like intake/tech-action already do, or the row is silently
  // dropped.
  if (patch.status) {
    const { error: statusEventError } = await createSupabaseAdminClient()
      .from('status_events')
      .insert({
        job_id: id,
        from_status: currentJob.status,
        to_status: patch.status as string,
        actor_id: profile.id,
        actor_role: profile.role,
        note: note ?? null,
      })

    if (statusEventError) {
      console.error('Failed to record status-change status event:', statusEventError)
    }
  }

  const finalStatus = (data.status ?? currentJob.status) as JobStatus

  const needsNotifications = shouldSendAssignmentSms || (patch.status && patch.status !== currentJob.status)
  if (needsNotifications) {
    const [{ data: company }, { data: technician }] = await Promise.all([
      supabase
        .from('companies')
        .select('name, sms_sender_name')
        .eq('id', profile.company_id)
        .single(),
      data.technician_id
        ? supabase
            .from('technicians')
            .select('id, name, phone')
            .eq('id', data.technician_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ])

    if (shouldSendAssignmentSms && technician?.phone) {
      await queueTechnicianAssignmentSms({
        companyId: profile.company_id,
        senderName: company?.sms_sender_name,
        companyName: company?.name,
        technicianId: technician.id,
        technicianPhone: technician.phone,
        jobId: id,
        customerName: currentJob.customer_name,
        address: currentJob.address,
        issue: currentJob.issue,
      })
    }

    if (
      currentJob.phone &&
      (finalStatus === 'assigned' || finalStatus === 'cancelled')
    ) {
      await queueCustomerStatusSms({
        companyId: profile.company_id,
        senderName: company?.sms_sender_name,
        companyName: company?.name,
        customerPhone: currentJob.phone,
        smsConsentType: currentJob.sms_consent_type as SmsConsentType,
        status: finalStatus,
        jobId: id,
        technicianName: technician?.name,
      })
    }
  }

  return NextResponse.json({ job: data })
}
