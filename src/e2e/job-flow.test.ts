/**
 * E2E smoke test: intake → dispatch → technician → invoice
 *
 * Gated behind TEST_INTEGRATION=true — never runs in normal `npm test`.
 * Run with: TEST_INTEGRATION=true npm run test:e2e
 *
 * Requirements:
 *   - NEXT_PUBLIC_APP_URL   — deployed Vercel URL or http://localhost:3000
 *   - NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 *   - TECH_TOKEN_SECRET
 *   - At least one company with a non-null slug and at least one technician
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import jwt from 'jsonwebtoken'
import { createDispatcherSession, fetchAsDispatcher, type DispatcherSession } from './dispatcherSession'

const RUN = process.env.TEST_INTEGRATION === 'true'

describe.skipIf(!RUN)('E2E smoke: intake → dispatch → tech → invoice', () => {
  const BASE = (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '')

  // Lazy: describe.skipIf still evaluates this factory during collection — do not
  // call createClient here or `npm test` fails without Supabase env vars.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let supabase: SupabaseClient<any>
  let TECH_SECRET: string

  // Resolved in beforeAll
  let companySlug: string
  let companyId: string
  let technicianId: string
  let dispatcherSession: DispatcherSession

  // Captured during test run
  let jobId: string
  let statusToken: string
  let quoteId: string

  // ── Setup ──────────────────────────────────────────────────────────────────

  beforeAll(async () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    TECH_SECRET = process.env.TECH_TOKEN_SECRET!
    if (!url || !key || !anonKey || !TECH_SECRET) {
      throw new Error(
        'E2E: set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, ' +
        'SUPABASE_SERVICE_ROLE_KEY, and TECH_TOKEN_SECRET',
      )
    }
    supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    // Dispatcher session for the real assignment mutation seam (step 3 below).
    // Defaults match the seeded live-QA dispatcher used by scripts/seed-live-qa.mjs
    // and scripts/load-office-actions.mjs; override for other companies/environments.
    const dispatcherEmail = process.env.TEST_DISPATCHER_EMAIL ?? 'dispatch@northwind-live-qa.com'
    const dispatcherPassword = process.env.TEST_DISPATCHER_PASSWORD ?? 'serpentine1'
    dispatcherSession = await createDispatcherSession({
      email: dispatcherEmail,
      password: dispatcherPassword,
      supabaseUrl: url,
      anonKey,
    })

    // The test company/technician MUST belong to the authenticated dispatcher:
    // /api/jobs/[id] is company-scoped, so if intake picked a company the
    // dispatcher doesn't belong to, step 3's assignment would 404 even though
    // the product behavior under test is correct. Derive company from the
    // dispatcher's own profile rather than selecting one independently.
    const { data: dispatcherProfile, error: dispatcherProfileError } = await supabase
      .from('users')
      .select('company_id')
      .eq('email', dispatcherEmail)
      .single()

    if (dispatcherProfileError || !dispatcherProfile?.company_id) {
      throw new Error(
        `E2E setup: no users row with a company_id found for dispatcher ${dispatcherEmail}.`,
      )
    }
    companyId = dispatcherProfile.company_id

    const { data: company, error } = await supabase
      .from('companies')
      .select('id, slug')
      .eq('id', companyId)
      .eq('suspended', false)
      .single()

    if (error || !company?.slug) {
      throw new Error(
        `E2E setup: dispatcher ${dispatcherEmail}'s company (${companyId}) is missing ` +
        'a slug or is suspended. Set a company slug in /admin/settings first.',
      )
    }
    companySlug = company.slug

    const { data: tech } = await supabase
      .from('technicians')
      .select('id')
      .eq('company_id', companyId)
      .limit(1)
      .single()

    if (!tech) {
      throw new Error(
        `E2E setup: no technician found for company ${companySlug}. ` +
        'Add one via /admin or the super-admin panel.',
      )
    }
    technicianId = tech.id
  })

  // ── Teardown ───────────────────────────────────────────────────────────────

  afterAll(async () => {
    if (!jobId) return
    // Delete in FK order; errors are non-fatal (test data may be partially created)
    if (quoteId) {
      await supabase.from('quote_line_items').delete().eq('quote_id', quoteId)
      await supabase.from('quotes').delete().eq('id', quoteId)
    }
    await supabase.from('status_events').delete().eq('job_id', jobId)
    await supabase.from('jobs').delete().eq('id', jobId)
    // Reset technician availability in case tests stopped mid-flow
    await supabase
      .from('technicians')
      .update({ availability_status: 'available', current_job_id: null })
      .eq('id', technicianId)
  })

  // ── Steps ──────────────────────────────────────────────────────────────────

  it('1. customer submits intake form', async () => {
    const res = await fetch(`${BASE}/api/intake`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'E2E Test Customer',
        phone: '+15550000001',
        address: '1 Test Lane, Testville TX 00000',
        problemDescription: 'AC not cooling — automated smoke test job, safe to delete',
        urgency: 'scheduled',
        smsConsent: true,
        companySlug,
      }),
    })
    expect(res.status, `intake response: ${await res.clone().text()}`).toBe(200)
    const body = await res.json() as { jobId: string; jobRef: string; statusToken: string }
    expect(body.jobId).toBeTruthy()
    expect(body.jobRef).toMatch(/^[A-F0-9]{8}$/)
    expect(body.statusToken).toBeTruthy()
    jobId = body.jobId
    statusToken = body.statusToken
  })

  it('2. status token resolves to a new job', async () => {
    const res = await fetch(`${BASE}/api/intake/status?token=${statusToken}`)
    expect(res.status).toBe(200)
    const body = await res.json() as { status: string; jobId: string }
    expect(body.status).toBe('new')
    expect(body.jobId).toBe(jobId)
  })

  it('3. dispatcher assigns technician via the real dispatcher mutation API', async () => {
    const res = await fetchAsDispatcher(`${BASE}/api/jobs/${jobId}`, dispatcherSession, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ technician_id: technicianId, status: 'assigned' }),
    })
    expect(res.status, `assign response: ${await res.clone().text()}`).toBe(200)
    const body = await res.json() as { job: { status: string; technician_id: string } }
    expect(body.job.status).toBe('assigned')
    expect(body.job.technician_id).toBe(technicianId)

    // Regression guard for issue #45: repeating the same assignment/status
    // request (mirroring a stale board re-confirming a move that already
    // landed) must not surface the operator-facing "No changes provided"
    // error, and persisted state must remain correct.
    const repeat = await fetchAsDispatcher(`${BASE}/api/jobs/${jobId}`, dispatcherSession, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'assigned' }),
    })
    expect(repeat.status, `repeat assign response: ${await repeat.clone().text()}`).toBe(200)
    const repeatBody = await repeat.json() as { job: { status: string; technician_id: string } }
    expect(repeatBody.job.status).toBe('assigned')
    expect(repeatBody.job.technician_id).toBe(technicianId)

    const { data: job } = await supabase
      .from('jobs')
      .select('status, technician_id, assigned_at')
      .eq('id', jobId)
      .single()
    expect(job?.status).toBe('assigned')
    expect(job?.technician_id).toBe(technicianId)
    expect(job?.assigned_at).toBeTruthy()
  })

  it('4. tech marks en_route via SMS token link', async () => {
    const token = jwt.sign({ jobId, action: 'en_route' }, TECH_SECRET, { expiresIn: '1h' })
    const res = await fetch(`${BASE}/api/tech-action?token=${token}`)
    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).toContain('En Route')
  })

  it('5. tech marks arrived on site', async () => {
    const token = jwt.sign({ jobId, action: 'arrived' }, TECH_SECRET, { expiresIn: '1h' })
    const res = await fetch(`${BASE}/api/tech-action?token=${token}`)
    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).toContain('Arrived on Site')
  })

  it('6. tech marks job complete → quote_pending', async () => {
    const token = jwt.sign({ jobId, action: 'complete' }, TECH_SECRET, { expiresIn: '1h' })
    const res = await fetch(`${BASE}/api/tech-action?token=${token}`)
    expect(res.status).toBe(200)
    const { data: job } = await supabase.from('jobs').select('status').eq('id', jobId).single()
    expect(job?.status).toBe('quote_pending')
  })

  it('7. dispatcher creates and sends quote', async () => {
    const { data: quote, error } = await supabase
      .from('quotes')
      .insert({
        job_id: jobId,
        total: 350,
        status: 'sent',
        quote_sent_at: new Date().toISOString(),
      })
      .select('id')
      .single()
    expect(error).toBeNull()
    expect(quote?.id).toBeTruthy()
    quoteId = quote!.id

    const { error: itemError } = await supabase.from('quote_line_items').insert({
      quote_id: quoteId,
      name: 'AC refrigerant recharge',
      price: 350,
      quantity: 1,
    })
    expect(itemError).toBeNull()
  })

  it('8. customer accepts quote → job completed + invoice generated', async () => {
    const customerToken = jwt.sign({ quoteId }, TECH_SECRET, { expiresIn: '1h' })
    const res = await fetch(`${BASE}/api/quotes/${quoteId}/accept`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: customerToken }),
    })
    expect(res.status, `accept response: ${await res.clone().text()}`).toBe(200)
    const body = await res.json() as { ok: boolean; status: string }
    expect(body.ok).toBe(true)
    expect(body.status).toBe('completed')

    const { data: job } = await supabase
      .from('jobs')
      .select('status, completed_at')
      .eq('id', jobId)
      .single()
    expect(job?.status).toBe('completed')
    expect(job?.completed_at).toBeTruthy()

    const { data: quote } = await supabase
      .from('quotes')
      .select('status, accepted_at')
      .eq('id', quoteId)
      .single()
    expect(quote?.status).toBe('accepted')
    expect(quote?.accepted_at).toBeTruthy()
  })
})
