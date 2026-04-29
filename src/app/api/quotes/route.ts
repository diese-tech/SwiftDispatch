import { NextResponse } from "next/server";
import { requireApiProfile } from "@/lib/auth";

type LineItemInput = {
  name: string;
  price: number;
  quantity: number;
};

export async function POST(request: Request) {
  const { profile, response, supabase } = await requireApiProfile();
  if (response || !profile) return response;
  const body = await request.json();

  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .select("id")
    .eq("id", body.job_id)
    .eq("company_id", profile.company_id)
    .single();

  if (jobError || !job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const { data: existingQuote } = await supabase
    .from("quotes")
    .select("id,total,status,created_at,quote_sent_at,accepted_at,rejected_at,quote_line_items(id,quote_id,name,price,quantity)")
    .eq("job_id", body.job_id)
    .eq("is_demo", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingQuote && !body.line_items?.length) {
    return NextResponse.json({ quote: existingQuote, quote_id: existingQuote.id });
  }

  const lineItems = (body.line_items ?? []) as LineItemInput[];
  const cleanItems = lineItems
    .filter((item) => item.name?.trim())
    .map((item) => ({
      name: item.name.trim(),
      price: Number(item.price || 0),
      quantity: Number(item.quantity || 1),
    }));
  const total = cleanItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  const { data: quote, error: quoteError } = existingQuote
    ? await supabase
        .from("quotes")
        .update({ total: cleanItems.length ? total : existingQuote.total })
        .eq("id", existingQuote.id)
        .select("id")
        .single()
    : await supabase
        .from("quotes")
        .insert({ job_id: body.job_id, total, status: "draft" })
        .select("id")
        .single();

  if (quoteError || !quote) {
    return NextResponse.json(
      { error: quoteError?.message ?? "Quote failed" },
      { status: 400 },
    );
  }

  if (cleanItems.length) {
    const { error: itemsError } = await supabase.from("quote_line_items").insert(
      cleanItems.map((item) => ({
        quote_id: quote.id,
        ...item,
      })),
    );

    if (itemsError) {
      return NextResponse.json({ error: itemsError.message }, { status: 400 });
    }

    const { data: allItems, error: totalError } = await supabase
      .from("quote_line_items")
      .select("price,quantity")
      .eq("quote_id", quote.id);

    if (totalError) {
      return NextResponse.json({ error: totalError.message }, { status: 400 });
    }

    const nextTotal = (allItems ?? []).reduce(
      (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0),
      0,
    );

    const { error: quoteTotalError } = await supabase
      .from("quotes")
      .update({ total: nextTotal })
      .eq("id", quote.id);

    if (quoteTotalError) {
      return NextResponse.json(
        { error: quoteTotalError.message },
        { status: 400 },
      );
    }

    return NextResponse.json({ quote_id: quote.id, total: nextTotal });
  }

  return NextResponse.json({
    quote_id: quote.id,
    total: existingQuote?.total ?? total,
  });
}
