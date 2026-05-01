import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { requireRole } from '@/lib/supabase/withCompany'

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()

  let caller: { companyId: string }
  try {
    caller = await requireRole(supabase, ['admin'])
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: { email?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const email = body.email?.trim().toLowerCase()
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'A valid email is required' }, { status: 400 })
  }

  const adminClient = createSupabaseAdminClient()

  const { data: invited, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
    email,
    {
      data: {
        company_id: caller.companyId,
        role: 'dispatcher',
      },
    },
  )

  if (inviteError || !invited.user) {
    return NextResponse.json(
      { error: inviteError?.message ?? 'Failed to invite user' },
      { status: 500 },
    )
  }

  const { error: insertError } = await supabase.from('users').insert({
    id: invited.user.id,
    email,
    company_id: caller.companyId,
    role: 'dispatcher',
  })

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
