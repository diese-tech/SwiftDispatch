import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { requireApiRole } from '@/lib/auth'

export async function GET() {
  const { profile, response, supabase } = await requireApiRole(['admin'])
  if (response || !profile) return response

  const { data, error } = await supabase
    .from('users')
    .select('id,email,role')
    .eq('company_id', profile.company_id)
    .order('email')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ currentUserId: profile.id, users: data ?? [] })
}

export async function POST(request: Request) {
  const { profile, response, supabase } = await requireApiRole(['admin'])
  if (response || !profile) return response

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
        company_id: profile.company_id,
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
    company_id: profile.company_id,
    role: 'dispatcher',
  })

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
