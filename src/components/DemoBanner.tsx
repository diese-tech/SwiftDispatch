import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function DemoBanner() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("company_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.company_id || profile.role === "super_admin") return null;

  const { data: company } = await supabase
    .from("companies")
    .select("demo_mode_enabled")
    .eq("id", profile.company_id)
    .single();

  if (!company?.demo_mode_enabled) return null;

  return (
    <div className="flex items-center justify-between gap-4 border-b border-amber-200 bg-amber-50 px-5 py-2.5 sm:px-8">
      <div className="flex items-center gap-3">
        <span className="rounded border border-amber-300 bg-amber-100 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.06em] text-amber-800">
          Demo mode
        </span>
        <p className="text-sm text-amber-800">
          This is a live demo workspace. All data resets daily at <strong>00:00 EST</strong>. Log in with <strong>demo@swiftdispatch.app</strong> / <strong>demo</strong> to explore.
        </p>
      </div>
    </div>
  );
}
