import { NextResponse } from "next/server";
import { requireApiProfile } from "@/lib/auth";

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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { profile, response, supabase } = await requireApiProfile();
  if (response || !profile) return response;
  const body = await request.json().catch(() => ({}));

  const { data: quote, error: quoteError } = await supabase
    .from("quotes")
    .select("id,jobs!inner(company_id)")
    .eq("id", id)
    .eq("jobs.company_id", profile.company_id)
    .single();

  if (quoteError || !quote) {
    return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("quote_line_items")
    .insert({
      quote_id: id,
      name: body.name ?? "",
      price: Number(body.price ?? 0),
      quantity: Number(body.quantity ?? 1),
    })
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
