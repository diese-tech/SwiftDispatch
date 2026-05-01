import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { requireRole } from '@/lib/supabase/withCompany'
import {
  generateTechHandle,
  generatePin,
  techEmail,
  resolveUniqueHandle,
} from '@/lib/techAuth'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()

  let caller: { userId: string; companyId: string; role: string }
  try {
    caller = await requireRole(supabase, ['admin'])
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: {
    firstName?: string
    lastName?: string
    phone?: string
    preferredLast?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { firstName, lastName, phone, preferredLast } = body

  if (!firstName?.trim() || !lastName?.trim() || !phone?.trim()) {
    return NextResponse.json(
      { error: 'firstName, lastName, and phone are required' },
      { status: 400 },
    )
  }

  // Generate unique handle
  const baseHandle = generateTechHandle(firstName.trim(), lastName.trim(), preferredLast?.trim())
  const handle = await resolveUniqueHandle(baseHandle, supabase)

  // Generate PIN
  const pin = generatePin()

  // Create Supabase Auth user via admin client
  const adminClient = createSupabaseAdminClient()
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email: techEmail(handle),
    password: pin,
    email_confirm: true,
  })

  if (authError || !authData.user) {
    return NextResponse.json(
      { error: authError?.message ?? 'Failed to create auth user' },
      { status: 500 },
    )
  }

  // Insert technician record
  const { error: insertError } = await supabase.from('technicians').insert({
    company_id: caller.companyId,
    name: `${firstName.trim()} ${lastName.trim()}`,
    phone: phone.trim(),
    handle,
    auth_user_id: authData.user.id,
    preferred_last: preferredLast?.trim() ?? null,
  })

  if (insertError) {
    // Attempt cleanup of orphaned auth user
    await adminClient.auth.admin.deleteUser(authData.user.id)
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({
    handle,
    pin,
    portalUrl: `${APP_URL}/tech`,
  })
}
