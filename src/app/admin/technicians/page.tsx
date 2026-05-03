"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppPageIntro, StatusPill, SurfaceCard } from "@/components/DesignSystem";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

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

const fieldClass = "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100";

export default function TechniciansPage() {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [credentials, setCredentials] = useState<Credentials>(null);
  const [regeneratedPin, setRegeneratedPin] = useState<{ id: string; pin: string } | null>(null);
  const [form, setForm] = useState({ firstName: "", lastName: "", phone: "", preferredLast: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function loadTechnicians() {
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase.from("technicians").select("id,name,phone,handle,availability_status,current_job_id,auth_user_id");
    setTechnicians(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadTechnicians();
  }, []);

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
    if (!res.ok) {
      setError(data.error ?? "Failed");
      return;
    }
    setCredentials(data);
    setForm({ firstName: "", lastName: "", phone: "", preferredLast: "" });
    await loadTechnicians();
  }

  async function handleRegenPin(techId: string) {
    const res = await fetch(`/api/admin/technicians/${techId}/regenerate-pin`, { method: "POST" });
    const data = await res.json();
    if (res.ok) setRegeneratedPin({ id: techId, pin: data.pin });
  }

  const statusBadge = (s: string | null) => {
    const tone = s === "available" ? "success" : s === "on_job" ? "warm" : "neutral";
    return <StatusPill tone={tone}>{s ?? "offline"}</StatusPill>;
  };

  return (
    <main>
      <AppPageIntro
        eyebrow="Technician management"
        title="Manage field-team access and credentials from one place."
        description="Create technician accounts, reveal one-time login credentials, and monitor field availability without leaving the admin workspace."
        actions={<Link className="inline-flex items-center rounded-full border border-white/14 bg-white/8 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/12" href="/admin">Back to admin</Link>}
      />

      {credentials ? (
        <SurfaceCard accent className="mb-6 border-teal-200 bg-teal-50 text-slate-900">
          <p className="text-sm font-bold text-teal-800">Technician created. Save these credentials now. They are only shown once.</p>
          <div className="mt-4 space-y-1 font-mono text-sm">
            <p><strong>Username:</strong> {credentials.handle}</p>
            <p><strong>PIN:</strong> {credentials.pin}</p>
            <p><strong>Portal:</strong> {credentials.portalUrl}</p>
          </div>
          <button className="mt-4 text-xs font-semibold text-teal-700 underline" onClick={() => setCredentials(null)} type="button">Dismiss</button>
        </SurfaceCard>
      ) : null}

      {regeneratedPin ? (
        <SurfaceCard accent className="mb-6 border-orange-200 bg-orange-50 text-slate-900">
          <p className="text-sm font-bold text-orange-800">New PIN generated. Save it now. It is only shown once.</p>
          <p className="mt-3 font-mono text-2xl font-semibold text-slate-950">{regeneratedPin.pin}</p>
          <button className="mt-4 text-xs font-semibold text-orange-700 underline" onClick={() => setRegeneratedPin(null)} type="button">Dismiss</button>
        </SurfaceCard>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <SurfaceCard accent>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Add technician</h2>
          <p className="mt-2 text-sm leading-7 text-slate-500">Create a technician record and generate field login credentials in one step.</p>
          <form className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2" onSubmit={handleCreate}>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">First name *</label>
              <input className={fieldClass} required value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Last name *</label>
              <input className={fieldClass} required value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Phone *</label>
              <input className={fieldClass} required type="tel" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Custom login ID last name <span className="font-normal text-slate-400">(optional)</span></label>
              <input className={fieldClass} placeholder="e.g. Rivera" value={form.preferredLast} onChange={(e) => setForm((f) => ({ ...f, preferredLast: e.target.value }))} />
            </div>
            {error ? <p className="sm:col-span-2 text-sm text-red-600">{error}</p> : null}
            <div className="sm:col-span-2">
              <button className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60" disabled={submitting} type="submit">
                {submitting ? "Creating..." : "Create technician"}
              </button>
            </div>
          </form>
        </SurfaceCard>

        <SurfaceCard accent className="overflow-hidden p-0">
          <div className="border-b border-slate-200 px-6 py-5">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Technician roster</h2>
            <p className="mt-2 text-sm text-slate-500">Field availability, handles, and credential actions in one table.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Handle</th>
                  <th className="px-4 py-3 text-left font-medium">Name</th>
                  <th className="px-4 py-3 text-left font-medium">Phone</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td className="px-4 py-6 text-center text-slate-400" colSpan={5}>Loading...</td></tr>
                ) : technicians.length === 0 ? (
                  <tr><td className="px-4 py-6 text-center text-slate-400" colSpan={5}>No technicians yet.</td></tr>
                ) : technicians.map((tech) => (
                  <tr key={tech.id}>
                    <td className="px-4 py-3 font-mono text-slate-600">{tech.handle ?? "-"}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{tech.name}</td>
                    <td className="px-4 py-3 text-slate-600">{tech.phone ?? "-"}</td>
                    <td className="px-4 py-3">{statusBadge(tech.availability_status)}</td>
                    <td className="px-4 py-3">
                      {tech.auth_user_id ? (
                        <button className="text-xs font-semibold text-teal-700 hover:underline" onClick={() => handleRegenPin(tech.id)} type="button">Regenerate PIN</button>
                      ) : <span className="text-xs text-slate-400">-</span>}
                    </td>
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