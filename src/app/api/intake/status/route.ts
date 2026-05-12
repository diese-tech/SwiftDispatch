import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/rateLimit'
import { getClientIp } from '@/lib/requestIp'
import { envNumber } from '@/lib/envNumbers'
import { generateQuoteApprovalToken } from '@/lib/quoteTokens'

function getSecret(): string {
  const secret = process.env.TECH_TOKEN_SECRET
  if (!secret) throw new Error('TECH_TOKEN_SECRET is not set')
  return secret
}

const INTAKE_STATUS_IP_LIMIT = envNumber('INTAKE_STATUS_RATE_LIMIT_PER_IP', 120)
const INTAKE_STATUS_TOKEN_LIMIT = envNumber('INTAKE_STATUS_RATE_LIMIT_PER_TOKEN', 60)
const INTAKE_STATUS_WINDOW_MS = envNumber('INTAKE_STATUS_RATE_LIMIT_WINDOW_MS', 60_000)

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')
  const clientIp = getClientIp(request)

  if (!token) {
    return NextResponse.json({ error: 'Token required' }, { status: 400 })
  }

  if (!(await checkRateLimit(`intake-status:ip:${clientIp}`, INTAKE_STATUS_IP_LIMIT, INTAKE_STATUS_WINDOW_MS))) {
    return NextResponse.json(
      { error: 'Too many status checks. Please try again shortly.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(INTAKE_STATUS_WINDOW_MS / 1000)) } }
    )
  }

  if (!(await checkRateLimit(`intake-status:token:${token}`, INTAKE_STATUS_TOKEN_LIMIT, INTAKE_STATUS_WINDOW_MS))) {
    return NextResponse.json(
      { error: 'Too many status checks for this request. Please try again shortly.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(INTAKE_STATUS_WINDOW_MS / 1000)) } }
    )
  }

  let jobId: string
  try {
    const decoded = jwt.verify(token, getSecret()) as { jobId: string }
    jobId = decoded.jobId
  } catch {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
  }

  const supabase = createSupabaseAdminClient()

  const { data: job, error } = await supabase
    .from('jobs')
    .select(
      'id, status, urgency, customer_name, address, created_at, technician_id, companies(name, phone, email), technicians!jobs_technician_id_fkey(name)'
    )
    .eq('id', jobId)
    .single()

  if (error || !job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

  // Get status events for timing information
  const { data: events } = await supabase
    .from('status_events')
    .select('to_status, created_at')
    .eq('job_id', jobId)
    .order('created_at', { ascending: true })

  const enRouteEvent = events?.find((e) => e.to_status === 'en_route')
  const completedEvent = events?.find((e) => e.to_status === 'completed')

  // Get accepted quote id if status is quote_pending
  let quoteToken: string | null = null
  if (job.status === 'quote_pending') {
    const { data: quote } = await supabase
      .from('quotes')
      .select('id')
      .eq('job_id', jobId)
      .eq('status', 'sent')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (quote) {
      quoteToken = generateQuoteApprovalToken(quote.id)
    }
  }

  const techData = Array.isArray(job.technicians) ? job.technicians[0] : job.technicians

  return NextResponse.json({
    jobId: job.id,
    jobRef: job.id.slice(0, 8).toUpperCase(),
    status: job.status,
    urgency: job.urgency,
    customerName: job.customer_name,
    address: job.address,
    createdAt: job.created_at,
    enRouteAt: enRouteEvent?.created_at ?? null,
    completedAt: completedEvent?.created_at ?? null,
    techName: techData?.name ?? null,
    quoteToken,
    company: job.companies,
  })
}
