import { NextResponse } from "next/server";
import { requireApiProfile } from "@/lib/auth";
import { resetDemoTenant } from "@/lib/resetDemoTenant";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DEMO_COMPANY_SLUG } from "@/lib/resetDemoTenant";

export async function POST() {
  const { profile, response } = await requireApiProfile();
  if (!profile) return response!;

  const supabase = await createSupabaseServerClient();
  const { data: company } = await supabase
    .from("companies")
    .select("demo_mode_enabled, slug")
    .eq("id", profile.company_id!)
    .single();

  if (!company?.demo_mode_enabled || company.slug !== DEMO_COMPANY_SLUG) {
    return NextResponse.json({ error: "Not a demo account" }, { status: 403 });
  }

  const result = await resetDemoTenant();
  return NextResponse.json(result);
}
