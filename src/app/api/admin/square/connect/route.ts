import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth";
import { buildSquareAuthorizeUrl, hasSquareOAuthConfig } from "@/lib/square";

function buildSettingsRedirect(request: Request, status: string) {
  return new URL(`/admin/settings?square=${status}`, request.url);
}

export async function GET(request: Request) {
  const { profile, response } = await requireApiRole(["admin"]);
  if (response || !profile) {
    return NextResponse.redirect(buildSettingsRedirect(request, "forbidden"));
  }

  if (!hasSquareOAuthConfig()) {
    return NextResponse.redirect(buildSettingsRedirect(request, "not-configured"));
  }

  const authorizeUrl = buildSquareAuthorizeUrl({
    companyId: profile.company_id,
    userId: profile.id,
    returnTo: "/admin/settings",
  });

  return NextResponse.redirect(authorizeUrl);
}
