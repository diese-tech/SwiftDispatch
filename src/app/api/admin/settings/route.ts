import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/supabase/withCompany'

export async function GET() {
  const supabase = await createSupabaseServerClient()

  let caller: { companyId: string }
  try {
    caller = await requireRole(supabase, ['admin'])
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('companies')
    .select('id, name, slug, timezone, sms_sender_name, payment_provider')
    .eq('id', caller.companyId)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 })
  }

  return NextResponse.json({ company: data })
}

export async function PATCH(request: Request) {
  const supabase = await createSupabaseServerClient()

  let caller: { companyId: string }
  try {
    caller = await requireRole(supabase, ['admin'])
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: {
    name?: string
    slug?: string
    timezone?: string
    smsSenderName?: string
    paymentProvider?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const patch: Record<string, unknown> = {}

  if (body.name !== undefined) {
    if (!body.name.trim()) {
      return NextResponse.json({ error: 'name cannot be empty' }, { status: 400 })
    }
    patch.name = body.name.trim()
  }

  if (body.slug !== undefined) {
    const slug = body.slug.trim().toLowerCase().replace(/\s+/g, '-')
    if (!slug) {
      return NextResponse.json({ error: 'slug cannot be empty' }, { status: 400 })
    }

    // Check slug uniqueness — maybeSingle() returns null (not an error) when no conflict found
    const { data: conflict } = await supabase
      .from('companies')
      .select('id')
      .eq('slug', slug)
      .neq('id', caller.companyId)
      .maybeSingle()

    if (conflict) {
      return NextResponse.json(
        { error: 'That slug is already taken by another company' },
        { status: 409 },
      )
    }

    patch.slug = slug
  }

  if (body.timezone !== undefined) patch.timezone = body.timezone
  if (body.smsSenderName !== undefined) {
    const name = body.smsSenderName.trim().slice(0, 20)
    patch.sms_sender_name = name
  }
  if (body.paymentProvider !== undefined) patch.payment_provider = body.paymentProvider

  const { data, error } = await supabase
    .from('companies')
    .update(patch)
    .eq('id', caller.companyId)
    .select('id, name, slug, timezone, sms_sender_name, payment_provider')
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 })
  }

  return NextResponse.json({ company: data })
}
