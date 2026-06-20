import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { demoJobs, demoTechnicians } from '@/lib/demo-data'
import { DEMO_COMPANY_SLUG } from '@/lib/demo'

// Re-exported for back-compat with existing import sites.
export { DEMO_COMPANY_SLUG }

export async function resetDemoTenant(): Promise<{ jobsSeeded: number }> {
  const admin = createSupabaseAdminClient()

  // Resolve the demo company by slug, falling back to the demo_mode_enabled
  // flag so a hand-provisioned tenant (slug not set) still resets correctly.
  let { data: company } = await admin
    .from('companies')
    .select('id')
    .eq('slug', DEMO_COMPANY_SLUG)
    .maybeSingle()

  if (!company) {
    const { data: flagged } = await admin
      .from('companies')
      .select('id')
      .eq('demo_mode_enabled', true)
      .limit(1)
      .maybeSingle()
    company = flagged
  }

  if (!company) {
    throw new Error(`Demo company not found (slug: ${DEMO_COMPANY_SLUG} or demo_mode_enabled)`)
  }

  const companyId = company.id

  const { data: technicians } = await admin
    .from('technicians')
    .select('id, name')
    .eq('company_id', companyId)

  const techByName = new Map(
    (technicians ?? []).map((t: { id: string; name: string }) => [t.name, t.id]),
  )
  const techIds = demoTechnicians.map((dt) => techByName.get(dt.name) ?? null)

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

  // Set current_job_id on Mia Torres (demo tech 0) to her most active job
  const miaId = techIds[0]
  if (miaId) {
    const { data: miaJob } = await admin
      .from('jobs')
      .select('id')
      .eq('company_id', companyId)
      .eq('technician_id', miaId)
      .not('status', 'in', '("completed","cancelled","no_access")')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (miaJob) {
      await admin.from('technicians').update({ current_job_id: miaJob.id }).eq('id', miaId)
    }
  }

  return { jobsSeeded: seeded }
}
