import { NextResponse } from 'next/server'
import { resetDemoTenant } from '@/lib/resetDemoTenant'

function requireResetAuth(request: Request): void {
  const authorization = request.headers.get('authorization')?.trim()
  const workerSecret = process.env.INTERNAL_WORKER_SECRET?.trim()
  const cronSecret = process.env.CRON_SECRET?.trim()

  if (!workerSecret && !cronSecret) {
    throw new Error('No worker secret configured')
  }

  const valid = [workerSecret, cronSecret]
    .filter(Boolean)
    .map((s) => `Bearer ${s}`)

  if (!authorization || !valid.includes(authorization)) {
    throw new Error('Unauthorized')
  }
}

async function handleReset(request: Request): Promise<NextResponse> {
  try {
    requireResetAuth(request)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unauthorized'
    return NextResponse.json({ error: message }, { status: 401 })
  }

  try {
    const result = await resetDemoTenant()
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Reset failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// Vercel cron invokes routes with GET; manual/worker calls may use POST
export const GET = handleReset
export const POST = handleReset
