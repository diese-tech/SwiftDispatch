import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/supabase/withCompany";
import { buildSquareAuthorizeUrl, hasSquareOAuthConfig } from "@/lib/square";

function buildSettingsRedirect(request: Request, status: string) {
  return new URL(`/admin/settings?square=${status}`, request.url);
}

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();

  let caller: { userId: string; companyId: string };
  try {
    caller = await requireRole(supabase, ["admin"]);
  } catch {
    return NextResponse.redirect(buildSettingsRedirect(request, "forbidden"));
  }

  if (!hasSquareOAuthConfig()) {
    return NextResponse.redirect(buildSettingsRedirect(request, "not-configured"));
  }

  const authorizeUrl = buildSquareAuthorizeUrl({
    companyId: caller.companyId,
    userId: caller.userId,
    returnTo: "/admin/settings",
  });

  return NextResponse.redirect(authorizeUrl);
}
