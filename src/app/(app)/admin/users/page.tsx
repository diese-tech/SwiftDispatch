"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type User = { id: string; email: string; role: string };

const fieldClass = "flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-[#1f6feb] focus:ring-2 focus:ring-[#eaf2ff]";

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function load() {
    const res = await fetch("/api/admin/users");
    const data = await res.json();
    setCurrentUserId(data.currentUserId ?? null);
    setUsers(data.users ?? []);
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
    if (!res.ok) { setError(data.error ?? "Failed"); return; }
    setSuccess(`Invite sent to ${email}`);
    setEmail("");
    await load();
  }

  return (
    <main>
      {/* Page header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-slate-400">Company users</p>
          <h1 className="mt-0.5 text-2xl font-semibold tracking-tight text-slate-950">Invite and manage dispatchers</h1>
        </div>
        <Link
          className="inline-flex items-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          href="/admin"
        >
          Back to admin
        </Link>
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        {/* Invite form */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <h2 className="text-lg font-semibold tracking-tight text-slate-950">Invite dispatcher</h2>
          <p className="mt-1 text-sm text-slate-500">Send access to another dispatcher without leaving the admin workspace.</p>
          <form className="mt-5 flex flex-col gap-3 sm:flex-row" onSubmit={handleInvite}>
            <input className={fieldClass} placeholder="dispatcher@yourcompany.com" required type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <button className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60" disabled={submitting} type="submit">
              {submitting ? "Sending…" : "Invite"}
            </button>
          </form>
          {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
          {success ? <p className="mt-3 text-sm font-medium text-green-700">{success}</p> : null}
        </div>

        {/* User roster */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <div className="border-b border-slate-100 px-6 py-4">
            <h2 className="text-lg font-semibold tracking-tight text-slate-950">Company user roster</h2>
            <p className="mt-0.5 text-sm text-slate-500">Admins and dispatchers, newest first.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.06em] text-slate-400">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.06em] text-slate-400">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.06em] text-slate-400">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td className="px-4 py-6 text-center text-slate-400" colSpan={3}>Loading…</td></tr>
                ) : users.length === 0 ? (
                  <tr><td className="px-4 py-6 text-center text-slate-400" colSpan={3}>No company users yet.</td></tr>
                ) : users.map((u) => (
                  <tr key={u.id}>
                    <td className="px-4 py-3 font-medium text-slate-900">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded border px-2 py-0.5 font-mono text-[10.5px] uppercase tracking-[0.06em] ${u.role === "admin" ? "border-teal-200 bg-teal-50 text-teal-700" : "border-slate-200 bg-slate-50 text-slate-500"}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {u.id === currentUserId ? (
                        <span className="font-mono text-[10.5px] uppercase tracking-[0.06em] text-slate-400">You</span>
                      ) : <span className="text-slate-400">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
