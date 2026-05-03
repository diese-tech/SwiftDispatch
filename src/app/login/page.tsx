import { redirect } from "next/navigation";
import LoginForm from "@/components/LoginForm";
import { StatusPill, SurfaceCard } from "@/components/DesignSystem";
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
    <main className="px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-5xl">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <StatusPill tone="warm">Internal access</StatusPill>
            <h1 className="mt-5 text-5xl font-semibold tracking-tight text-slate-950">Sign into the SwiftDispatch workspace.</h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">Dispatcher, admin, and platform access live in the same product system as the public site, but optimized for operators who need clarity fast.</p>
            {reauth === "1" ? (
              <p className="mt-5 max-w-xl rounded-[1.5rem] border border-orange-200 bg-orange-50 px-4 py-4 text-sm font-medium leading-6 text-orange-900">
                You were already signed in with an account that does not have superadmin access. Sign in again with the correct platform account.
              </p>
            ) : null}
          </div>
          <SurfaceCard accent className="p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">Dispatcher and admin access</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Sign in</h2>
            <p className="mt-3 text-sm leading-7 text-slate-500">Use your company login to enter the internal workflow.</p>
            <div className="mt-6"><LoginForm nextPath={next} reauth={reauth === "1"} /></div>
            <p className="mt-6 text-center text-sm text-slate-500">Technician? <a className="font-semibold text-teal-700 hover:underline" href="/tech/login">Tech login</a></p>
          </SurfaceCard>
        </div>
      </div>
    </main>
  );
}
