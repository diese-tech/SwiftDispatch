import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { demoJobs, demoTechnicians, demoTemplate } from '@/lib/demo-data'
import { DEMO_COMPANY_SLUG, SANDBOX_DEMO_SLUGS, isSandboxDemoCompany } from '@/lib/demo'

// Re-exported for back-compat with existing import sites.
export { DEMO_COMPANY_SLUG }

type AdminClient = ReturnType<typeof createSupabaseAdminClient>

/**
 * Reset demo tenant job data. This is a FULL DESTRUCTIVE WIPE (every job,
 * quote, and status_event for the target company, not just is_demo=true
 * rows) -- it must only ever run against a purpose-built sandbox tenant on
 * SANDBOX_DEMO_SLUGS, never a company resolved from the `demo_mode_enabled`
 * flag alone. A real customer's company could carry that same flag without
 * ever being safe to wipe -- resolving this function's target from the flag
 * would let a nightly cron or a stray "reset demo" click delete a real
 * customer's job history.
 *
 * Pass `targetCompanyId` to reset one specific, already-authorized sandbox
 * company -- this is what the in-app "Reset data" button does. The slug is
 * re-verified here (not just by the caller) since a full wipe is too
 * dangerous to trust a single call site to gate correctly.
 *
 * When omitted (the nightly cron), every company whose slug is on
 * SANDBOX_DEMO_SLUGS is reset in turn and the seeded counts are summed.
 */
export async function resetDemoTenant(targetCompanyId?: string): Promise<{ jobsSeeded: number }> {
  const admin = createSupabaseAdminClient()

  if (targetCompanyId) {
    const { data: company } = await admin
      .from('companies')
      .select('id, slug')
      .eq('id', targetCompanyId)
      .maybeSingle()

    if (!isSandboxDemoCompany(company)) {
      throw new Error(`Refusing to reset non-sandbox company ${targetCompanyId}`)
    }

    return resetOneCompany(admin, targetCompanyId)
  }

  const { data: companies } = await admin
    .from('companies')
    .select('id')
    .in('slug', SANDBOX_DEMO_SLUGS)

  if (!companies || companies.length === 0) {
    throw new Error(`No sandbox demo companies found (slugs: ${SANDBOX_DEMO_SLUGS.join(', ')})`)
  }

  let jobsSeeded = 0
  for (const company of companies) {
    const result = await resetOneCompany(admin, company.id)
    jobsSeeded += result.jobsSeeded
  }
  return { jobsSeeded }
}

