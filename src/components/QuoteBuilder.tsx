"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Send, Trash2 } from "lucide-react";
import { StatusPill, SurfaceCard } from "@/components/DesignSystem";
import { money } from "@/lib/format";
import type { QuoteLineItem, QuoteWithLineItems } from "@/types/db";

type Props = {
  jobId: string;
  initialQuote: QuoteWithLineItems | null;
};

export default function QuoteBuilder({ jobId, initialQuote }: Props) {
  const [quoteId, setQuoteId] = useState(initialQuote?.id ?? "");
  const [items, setItems] = useState<QuoteLineItem[]>(initialQuote?.quote_line_items ?? []);
  const [sending, setSending] = useState(false);
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const total = useMemo(() => items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0), [items]);

  useEffect(() => () => Object.values(debounceTimers.current).forEach(clearTimeout), []);

  async function ensureQuote() {
    if (quoteId) return quoteId;
    const response = await fetch("/api/quotes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ job_id: jobId }),
    });
    if (!response.ok) {
      setMessage("Quote could not be created.");
      return "";
    }
    const data = (await response.json()) as { quote_id: string; quote?: QuoteWithLineItems };
    setQuoteId(data.quote_id);
    setItems(data.quote?.quote_line_items ?? []);
    return data.quote_id;
  }

  async function addLineItem() {
    setMessage("");
    const id = await ensureQuote();
    if (!id) return;
    const response = await fetch(`/api/quotes/${id}/line-items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "", price: 0, quantity: 1 }),
    });
    if (!response.ok) {
      setMessage("Line item could not be added.");
      return;
    }
    const data = (await response.json()) as { item: QuoteLineItem };
    setItems((current) => [...current, data.item]);
  }

  function updateItem(itemId: string, patch: Partial<QuoteLineItem>) {
    setItems((current) => current.map((item) => (item.id === itemId ? { ...item, ...patch } : item)));
    if (!quoteId) return;
    clearTimeout(debounceTimers.current[itemId]);
    setSavingIds((current) => new Set(current).add(itemId));
    debounceTimers.current[itemId] = setTimeout(async () => {
      const response = await fetch(`/api/quotes/${quoteId}/line-items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      setSavingIds((current) => {
        const next = new Set(current);
        next.delete(itemId);
        return next;
      });
      if (!response.ok) setMessage("Line item could not be saved.");
    }, 500);
  }

  async function deleteItem(itemId: string) {
    if (!quoteId) return;
    clearTimeout(debounceTimers.current[itemId]);
    setItems((current) => current.filter((item) => item.id !== itemId));
    const response = await fetch(`/api/quotes/${quoteId}/line-items/${itemId}`, { method: "DELETE" });
    if (!response.ok) setMessage("Line item could not be deleted.");
  }

  async function sendSms() {
    if (!quoteId) return;
    setSending(true);
    setMessage("");
    const response = await fetch("/api/send-sms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quote_id: quoteId }),
    });
    setSending(false);
    setMessage(response.ok ? "SMS sent." : "SMS could not be sent.");
  }

  return (
    <SurfaceCard accent className="p-5 sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Quote workspace</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Create quote</h2>
        </div>
        <div className="text-right">
          <p className="text-2xl font-semibold text-slate-950">{money(total)}</p>
          <p className="mt-1 text-xs text-slate-500">{savingIds.size ? "Saving..." : "Saved to Supabase"}</p>
        </div>
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <div className="grid grid-cols-1 gap-2 rounded-[1.4rem] border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[1fr_92px_76px_40px]" key={item.id}>
            <input className="min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-100" placeholder="Line item" value={item.name} onChange={(event) => updateItem(item.id, { name: event.target.value })} />
            <input className="min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-100" min="0" step="0.01" type="number" value={item.price} onChange={(event) => updateItem(item.id, { price: Number(event.target.value) })} />
            <input className="min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-100" min="1" type="number" value={item.quantity} onChange={(event) => updateItem(item.id, { quantity: Number(event.target.value) })} />
            <button aria-label="Remove line item" className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600" onClick={() => deleteItem(item.id)} type="button"><Trash2 size={16} /></button>
          </div>
        ))}
      </div>

      <button className="mt-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50" onClick={addLineItem} type="button">
        <Plus size={16} /> Add line
      </button>

      <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
        <button className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-orange-400 px-4 py-3 text-base font-semibold text-slate-950 disabled:opacity-60" disabled={sending || !quoteId || !items.length || total <= 0} onClick={sendSms} type="button">
          <Send size={16} /> {sending ? "Sending..." : "Send SMS"}
        </button>
        {quoteId ? <a className="text-sm font-semibold text-teal-700" href={`/quote/${quoteId}`} target="_blank">View quote</a> : null}
      </div>

      {message ? <div className="mt-4"><StatusPill tone={message === "SMS sent." ? "success" : "danger"}>{message}</StatusPill></div> : null}
    </SurfaceCard>
  );
}