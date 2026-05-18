"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Technician = {
  id: string;
  name: string;
  phone: string | null;
  handle: string | null;
  availability_status: string | null;
  current_job_id: string | null;
  auth_user_id: string | null;
};

type Credentials = { handle: string; pin: string; portalUrl: string } | null;

const fieldClass = "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-[#1f6feb] focus:ring-2 focus:ring-[#eaf2ff]";

const statusBadgeCls = (s: string | null) => {
  if (s === "available") return "border-green-200 bg-green-50 text-green-700";
  if (s === "on_job") return "border-orange-200 bg-orange-50 text-orange-700";
  return "border-slate-200 bg-slate-50 text-slate-500";
};

export default function TechniciansPage() {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [credentials, setCredentials] = useState<Credentials>(null);
  const [regeneratedPin, setRegeneratedPin] = useState<{ id: string; pin: string } | null>(null);
  const [form, setForm] = useState({ firstName: "", lastName: "", phone: "", preferredLast: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function loadTechnicians() {
    setLoadError(false);
    try {
      const res = await fetch("/api/admin/technicians");
      if (!res.ok) { setLoadError(true); return; }
      const data = await res.json();
      setTechnicians(data.technicians ?? []);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadTechnicians(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    const res = await fetch("/api/admin/technicians", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) { setError(data.error ?? "Failed"); return; }
    setCredentials(data);
    setForm({ firstName: "", lastName: "", phone: "", preferredLast: "" });
    await loadTechnicians();
  }

  async function handleRegenPin(techId: string) {
    const res = await fetch(`/api/admin/technicians/${techId}/regenerate-pin`, { method: "POST" });
    const data = await res.json();
    if (res.ok) setRegeneratedPin({ id: techId, pin: data.pin });
  }

  return (
    <main>
      {/* Page header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-slate-400">Technician management</p>
          <h1 className="mt-0.5 text-2xl font-semibold tracking-tight text-slate-950">Field team credentials</h1>
        </div>
        <Link
          className="inline-flex items-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          href="/admin"
        >
          Back to admin
        </Link>
      </div>

      {/* Credentials flash */}
      {credentials ? (
        <div className="mb-5 rounded-xl border border-teal-200 bg-teal-50 px-5 py-4">
          <p className="text-sm font-semibold text-teal-800">Technician created. Save these credentials now — they are only shown once.</p>
          <div className="mt-3 space-y-1 font-mono text-sm text-slate-800">
            <p><strong>Username:</strong> {credentials.handle}</p>
            <p><strong>PIN:</strong> {credentials.pin}</p>
            <p><strong>Portal:</strong> {credentials.portalUrl}</p>
          </div>
          <button className="mt-3 text-xs font-semibold text-teal-700 underline" onClick={() => setCredentials(null)} type="button">Dismiss</button>
        </div>
      ) : null}

      {regeneratedPin ? (
        <div className="mb-5 rounded-xl border border-orange-200 bg-orange-50 px-5 py-4">
          <p className="text-sm font-semibold text-orange-800">New PIN generated. Save it now.</p>
          <p className="mt-2 font-mono text-2xl font-semibold text-slate-950">{regeneratedPin.pin}</p>
          <button className="mt-3 text-xs font-semibold text-orange-700 underline" onClick={() => setRegeneratedPin(null)} type="button">Dismiss</button>
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        {/* Add form */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <h2 className="text-lg font-semibold tracking-tight text-slate-950">Add technician</h2>
          <p className="mt-1 text-sm text-slate-500">Create a field account and generate login credentials in one step.</p>
          <form className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2" onSubmit={handleCreate}>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">First name *</label>
              <input className={fieldClass} required value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Last name *</label>
              <input className={fieldClass} required value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Phone *</label>
              <input className={fieldClass} required type="tel" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Custom login ID <span className="font-normal text-slate-400">(optional)</span></label>
              <input className={fieldClass} placeholder="e.g. Rivera" value={form.preferredLast} onChange={(e) => setForm((f) => ({ ...f, preferredLast: e.target.value }))} />
            </div>
            {error ? <p className="sm:col-span-2 text-sm text-red-600">{error}</p> : null}
            <div className="sm:col-span-2">
              <button className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60" disabled={submitting} type="submit">
                {submitting ? "Creating…" : "Create technician"}
              </button>
            </div>
          </form>
        </div>

        {/* Roster table */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <div className="border-b border-slate-100 px-6 py-4">
            <h2 className="text-lg font-semibold tracking-tight text-slate-950">Technician roster</h2>
            <p className="mt-0.5 text-sm text-slate-500">Field availability, handles, and credential actions.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.06em] text-slate-400">Handle</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.06em] text-slate-400">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.06em] text-slate-400">Phone</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.06em] text-slate-400">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.06em] text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td className="px-4 py-8 text-center text-slate-400" colSpan={5}>Loading…</td></tr>
                ) : loadError ? (
                  <tr>
                    <td className="px-4 py-8 text-center" colSpan={5}>
                      <p className="text-sm text-red-600">Failed to load.</p>
                      <button className="mt-2 text-xs font-semibold text-teal-700 underline" onClick={loadTechnicians} type="button">Retry</button>
                    </td>
                  </tr>
                ) : technicians.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-center" colSpan={5}>
                      <p className="text-sm text-slate-500">No technicians yet.</p>
                      <p className="mt-1 text-xs text-slate-400">Use the form to create the first field account.</p>
                    </td>
                  </tr>
                ) : technicians.map((tech) => (
                  <tr key={tech.id}>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{tech.handle ?? "—"}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{tech.name}</td>
                    <td className="px-4 py-3 text-slate-600">{tech.phone ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded border px-2 py-0.5 font-mono text-[10.5px] uppercase tracking-[0.06em] ${statusBadgeCls(tech.availability_status)}`}>
                        {tech.availability_status ?? "offline"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {tech.auth_user_id ? (
                        <button className="text-xs font-semibold text-teal-700 hover:underline" onClick={() => handleRegenPin(tech.id)} type="button">
                          Regen PIN
                        </button>
                      ) : <span className="text-xs text-slate-400">—</span>}
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
