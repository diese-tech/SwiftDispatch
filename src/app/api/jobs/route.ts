import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const profile = await getCurrentProfile();
  const body = await request.json();
  const supabase = await createSupabaseServerClient();

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
