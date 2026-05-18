import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { validateEnv } from '@/lib/validateEnv'

export async function GET() {
  const checks: Record<string, 'ok' | 'error'> = {}

  try {
    validateEnv()
    checks.env = 'ok'
  } catch {
    checks.env = 'error'
  }

  try {
    const supabase = createSupabaseAdminClient()
    const { error } = await supabase.from('companies').select('id').limit(1)
    checks.database = error ? 'error' : 'ok'
  } catch {
    checks.database = 'error'
  }

  const allOk = Object.values(checks).every((v) => v === 'ok')

  return NextResponse.json(
    { status: allOk ? 'ok' : 'degraded', checks },
    { status: allOk ? 200 : 503 }
  )
}
