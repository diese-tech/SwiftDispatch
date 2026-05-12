import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/supabase/withCompany";
import {
  buildStoredSquareConnection,
  exchangeSquareAuthorizationCode,
  fetchSquareMerchantContext,
  mergeSquareIntoPaymentConfig,
  verifySquareOAuthState,
} from "@/lib/square";

function buildReturnUrl(request: Request, stateReturnTo: string, status: string) {
  return new URL(`${stateReturnTo}?square=${status}`, request.url);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL(`/admin/settings?square=denied`, request.url));
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL(`/admin/settings?square=missing-code`, request.url));
  }

  let oauthState: { companyId: string; userId: string; returnTo: string };
  try {
    oauthState = verifySquareOAuthState(state);
  } catch {
    return NextResponse.redirect(new URL(`/admin/settings?square=invalid-state`, request.url));
  }

  try {
    const serverSupabase = await createSupabaseServerClient();
    const caller = await requireRole(serverSupabase, ["admin"]);
    if (caller.userId !== oauthState.userId || caller.companyId !== oauthState.companyId) {
      return NextResponse.redirect(buildReturnUrl(request, oauthState.returnTo, "forbidden"));
    }

    const tokenResponse = await exchangeSquareAuthorizationCode(code);
    const { merchant, selectedLocation } = await fetchSquareMerchantContext(tokenResponse.access_token);
    const supabase = createSupabaseAdminClient();
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("payment_config")
      .eq("id", oauthState.companyId)
      .maybeSingle();

    if (companyError || !company) {
      throw new Error(companyError?.message ?? "Company not found");
    }

    const squareConnection = buildStoredSquareConnection({
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      expiresAt: tokenResponse.expires_at,
      merchantId: tokenResponse.merchant_id ?? merchant?.id ?? null,
      merchantName: merchant?.business_name ?? selectedLocation?.business_name ?? null,
      locationId: selectedLocation?.id ?? merchant?.main_location_id ?? null,
      locationName: selectedLocation?.name ?? selectedLocation?.business_name ?? null,
      scopes: tokenResponse.scopes,
    });

    const { error: updateError } = await supabase
      .from("companies")
      .update({
        payment_provider: "square",
        payment_config: mergeSquareIntoPaymentConfig(company.payment_config, squareConnection),
      })
      .eq("id", oauthState.companyId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    return NextResponse.redirect(buildReturnUrl(request, oauthState.returnTo, "connected"));
  } catch {
    return NextResponse.redirect(buildReturnUrl(request, oauthState.returnTo, "connect-failed"));
  }
}
