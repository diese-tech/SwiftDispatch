import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rateLimit'

// 10 attempts per handle per minute before lockout.
// Supabase Auth also applies its own server-side rate limits as a second layer.
const MAX_ATTEMPTS = 10
const WINDOW_MS = 60_000

export async function POST(request: Request) {
  let body: { handle?: string; pin?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const handle = body.handle?.trim().toLowerCase()
  const pin = body.pin?.trim()

  if (!handle || !pin) {
    return NextResponse.json({ error: 'handle and pin are required' }, { status: 400 })
  }

  const allowed = await checkRateLimit(`tech-login:${handle}`, MAX_ATTEMPTS, WINDOW_MS)
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many login attempts. Please wait before trying again.' },
      { status: 429 }
    )
  }

  const email = `${handle}@internal.swiftdispatch.app`
  const supabase = await createSupabaseServerClient()

  const { error } = await supabase.auth.signInWithPassword({ email, password: pin })
  if (error) {
    return NextResponse.json({ error: 'Invalid username or PIN' }, { status: 401 })
  }

  return NextResponse.json({ ok: true })
}
