import { NextResponse } from "next/server";
import { requireApiProfile } from "@/lib/auth";

export async function POST(request: Request) {
  const { profile, response, supabase } = await requireApiProfile();
  if (response || !profile) return response;
  const body = await request.json();

  const { data, error } = await supabase
    .from("jobs")
    .insert({
      customer_name: body.customer_name,
      phone: body.phone,
      address: body.address,
      issue: body.issue,
      status: "New",
      company_id: profile.company_id,
    })
    .select("*, technicians(id,name,phone)")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ job: data });
}
