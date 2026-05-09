import { NextResponse } from 'next/server'
import { processSmsOutboxBatch } from '@/lib/smsOutbox'
import { requireWorkerSecret } from '@/lib/workers'

export async function POST(request: Request) {
  try {
    requireWorkerSecret(request)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unauthorized'
    return NextResponse.json({ error: message }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const requestedLimit = Number(searchParams.get('limit') ?? '25')
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(Math.trunc(requestedLimit), 1), 100)
    : 25

  try {
    const summary = await processSmsOutboxBatch(limit)
    return NextResponse.json({ ok: true, ...summary })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'SMS worker failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
