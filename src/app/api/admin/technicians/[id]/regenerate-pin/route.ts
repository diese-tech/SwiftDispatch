import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { requireRole } from '@/lib/supabase/withCompany'
import { generatePin } from '@/lib/techAuth'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()

  let caller: { userId: string; companyId: string; role: string }
  try {
    caller = await requireRole(supabase, ['admin'])
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Verify the technician belongs to the caller's company
  const { data: tech, error: techError } = await supabase
    .from('technicians')
    .select('id, auth_user_id')
    .eq('id', id)
    .eq('company_id', caller.companyId)
    .single()

  if (techError || !tech) {
    return NextResponse.json({ error: 'Technician not found' }, { status: 404 })
  }

  if (!tech.auth_user_id) {
    return NextResponse.json(
      { error: 'Technician has no linked auth account' },
      { status: 422 },
    )
  }

  const newPin = generatePin()
  const adminClient = createSupabaseAdminClient()

  const { error: updateError } = await adminClient.auth.admin.updateUserById(
    tech.auth_user_id,
    { password: newPin },
  )

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ pin: newPin })
}
