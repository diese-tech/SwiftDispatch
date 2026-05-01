import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AppUser } from "@/types/db";

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

export async function requireAdminProfile() {
  const profile = await getCurrentProfile();

  if (profile.role !== "admin") {
    redirect("/dashboard");
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
