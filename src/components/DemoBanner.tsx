import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import DemoTabNav from "@/components/DemoTabNav";
import ResetDemoButton from "@/components/ResetDemoButton";

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
    <div className="border-b border-[var(--c-line)] bg-[var(--c-paper)]">
      <div className="flex items-center justify-between gap-4 px-5 py-2 sm:px-8">
        {/* Left: badge + tabs */}
        <div className="flex items-center gap-3">
          <span className="shrink-0 rounded border border-teal-200 bg-teal-50 px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.06em] text-teal-700">
            Demo sandbox
          </span>
          <DemoTabNav />
        </div>
        {/* Right: reset */}
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="hidden font-mono text-[10px] text-[var(--c-text-4)] underline-offset-2 hover:underline sm:block"
          >
            Admin settings
          </Link>
          <ResetDemoButton />
        </div>
      </div>
    </div>
  );
}
