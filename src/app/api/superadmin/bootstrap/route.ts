import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

const Schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  bootstrapSecret: z.string().min(1),
})

// POST /api/superadmin/bootstrap
// One-shot endpoint to create the first super_admin account.
// Requires SUPER_ADMIN_BOOTSTRAP_SECRET env var to match the request body secret.
// Once a super_admin user exists, this endpoint should be disabled by unsetting the env var.
export async function POST(request: Request) {
  const secret = process.env.SUPER_ADMIN_BOOTSTRAP_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'Bootstrap is disabled' }, { status: 403 })
  }

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = Schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', fields: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const { email, password, bootstrapSecret } = parsed.data

  if (bootstrapSecret !== secret) {
    return NextResponse.json({ error: 'Invalid bootstrap secret' }, { status: 403 })
  }

  const supabase = createSupabaseAdminClient()

  // Ensure no super_admin already exists
  const { data: existing } = await supabase.from('users').select('id').eq('role', 'super_admin').limit(1).single()
  if (existing) {
    return NextResponse.json({ error: 'A super admin account already exists. Disable bootstrap by unsetting SUPER_ADMIN_BOOTSTRAP_SECRET.' }, { status: 409 })
  }

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError || !authData.user) {
    return NextResponse.json({ error: authError?.message ?? 'Failed to create auth user' }, { status: 500 })
  }

  const { error: profileError } = await supabase.from('users').insert({
    id: authData.user.id,
    email,
    company_id: null,
    role: 'super_admin',
  })

  if (profileError) {
    await supabase.auth.admin.deleteUser(authData.user.id)
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  return NextResponse.json({ message: 'Super admin created. Unset SUPER_ADMIN_BOOTSTRAP_SECRET now.' })
}
