import { NextResponse } from "next/server";
import { requireApiProfile } from "@/lib/auth";
import { resetDemoTenant } from "@/lib/resetDemoTenant";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSandboxDemoCompany } from "@/lib/demo";

export async function POST() {
  const { profile, response } = await requireApiProfile();
  if (!profile) return response!;
  if (!profile.company_id) {
    return NextResponse.json({ error: "No company" }, { status: 403 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: company } = await supabase
    .from("companies")
    .select("slug, demo_mode_enabled")
    .eq("id", profile.company_id)
    .single();

  // resetDemoTenant() does a full destructive wipe (every job/quote/
  // status_event, not just is_demo=true rows) -- isSandboxDemoCompany()
  // (purpose-built sandbox slugs only) is required here, not the looser
  // isDemoCompany() flag check, since a real customer's company could also
  // carry demo_mode_enabled=true without ever being safe to wipe.
  if (!isSandboxDemoCompany(company)) {
    return NextResponse.json({ error: "Not a demo account" }, { status: 403 });
  }

  // Reset the caller's own company, not whichever demo tenant slug resolves to.
  const result = await resetDemoTenant(profile.company_id);
  return NextResponse.json(result);
}
