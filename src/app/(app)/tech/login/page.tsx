"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import BrandMark from "@/components/BrandMark";

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

    try {
      const response = await fetch("/api/tech/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle: handle.trim().toLowerCase(), pin }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(data.error ?? "Invalid username or PIN");
        return;
      }
    } catch {
      setError("Login failed. Please try again.");
      return;
    } finally {
      setLoading(false);
    }

    router.push("/tech");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <BrandMark href="/" />
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <div className="border-b border-slate-100 px-6 py-5">
            <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-teal-700">Field access</span>
            <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">Technician sign in</h1>
            <p className="mt-1 text-sm text-slate-500">Enter your username and 4-digit PIN.</p>
          </div>

          <form className="px-6 py-5 space-y-4" onSubmit={onSubmit}>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="handle">
                Username
              </label>
              <input
                autoCapitalize="none"
                autoComplete="username"
                autoCorrect="off"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-base outline-none transition focus:border-[#1f6feb] focus:ring-2 focus:ring-[#eaf2ff]"
                id="handle"
                placeholder="e.g. jsmith"
                required
                type="text"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="pin">
                PIN
              </label>
              <input
                autoComplete="current-password"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-base tracking-widest outline-none transition focus:border-[#1f6feb] focus:ring-2 focus:ring-[#eaf2ff]"
                id="pin"
                inputMode="numeric"
                maxLength={4}
                minLength={4}
                pattern="\d{4}"
                placeholder="••••"
                required
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              />
            </div>
            {error ? (
              <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>
            ) : null}
            <button
              className="w-full rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
              disabled={loading}
              type="submit"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
