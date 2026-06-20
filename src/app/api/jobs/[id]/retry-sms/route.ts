import { NextResponse } from 'next/server'
import { requireApiProfile } from '@/lib/auth'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { profile, response } = await requireApiProfile()
  if (response || !profile) return response
  if (!profile.company_id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (profile.role !== 'admin' && profile.role !== 'dispatcher') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Verify the job belongs to this company using the user-scoped client
  // (admin client used for the outbox write, but we still need to auth the job)
  const admin = createSupabaseAdminClient()

  const { data: job } = await admin
    .from('jobs')
    .select('id')
    .eq('id', id)
    .eq('company_id', profile.company_id)
    .single()

  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

  const now = new Date().toISOString()

  const { data, error } = await admin
    .from('sms_outbox')
    .update({
      status: 'pending',
      attempt_count: 0,
      available_at: now,
      locked_at: null,
      last_error: null,
    })
    .eq('job_id', id)
    .eq('company_id', profile.company_id)
    .eq('status', 'failed')
    .select('id')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ retried: (data ?? []).length })
}
