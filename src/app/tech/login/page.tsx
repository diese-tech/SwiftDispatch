"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StatusPill, SurfaceCard } from "@/components/DesignSystem";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function TechLoginPage() {
  const router = useRouter();
  const [handle, setHandle] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    const email = `${handle.trim().toLowerCase()}@internal.swiftdispatch.app`;
    const supabase = createSupabaseBrowserClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: pin });
    setLoading(false);
    if (signInError) {
      setError("Invalid username or PIN");
      return;
    }
    router.push("/tech");
    router.refresh();
  }

  return (
    <main className="px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-5xl">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <StatusPill tone="warm">Field access</StatusPill>
            <h1 className="mt-5 text-5xl font-semibold tracking-tight text-slate-950">Technician login built for speed in the field.</h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">Use the lightweight technician login to access assigned jobs, update progress, and keep the office in sync from the field.</p>
          </div>
          <SurfaceCard accent className="p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">Technician access</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Technician login</h2>
            <p className="mt-3 text-sm leading-7 text-slate-500">Enter your username and 4-digit PIN.</p>
            <form className="mt-6 space-y-5" onSubmit={onSubmit}>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="handle">Username</label>
                <input autoCapitalize="none" autoComplete="username" autoCorrect="off" className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-base outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100" id="handle" placeholder="e.g. johsmith" required type="text" value={handle} onChange={(e) => setHandle(e.target.value)} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="pin">PIN</label>
                <input autoComplete="current-password" className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-base tracking-widest outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100" id="pin" inputMode="numeric" maxLength={4} minLength={4} pattern="\d{4}" placeholder="...." required type="password" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} />
              </div>
              {error ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p> : null}
              <button className="w-full rounded-full bg-slate-950 px-4 py-3 text-base font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60" disabled={loading} type="submit">
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </form>
          </SurfaceCard>
        </div>
      </div>
    </main>
  );
}