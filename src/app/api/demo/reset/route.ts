import { NextResponse } from "next/server";
import { requireApiProfile } from "@/lib/auth";
import { resetDemoTenant } from "@/lib/resetDemoTenant";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isDemoCompany } from "@/lib/demo";

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

  if (!isDemoCompany(company)) {
    return NextResponse.json({ error: "Not a demo account" }, { status: 403 });
  }

  // Reset the caller's own company, not whichever demo tenant slug resolves to.
  const result = await resetDemoTenant(profile.company_id);
  return NextResponse.json(result);
}
