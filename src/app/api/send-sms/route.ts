import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getTwilioClient } from "@/lib/twilio";

export async function POST(request: Request) {
  const profile = await getCurrentProfile();
  const { quote_id } = await request.json();
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("quotes")
    .select("id, jobs!inner(id,phone,company_id)")
    .eq("id", quote_id)
    .eq("jobs.company_id", profile.company_id)
    .single();

  if (error || !data || !data.jobs) {
    return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const quoteUrl = `${appUrl}/quote/${quote_id}`;
  const jobs = Array.isArray(data.jobs) ? data.jobs[0] : data.jobs;

  await getTwilioClient().messages.create({
    to: jobs.phone,
    from: process.env.TWILIO_PHONE_NUMBER!,
    body: `Your HVAC quote is ready: ${quoteUrl}`,
  });

  await supabase.from("quotes").update({ status: "sent" }).eq("id", quote_id);

  return NextResponse.json({ ok: true });
}
