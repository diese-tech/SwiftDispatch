import { NextResponse } from "next/server";
import { requireApiProfile } from "@/lib/auth";
import { generateQuoteApprovalToken } from "@/lib/quoteTokens";
import { assertSmsConsent } from "@/lib/smsGate";
import { sendSms } from "@/lib/twilio";

export async function POST(request: Request) {
  const { profile, response, supabase } = await requireApiProfile();
  if (response || !profile) return response;
  if (!profile.company_id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { quote_id } = await request.json();

  const { data, error } = await supabase
    .from("quotes")
    .select("id, jobs!inner(id,phone,company_id,sms_consent_type)")
    .eq("id", quote_id)
    .eq("is_demo", false)
    .eq("jobs.company_id", profile.company_id)
    .single();

  if (error || !data || !data.jobs) {
    return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const quoteToken = generateQuoteApprovalToken(quote_id);
  const quoteUrl = `${appUrl}/intake/quote/${quoteToken}`;
  const jobs = Array.isArray(data.jobs) ? data.jobs[0] : data.jobs;

  try {
    assertSmsConsent(jobs.sms_consent_type);
    await sendSms(jobs.phone, `Your HVAC quote is ready: ${quoteUrl}`);
  } catch (smsError) {
    const message = smsError instanceof Error ? smsError.message : "Quote SMS failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  await supabase
    .from("quotes")
    .update({ status: "sent", quote_sent_at: new Date().toISOString() })
    .eq("id", quote_id);

  return NextResponse.json({ ok: true });
}
