"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppPageIntro, StatusPill, SurfaceCard } from "@/components/DesignSystem";

type LineItem = { description: string; unit_price: number; qty: number; unit?: string; optional: boolean };
type Template = { id: string; name: string; line_items: LineItem[]; estimated_duration_minutes: number; is_active: boolean };

const emptyItem = (): LineItem => ({ description: "", unit_price: 0, qty: 1, optional: false });
const fieldClass = "rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100";

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDuration, setNewDuration] = useState(60);
  const [newItems, setNewItems] = useState<LineItem[]>([emptyItem()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch("/api/admin/templates");
    const data = await res.json();
    setTemplates(data.templates ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    const res = await fetch("/api/admin/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, lineItems: newItems, estimatedDurationMinutes: newDuration }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error ?? "Failed");
      return;
    }
    setCreating(false);
    setNewName("");
    setNewDuration(60);
    setNewItems([emptyItem()]);
    await load();
  }

  async function toggleActive(template: Template) {
    await fetch(`/api/admin/templates/${template.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !template.is_active }),
    });
    await load();
  }

  const updateNewItem = (idx: number, field: keyof LineItem, val: string | number | boolean) => {
    setNewItems((items) => items.map((item, i) => i === idx ? { ...item, [field]: val } : item));
  };

  return (
    <main>
      <AppPageIntro
        eyebrow="Quote templates"
        title="Pre-build common jobs so quoting gets faster under pressure."
        description="Templates help the office move from diagnosis to customer-ready quote without rebuilding the same job structure every time."
        actions={
          <>
            <Link className="inline-flex items-center rounded-full border border-white/14 bg-white/8 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/12" href="/admin">Back to admin</Link>
            <button className="rounded-full bg-orange-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-orange-300" onClick={() => setCreating(true)} type="button">New Template</button>
          </>
        }
      />

      {creating ? (
        <SurfaceCard accent className="mb-6">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">New template</h2>
          <form className="mt-6 space-y-4" onSubmit={handleCreate}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Template name *</label>
                <input className={`w-full ${fieldClass}`} required value={newName} onChange={(e) => setNewName(e.target.value)} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Est. duration (min)</label>
                <input className={`w-full ${fieldClass}`} min={15} type="number" value={newDuration} onChange={(e) => setNewDuration(Number(e.target.value))} />
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Line items</label>
              <div className="space-y-3">
                {newItems.map((item, idx) => (
                  <div className="grid gap-2 rounded-[1.4rem] border border-slate-200 bg-slate-50 p-3 lg:grid-cols-[1fr_120px_84px_100px_auto]" key={idx}>
                    <input className={fieldClass} placeholder="Description" value={item.description} onChange={(e) => updateNewItem(idx, "description", e.target.value)} />
                    <input className={fieldClass} placeholder="Price" type="number" value={item.unit_price} onChange={(e) => updateNewItem(idx, "unit_price", Number(e.target.value))} />
                    <input className={fieldClass} placeholder="Qty" type="number" value={item.qty} onChange={(e) => updateNewItem(idx, "qty", Number(e.target.value))} />
                    <select className={fieldClass} value={item.unit ?? ""} onChange={(e) => updateNewItem(idx, "unit", e.target.value)}>
                      <option value="">unit</option>
                      <option value="hour">hour</option>
                      <option value="flat">flat</option>
                    </select>
                    <button className="rounded-full border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50" onClick={() => setNewItems((items) => items.filter((_, i) => i !== idx))} type="button">Remove</button>
                  </div>
                ))}
              </div>
              <button className="mt-3 text-sm font-semibold text-teal-700 hover:underline" onClick={() => setNewItems((items) => [...items, emptyItem()])} type="button">+ Add line item</button>
            </div>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <div className="flex flex-wrap gap-3">
              <button className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60" disabled={submitting} type="submit">{submitting ? "Saving..." : "Save template"}</button>
              <button className="text-sm font-semibold text-slate-500 hover:underline" onClick={() => setCreating(false)} type="button">Cancel</button>
            </div>
          </form>
        </SurfaceCard>
      ) : null}

      <SurfaceCard accent className="overflow-hidden p-0">
        <div className="border-b border-slate-200 px-6 py-5">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Template library</h2>
          <p className="mt-2 text-sm text-slate-500">Activate the templates your team should use and park the ones that are no longer current.</p>
        </div>
        <div className="divide-y divide-slate-100">
          {loading ? (
            <div className="px-6 py-8 text-center text-slate-400">Loading...</div>
          ) : templates.length === 0 ? (
            <div className="px-6 py-8 text-center text-slate-400">No templates yet.</div>
          ) : templates.map((t) => (
            <div className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between" key={t.id}>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-slate-900">{t.name}</span>
                  {t.is_active ? <StatusPill tone="teal">Active</StatusPill> : <StatusPill tone="neutral">Inactive</StatusPill>}
                </div>
                <p className="mt-2 text-xs text-slate-500">{t.line_items.length} line items · {t.estimated_duration_minutes} min</p>
              </div>
              <button className="text-sm font-semibold text-slate-700 hover:underline" onClick={() => toggleActive(t)} type="button">{t.is_active ? "Deactivate" : "Activate"}</button>
            </div>
          ))}
        </div>
      </SurfaceCard>
    </main>
  );
}