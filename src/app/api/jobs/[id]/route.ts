import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireApiProfile } from '@/lib/auth'
import { assertValidTransition, type JobStatus } from '@/lib/stateMachine'

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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { profile, response, supabase } = await requireApiProfile()
  if (response || !profile) return response
  if (!profile.company_id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

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

  // Fetch current job
  const { data: currentJob, error: fetchError } = await supabase
    .from('jobs')
    .select('id, status, technician_id, company_id, sms_consent_type')
    .eq('id', id)
    .eq('company_id', profile.company_id)
    .single()

  if (fetchError || !currentJob) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

  const patch: Record<string, unknown> = {}
  const now = new Date().toISOString()

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
    } else if (!technician_id && currentJob.technician_id) {
      // Unassignment
      await supabase
        .from('technicians')
        .update({ availability_status: 'available', current_job_id: null })
        .eq('id', currentJob.technician_id)
    }
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'No changes provided' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('jobs')
    .update(patch)
    .eq('id', id)
    .eq('company_id', profile.company_id)
    .select('*, technicians(id,name,phone)')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // Write status event if status changed
  if (patch.status) {
    await supabase.from('status_events').insert({
      job_id: id,
      from_status: currentJob.status,
      to_status: patch.status as string,
      actor_id: profile.id,
      actor_role: profile.role === 'admin' ? 'admin' : 'dispatcher',
      note: note ?? null,
    })
  }

  return NextResponse.json({ job: data })
}