async function resetOneCompany(admin: AdminClient, companyId: string): Promise<{ jobsSeeded: number }> {
  // Ordered by created_at, matching the original seed script's insertion
  // order (TECHNICIANS in scripts/seed-demo-tenant.mjs), so this lines up
  // positionally with demoTechnicians regardless of whether a technician's
  // name/phone has since drifted -- the old name-keyed lookup broke
  // silently the moment a technician was renamed (that row would then be
  // orphaned from every future reseed's assignments). Only name/phone are
  // restored here, never handle/pin/auth_user_id -- those are the actual
  // Supabase Auth login identity and resetting them would break the
  // technician's own credentials.
  const { data: technicians } = await admin
    .from('technicians')
    .select('id, name, phone')
    .eq('company_id', companyId)
    .order('created_at', { ascending: true })

  const techRows = technicians ?? []
  const techIds = demoTechnicians.map((_, i) => techRows[i]?.id ?? null)

  for (let i = 0; i < demoTechnicians.length; i += 1) {
    const row = techRows[i]
    const canonical = demoTechnicians[i]
    if (row && (row.name !== canonical.name || row.phone !== canonical.phone)) {
      await admin.from('technicians').update({ name: canonical.name, phone: canonical.phone }).eq('id', row.id)
    }
  }

  // Restore the canonical quote template baseline (name, duration, line
  // items) -- an admin could otherwise drift it via /admin/templates and
  // every future demo walkthrough would build quotes against stale copy.
  const { data: existingTemplate } = await admin
    .from('quote_templates')
    .select('id')
    .eq('company_id', companyId)
    .eq('name', demoTemplate.name)
    .maybeSingle()

  if (existingTemplate) {
    await admin.from('quote_templates').update(demoTemplate).eq('id', existingTemplate.id)
  } else {
    await admin.from('quote_templates').insert({ company_id: companyId, ...demoTemplate })
  }

  // Unlink technician current_job references before deleting jobs
  await admin
    .from('technicians')
    .update({ current_job_id: null, availability_status: 'available' })
    .eq('company_id', companyId)

  // Fetch existing job IDs
  const { data: existingJobs } = await admin
    .from('jobs')
    .select('id')
    .eq('company_id', companyId)

  if (existingJobs && existingJobs.length > 0) {
    const jobIds = existingJobs.map((j: { id: string }) => j.id)

    await admin.from('sms_outbox').delete().eq('company_id', companyId)
    await admin.from('status_events').delete().in('job_id', jobIds)

    const { data: existingQuotes } = await admin
      .from('quotes')
      .select('id')
      .in('job_id', jobIds)

    if (existingQuotes && existingQuotes.length > 0) {
      const quoteIds = existingQuotes.map((q: { id: string }) => q.id)
      await admin.from('quote_line_items').delete().in('quote_id', quoteIds)
      await admin.from('quotes').delete().in('id', quoteIds)
    }

    await admin.from('jobs').delete().eq('company_id', companyId)
  }

  // Re-seed fresh jobs
  const now = Date.now()
  let seeded = 0
  const TERMINAL_STATUSES = ['completed', 'cancelled', 'no_access']
  // Oldest active job per technician wins -- matches the (technician_id, status)
  // semantics PATCH /api/jobs/[id] uses for real assignments, so the tech rail's
  // "on job" state agrees with what the kanban cards show for this tech.
  const techActiveJobs = new Map<string, { jobId: string; createdAt: number }>()

  for (const demoJob of demoJobs) {
    const createdAt = new Date(now - demoJob.ageMinutes * 60_000)
    const assignedAt = new Date(createdAt.getTime() + 8 * 60_000)
    const enRouteAt = new Date(createdAt.getTime() + 18 * 60_000)
    const arrivedAt = new Date(createdAt.getTime() + 40 * 60_000)
    const quoteAt = new Date(createdAt.getTime() + 55 * 60_000)
    const quoteSentAt = new Date(createdAt.getTime() + 58 * 60_000)
    const completedAt = new Date(createdAt.getTime() + 90 * 60_000)

    const isAssigned = !['new', 'cancelled'].includes(demoJob.status)
    const techId = demoJob.techIndex !== null ? (techIds[demoJob.techIndex] ?? null) : null


    const jobPayload: Record<string, unknown> = {
      customer_name: demoJob.customerName,
      phone: demoJob.phone,
      address: demoJob.address,
      issue: demoJob.issue,
      status: demoJob.status,
      urgency: demoJob.urgency,
      source: demoJob.source,
      sms_consent_type: demoJob.source === 'intake' ? 'intake_form' : 'verbal_logged',
      technician_id: isAssigned ? techId : null,
      company_id: companyId,
      created_at: createdAt.toISOString(),
      is_demo: true,
    }

    if (isAssigned) jobPayload.assigned_at = assignedAt.toISOString()
    if (['en_route', 'in_progress', 'quote_pending', 'completed'].includes(demoJob.status)) {
      jobPayload.en_route_at = enRouteAt.toISOString()
    }
    if (['in_progress', 'quote_pending', 'completed'].includes(demoJob.status)) {
      jobPayload.arrived_at = arrivedAt.toISOString()
    }
    if (demoJob.status === 'completed') {
      jobPayload.completed_at = completedAt.toISOString()
    }
    if (demoJob.status === 'cancelled') {
      jobPayload.cancelled_at = new Date(createdAt.getTime() + 20 * 60_000).toISOString()
    }

    const { data: job } = await admin.from('jobs').insert(jobPayload).select('id').single()
    if (!job) continue

    if (isAssigned && techId && !TERMINAL_STATUSES.includes(demoJob.status)) {
      const existing = techActiveJobs.get(techId)
      if (!existing || createdAt.getTime() < existing.createdAt) {
        techActiveJobs.set(techId, { jobId: job.id, createdAt: createdAt.getTime() })
      }
    }

    // Status event history
    const events: Array<{ from: string | null; to: string; offsetMs: number; role: string }> = [
      { from: null, to: 'new', offsetMs: 0, role: demoJob.source === 'intake' ? 'customer' : 'dispatcher' },
    ]
    if (isAssigned) events.push({ from: 'new', to: 'assigned', offsetMs: 8 * 60_000, role: 'dispatcher' })
    if (['en_route', 'in_progress', 'quote_pending', 'completed'].includes(demoJob.status))
      events.push({ from: 'assigned', to: 'en_route', offsetMs: 18 * 60_000, role: 'technician' })
    if (['in_progress', 'quote_pending', 'completed'].includes(demoJob.status))
      events.push({ from: 'en_route', to: 'in_progress', offsetMs: 40 * 60_000, role: 'technician' })
    if (['quote_pending', 'completed'].includes(demoJob.status))
      events.push({ from: 'in_progress', to: 'quote_pending', offsetMs: 60 * 60_000, role: 'technician' })
    if (demoJob.status === 'completed')
      events.push({ from: 'quote_pending', to: 'completed', offsetMs: 90 * 60_000, role: 'customer' })
    if (demoJob.status === 'no_access')
      events.push({ from: 'assigned', to: 'no_access', offsetMs: 30 * 60_000, role: 'technician' })
    if (demoJob.status === 'cancelled')
      events.push({ from: 'new', to: 'cancelled', offsetMs: 20 * 60_000, role: 'dispatcher' })

    await admin.from('status_events').insert(
      events.map((e) => ({
        job_id: job.id,
        from_status: e.from,
        to_status: e.to,
        actor_role: e.role,
        created_at: new Date(createdAt.getTime() + e.offsetMs).toISOString(),
      })),
    )

    // Quote and line items
    if (demoJob.quote && demoJob.quoteStatus) {
      const total = demoJob.quote.reduce((sum, item) => sum + item.price * item.quantity, 0)
      const { data: quote } = await admin
        .from('quotes')
        .insert({
          job_id: job.id,
          total,
          total_amount: total,
          status: demoJob.quoteStatus,
          created_at: quoteAt.toISOString(),
          quote_sent_at: quoteSentAt.toISOString(),
          accepted_at:
            demoJob.quoteStatus === 'accepted'
              ? new Date(quoteSentAt.getTime() + 18 * 60_000).toISOString()
              : null,
          is_demo: true,
        })
        .select('id')
        .single()

      if (quote) {
        await admin.from('quote_line_items').insert(
          demoJob.quote.map((item) => ({
            quote_id: quote.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
          })),
        )
      }
    }

    seeded++
  }

  // Reflect each technician's active job in their availability, so the tech
  // rail (available/on job) agrees with what the kanban cards show them doing.
  for (const [techId, { jobId }] of techActiveJobs) {
    await admin.from('technicians').update({ availability_status: 'on_job', current_job_id: jobId }).eq('id', techId)
  }

  return { jobsSeeded: seeded }
}
