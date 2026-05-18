import { redirect } from "next/navigation";
import LoginForm from "@/components/LoginForm";
import BrandMark from "@/components/BrandMark";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reauth?: string; next?: string }>;
}) {
  const { reauth, next } = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user && reauth !== "1") {
    const { data } = await supabase.from("users").select("role").eq("id", user.id).single();
    if (data?.role === "super_admin") redirect("/superadmin");
    else if (data?.role === "admin") redirect("/admin");
    else if (data?.role === "technician") redirect("/tech");
    else redirect("/dispatch");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <BrandMark href="/" />
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <div className="border-b border-slate-100 px-6 py-5">
            <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-teal-700">Internal access</span>
            <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">Sign in</h1>
            <p className="mt-1 text-sm text-slate-500">Dispatcher and admin access.</p>
          </div>

          {reauth === "1" ? (
            <div className="border-b border-slate-100 bg-orange-50 px-6 py-3">
              <p className="text-sm font-medium text-orange-800">
                That account does not have the required access. Sign in with the correct platform account.
              </p>
            </div>
          ) : null}

          <div className="px-6 py-5">
            <LoginForm nextPath={next} reauth={reauth === "1"} />
            <p className="mt-5 text-center text-sm text-slate-500">
              Technician? <a className="font-semibold text-teal-700 hover:underline" href="/tech/login">Tech login</a>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
