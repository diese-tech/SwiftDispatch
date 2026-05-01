import { NextResponse } from "next/server";
import { requireApiProfile } from "@/lib/auth";

async function assertQuoteOwnership(
  supabase: Awaited<ReturnType<typeof requireApiProfile>>["supabase"],
  quoteId: string,
  companyId: string,
) {
  return supabase
    .from("quotes")
    .select("id,jobs!inner(company_id)")
    .eq("id", quoteId)
    .eq("is_demo", false)
    .eq("jobs.company_id", companyId)
    .single();
}

async function recomputeQuoteTotal(
  supabase: Awaited<ReturnType<typeof requireApiProfile>>["supabase"],
  quoteId: string,
) {
  const { data: items, error } = await supabase
    .from("quote_line_items")
    .select("price,quantity")
    .eq("quote_id", quoteId);

  if (error) return { error };

  const total = (items ?? []).reduce(
    (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0),
    0,
  );

  const { error: updateError } = await supabase
    .from("quotes")
    .update({ total })
    .eq("id", quoteId);

  return { total, error: updateError };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  const { id, itemId } = await params;
  const { profile, response, supabase } = await requireApiProfile();
  if (response || !profile) return response;
  if (!profile.company_id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: quote, error: quoteError } = await assertQuoteOwnership(
    supabase,
    id,
    profile.company_id,
  );
  if (quoteError || !quote) {
    return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  }

  const body = await request.json();
  const patch: { name?: string; price?: number; quantity?: number } = {};

  if ("name" in body) patch.name = String(body.name);
  if ("price" in body) patch.price = Number(body.price || 0);
  if ("quantity" in body) patch.quantity = Number(body.quantity || 1);

  const { data, error } = await supabase
    .from("quote_line_items")
    .update(patch)
    .eq("id", itemId)
    .eq("quote_id", id)
    .select("id,quote_id,name,price,quantity")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const { total, error: totalError } = await recomputeQuoteTotal(supabase, id);
  if (totalError) {
    return NextResponse.json({ error: totalError.message }, { status: 400 });
  }

  return NextResponse.json({ item: data, total });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  const { id, itemId } = await params;
  const { profile, response, supabase } = await requireApiProfile();
  if (response || !profile) return response;
  if (!profile.company_id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: quote, error: quoteError } = await assertQuoteOwnership(
    supabase,
    id,
    profile.company_id,
  );
  if (quoteError || !quote) {
    return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  }

  const { error } = await supabase
    .from("quote_line_items")
    .delete()
    .eq("id", itemId)
    .eq("quote_id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const { total, error: totalError } = await recomputeQuoteTotal(supabase, id);
  if (totalError) {
    return NextResponse.json({ error: totalError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, total });
}
