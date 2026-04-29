import { NextResponse } from "next/server";
import { requireApiProfile } from "@/lib/auth";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { profile, response, supabase } = await requireApiProfile();
  if (response || !profile) return response;

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
    .from("quotes")
    .update({
      status: "accepted",
      accepted_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id,status,accepted_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ quote: data });
}
