import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AppUser } from "@/types/db";

export type AppRole = "technician" | "dispatcher" | "admin" | "super_admin";

// requireApiRole() runtime-checks company_id is present before returning a
// non-null profile, so callers get a narrowed, always-scopable company_id.
type ScopedAppUser = AppUser & { company_id: string };

export async function getCurrentProfile(): Promise<AppUser> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const { data, error } = await supabase
    .from("users")
    .select("id,email,company_id,role")
    .eq("id", user.id)
    .single();

  if (error || !data) redirect("/");
  return data as AppUser;
}

export async function requireApiProfile() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      supabase,
      profile: null,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const { data, error } = await supabase
    .from("users")
    .select("id,email,company_id,role")
    .eq("id", user.id)
    .single();

  if (error || !data) {
    return {
      supabase,
      profile: null,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return {
    supabase,
    profile: data as AppUser,
    response: null,
  };
}

/**
 * Canonical API authorization primitive: proves identity (401 if not),
 * tenant membership (403 if no company_id), and that the caller's role is
 * one of `allowedRoles` (403 otherwise). Returns the same shape as
 * requireApiProfile() so call sites barely change.
 */
export async function requireApiRole(allowedRoles: AppRole[]) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      supabase,
      profile: null,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const { data, error } = await supabase
    .from("users")
    .select("id,email,company_id,role")
    .eq("id", user.id)
    .single();

  if (error || !data) {
    return {
      supabase,
      profile: null,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  if (!data.company_id || !allowedRoles.includes(data.role as AppRole)) {
    return {
      supabase,
      profile: null,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return {
    supabase,
    profile: data as ScopedAppUser,
    response: null,
  };
}

export async function requireAdminProfile() {
  const profile = await getCurrentProfile();

  if (profile.role !== "admin") {
    redirect("/dispatch");
  }

  return profile;
}

export async function requireSuperAdminProfile() {
  const profile = await getCurrentProfile();

  if (profile.role !== "super_admin") {
    redirect("/login");
  }

  return profile;
}

/**
 * Page-component counterpart to requireApiRole(): redirects instead of
 * returning a NextResponse. Use for server components gating on a role set
 * broader than the single-role requireAdminProfile()/requireSuperAdminProfile().
 */
export async function requireProfileWithRole(
  allowedRoles: AppRole[],
  redirectTo = "/login",
): Promise<ScopedAppUser> {
  const profile = await getCurrentProfile();

  if (!profile.company_id || !allowedRoles.includes(profile.role as AppRole)) {
    redirect(redirectTo);
  }

  return profile as ScopedAppUser;
}
