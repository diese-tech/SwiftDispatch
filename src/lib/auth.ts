import { redirect } from "next/navigation";
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
