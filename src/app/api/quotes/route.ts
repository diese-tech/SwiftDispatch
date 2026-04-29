import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type LineItemInput = {
  name: string;
  price: number;
  quantity: number;
};

export async function POST(request: Request) {
  const profile = await getCurrentProfile();
  const body = await request.json();
  const supabase = await createSupabaseServerClient();

  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .select("id")
    .eq("id", body.job_id)
    .eq("company_id", profile.company_id)
    .single();

  if (jobError || !job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
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

  if (!cleanItems.length || total <= 0) {
    return NextResponse.json({ error: "Quote is empty" }, { status: 400 });
  }

  const { data: quote, error: quoteError } = await supabase
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

  const { error: itemsError } = await supabase.from("quote_line_items").insert(
    cleanItems.map((item) => ({
      quote_id: quote.id,
      ...item,
    })),
  );

  if (itemsError) {
    return NextResponse.json({ error: itemsError.message }, { status: 400 });
  }

  return NextResponse.json({ quote_id: quote.id, total });
}
