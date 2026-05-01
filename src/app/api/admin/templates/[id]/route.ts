import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/supabase/withCompany'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()

  let caller: { companyId: string }
  try {
    caller = await requireRole(supabase, ['admin'])
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Verify the template belongs to this company
  const { data: existing, error: fetchError } = await supabase
    .from('quote_templates')
    .select('id')
    .eq('id', id)
    .eq('company_id', caller.companyId)
    .single()

  if (fetchError || !existing) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 })
  }

  let body: {
    name?: string
    lineItems?: unknown[]
    estimatedDurationMinutes?: number | null
    isActive?: boolean
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const patch: Record<string, unknown> = {}
  if (body.name !== undefined) patch.name = body.name.trim()
  if (body.lineItems !== undefined) patch.line_items = body.lineItems
  if (body.estimatedDurationMinutes !== undefined)
    patch.estimated_duration_minutes = body.estimatedDurationMinutes
  if (body.isActive !== undefined) patch.is_active = body.isActive

  const { data, error } = await supabase
    .from('quote_templates')
    .update(patch)
    .eq('id', id)
    .eq('company_id', caller.companyId)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ template: data })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()

  let caller: { companyId: string }
  try {
    caller = await requireRole(supabase, ['admin'])
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error } = await supabase
    .from('quote_templates')
    .update({ is_active: false })
    .eq('id', id)
    .eq('company_id', caller.companyId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
