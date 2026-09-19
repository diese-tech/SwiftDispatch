import { NextResponse } from 'next/server'
import { requireApiRole } from '@/lib/auth'

export async function GET() {
  const { profile, response, supabase } = await requireApiRole(['admin', 'dispatcher'])
  if (response || !profile) return response

  const { data, error } = await supabase
    .from('quote_templates')
    .select('*')
    .eq('company_id', profile.company_id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ templates: data ?? [] })
}

export async function POST(request: Request) {
  const { profile, response, supabase } = await requireApiRole(['admin'])
  if (response || !profile) return response

  let body: {
    name?: string
    lineItems?: unknown[]
    estimatedDurationMinutes?: number
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { name, lineItems, estimatedDurationMinutes } = body

  if (!name?.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }

  if (!Array.isArray(lineItems) || lineItems.length === 0) {
    return NextResponse.json(
      { error: 'lineItems must be a non-empty array' },
      { status: 400 },
    )
  }

  const { data, error } = await supabase
    .from('quote_templates')
    .insert({
      company_id: profile.company_id,
      name: name.trim(),
      line_items: lineItems,
      estimated_duration_minutes: estimatedDurationMinutes ?? null,
      is_active: true,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ template: data })
}
