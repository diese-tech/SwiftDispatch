import { NextResponse } from 'next/server'
import { getPublicSquareConnection } from '@/lib/square'
import { requireApiRole } from '@/lib/auth'
import { SANDBOX_DEMO_SLUGS } from '@/lib/demo'

export async function GET() {
  const { profile, response, supabase } = await requireApiRole(['admin'])
  if (response || !profile) return response

  const { data, error } = await supabase
    .from('companies')
    .select('id, name, slug, timezone, sms_sender_name, payment_provider, payment_config')
    .eq('id', profile.company_id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 })
  }

  return NextResponse.json({
    company: {
      ...data,
      square: getPublicSquareConnection(data.payment_config),
    },
  })
}

export async function PATCH(request: Request) {
  const { profile, response, supabase } = await requireApiRole(['admin'])
  if (response || !profile) return response

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

    // Reserved for purpose-built sandbox tenants (see SANDBOX_DEMO_SLUGS /
    // resetDemoTenant()) -- resetDemoTenant() does a full destructive wipe of
    // whatever company holds one of these slugs, resolved by slug alone with
    // no ownership check. If self-service settings let any admin claim an
    // unclaimed sandbox slug, a real company's data would be swept into the
    // next nightly reset.
    if ((SANDBOX_DEMO_SLUGS as readonly string[]).includes(slug)) {
      return NextResponse.json({ error: 'That slug is reserved' }, { status: 409 })
    }

    // Check slug uniqueness — maybeSingle() returns null (not an error) when no conflict found
    const { data: conflict } = await supabase
      .from('companies')
      .select('id')
      .eq('slug', slug)
      .neq('id', profile.company_id)
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
    .eq('id', profile.company_id)
    .select('id, name, slug, timezone, sms_sender_name, payment_provider, payment_config')
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 })
  }

  return NextResponse.json({
    company: {
      ...data,
      square: getPublicSquareConnection(data.payment_config),
    },
  })
}
