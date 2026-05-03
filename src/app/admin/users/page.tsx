"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppPageIntro, StatusPill, SurfaceCard } from "@/components/DesignSystem";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type User = { id: string; email: string; role: string; created_at: string };
const fieldClass = "flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100";

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function load() {
    const supabase = createSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id ?? null);
    const { data } = await supabase.from("users").select("id,email,role,created_at").eq("role", "dispatcher").order("created_at", { ascending: false });
    setUsers(data ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error ?? "Failed");
      return;
    }
    setSuccess(`Invite sent to ${email}`);
    setEmail("");
    await load();
  }

  return (
    <main>
      <AppPageIntro
        eyebrow="Dispatcher users"
        title="Invite and manage the internal people running the board."
        description="Keep dispatcher access simple, visible, and aligned with the rest of the admin workspace."
        actions={<Link className="inline-flex items-center rounded-full border border-white/14 bg-white/8 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/12" href="/admin">Back to admin</Link>}
      />

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <SurfaceCard accent>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Invite dispatcher</h2>
          <p className="mt-2 text-sm leading-7 text-slate-500">Send access to another dispatcher account without leaving the admin workspace.</p>
          <form className="mt-6 flex flex-col gap-3 sm:flex-row" onSubmit={handleInvite}>
            <input className={fieldClass} placeholder="dispatcher@yourcompany.com" required type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <button className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60" disabled={submitting} type="submit">
              {submitting ? "Sending..." : "Invite"}
            </button>
          </form>
          <div className="mt-4 flex flex-wrap gap-3">
            {error ? <StatusPill tone="danger">{error}</StatusPill> : null}
            {success ? <StatusPill tone="success">{success}</StatusPill> : null}
          </div>
        </SurfaceCard>

        <SurfaceCard accent className="overflow-hidden p-0">
          <div className="border-b border-slate-200 px-6 py-5">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Dispatcher roster</h2>
            <p className="mt-2 text-sm text-slate-500">All dispatcher accounts for this company, newest first.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Email</th>
                  <th className="px-4 py-3 text-left font-medium">Joined</th>
                  <th className="px-4 py-3 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td className="px-4 py-6 text-center text-slate-400" colSpan={3}>Loading...</td></tr>
                ) : users.length === 0 ? (
                  <tr><td className="px-4 py-6 text-center text-slate-400" colSpan={3}>No dispatchers yet.</td></tr>
                ) : users.map((u) => (
                  <tr key={u.id}>
                    <td className="px-4 py-3 font-medium text-slate-900">{u.email}</td>
                    <td className="px-4 py-3 text-slate-500">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">{u.id === currentUserId ? <StatusPill tone="teal">You</StatusPill> : <span className="text-xs text-slate-400">-</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SurfaceCard>
      </div>
    </main>
  );
}