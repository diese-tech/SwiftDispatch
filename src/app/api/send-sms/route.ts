import { NextResponse } from "next/server";
import { requireApiProfile } from "@/lib/auth";
import { generateQuoteApprovalToken } from "@/lib/quoteTokens";
import { assertSmsConsent } from "@/lib/smsGate";
import { firstSms } from "@/lib/twilio";
import { enqueueSms } from "@/lib/smsOutbox";

export async function POST(request: Request) {
  const { profile, response, supabase } = await requireApiProfile();
  if (response || !profile) return response;
  if (!profile.company_id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { quote_id } = body as { quote_id?: string };
  if (!quote_id || typeof quote_id !== 'string') {
    return NextResponse.json({ error: 'quote_id is required' }, { status: 400 });
  }

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

  const jobs = Array.isArray(data.jobs) ? data.jobs[0] : data.jobs;

  try {
    assertSmsConsent(jobs.sms_consent_type);
  } catch (smsError) {
    const message = smsError instanceof Error ? smsError.message : "SMS consent required";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const quoteToken = generateQuoteApprovalToken(quote_id);
  const quoteUrl = `${appUrl}/intake/quote/${quoteToken}`;

  // Update quote status first, then enqueue SMS (so status is set even if enqueueSms has a transient error)
  await supabase
    .from("quotes")
    .update({ status: "sent", quote_sent_at: new Date().toISOString() })
    .eq("id", quote_id);

  try {
    await enqueueSms({
      companyId: profile.company_id,
      jobId: jobs.id,
      to: jobs.phone,
      messageType: 'quote_approval',
      dedupeKey: `quote-approval:${quote_id}`,
      body: firstSms('SwiftDispatch', `Your HVAC quote is ready for review: ${quoteUrl}`),
    });
  } catch (enqueueError) {
    // Quote status already updated; log the enqueue failure but don't roll back
    console.error('Quote approval SMS enqueue failed:', enqueueError);
    return NextResponse.json(
      { ok: true, warning: 'Quote marked as sent but SMS delivery may be delayed.' },
      { status: 200 }
    );
  }

  return NextResponse.json({ ok: true });
}
