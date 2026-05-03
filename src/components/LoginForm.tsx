"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function LoginForm({
  nextPath,
  reauth = false,
}: {
  nextPath?: string;
  reauth?: boolean;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!reauth) return;

    const supabase = createSupabaseBrowserClient();
    void supabase.auth.signOut();
  }, [reauth]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createSupabaseBrowserClient();
    if (reauth) {
      await supabase.auth.signOut();
    }
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }
    router.push(nextPath || "/dashboard");
    router.refresh();
  }

  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      <label className="block text-sm font-medium text-slate-700">
        Email
        <input className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100" required type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Password
        <input className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100" required type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
      </label>
      {error ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p> : null}
      <button className="w-full rounded-full bg-slate-950 px-4 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60" disabled={loading}>
        {loading ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
