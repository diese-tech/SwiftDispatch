"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Send, Trash2 } from "lucide-react";
import { StatusDot } from "@/components/DesignSystem";
import { money } from "@/lib/format";
import type { QuoteLineItem, QuoteWithLineItems } from "@/types/db";

type SendStatus = "idle" | "sending" | "success" | "error";

type Props = {
  jobId: string;
  initialQuote: QuoteWithLineItems | null;
};

export default function QuoteBuilder({ jobId, initialQuote }: Props) {
  const [quoteId, setQuoteId] = useState(initialQuote?.id ?? "");
  const [items, setItems] = useState<QuoteLineItem[]>(initialQuote?.quote_line_items ?? []);
  const [sendStatus, setSendStatus] = useState<SendStatus>("idle");
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [saveErrorIds, setSaveErrorIds] = useState<Set<string>>(new Set());
  const [generalError, setGeneralError] = useState("");
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const total = useMemo(() => items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0), [items]);
  const hasValidItems = items.some((item) => Number(item.price) > 0);
  const isSaving = savingIds.size > 0;
  const hasSaveError = saveErrorIds.size > 0;

  useEffect(() => () => Object.values(debounceTimers.current).forEach(clearTimeout), []);

  async function ensureQuote() {
    if (quoteId) return quoteId;
    const response = await fetch("/api/quotes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ job_id: jobId }),
    });
    if (!response.ok) {
      setGeneralError("Quote could not be created.");
      return "";
    }
    const data = (await response.json()) as { quote_id: string; quote?: QuoteWithLineItems };
    setQuoteId(data.quote_id);
    setItems(data.quote?.quote_line_items ?? []);
    return data.quote_id;
  }

  async function addLineItem() {
    setGeneralError("");
    const id = await ensureQuote();
    if (!id) return;
    const response = await fetch(`/api/quotes/${id}/line-items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "", price: 0, quantity: 1 }),
    });
    if (!response.ok) {
      setGeneralError("Line item could not be added.");
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
      if (response.ok) {
        setSaveErrorIds((current) => {
          const next = new Set(current);
          next.delete(itemId);
          return next;
        });
      } else {
        setSaveErrorIds((current) => new Set(current).add(itemId));
      }
    }, 500);
  }

  async function deleteItem(itemId: string) {
    if (!quoteId) return;
    clearTimeout(debounceTimers.current[itemId]);
    setItems((current) => current.filter((item) => item.id !== itemId));
    setSaveErrorIds((current) => {
      const next = new Set(current);
      next.delete(itemId);
      return next;
    });
    const response = await fetch(`/api/quotes/${quoteId}/line-items/${itemId}`, { method: "DELETE" });
    if (!response.ok) setGeneralError("Line item could not be deleted.");
  }

  async function sendQuote() {
    if (!quoteId) return;
    setSendStatus("sending");
    const response = await fetch("/api/send-sms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quote_id: quoteId }),
    });
    setSendStatus(response.ok ? "success" : "error");
  }

  function saveStatusLabel() {
    if (isSaving) return "Saving…";
    if (hasSaveError) return "Couldn't save changes";
    if (quoteId) return "Saved";
    return "";
  }

  const saveLabel = saveStatusLabel();

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
      <div className="border-b border-slate-100 px-5 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-slate-400">Quote workspace</p>
            <h2 className="mt-0.5 text-lg font-semibold tracking-tight text-slate-950">Create quote</h2>
          </div>
          <div className="text-right">
            <p className="text-xl font-semibold text-slate-950">{money(total)}</p>
            {saveLabel && (
              <p className={`mt-0.5 font-mono text-[10px] ${hasSaveError ? "text-red-500" : "text-slate-400"}`}>
                {saveLabel}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="px-5 py-4 space-y-2">
        {items.map((item) => (
          <div className="grid grid-cols-1 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[1fr_92px_76px_40px]" key={item.id}>
            <input className="min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#1f6feb] focus:ring-2 focus:ring-[#eaf2ff]" placeholder="Line item" value={item.name} onChange={(event) => updateItem(item.id, { name: event.target.value })} />
            <input className="min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#1f6feb] focus:ring-2 focus:ring-[#eaf2ff]" min="0" step="0.01" type="number" value={item.price} onChange={(event) => updateItem(item.id, { price: Number(event.target.value) })} />
            <input className="min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#1f6feb] focus:ring-2 focus:ring-[#eaf2ff]" min="1" type="number" value={item.quantity} onChange={(event) => updateItem(item.id, { quantity: Number(event.target.value) })} />
            <button aria-label="Remove line item" className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-red-50 hover:border-red-200 hover:text-red-600" onClick={() => deleteItem(item.id)} type="button"><Trash2 size={16} /></button>
          </div>
        ))}

        <button className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50" onClick={addLineItem} type="button">
          <Plus size={14} /> Add line
        </button>
      </div>

      <div className="border-t border-slate-100 px-5 py-4">
        <div className="flex items-center gap-3">
          <button
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-orange-400 px-4 py-2.5 text-sm font-semibold !text-slate-950 disabled:opacity-60 transition hover:bg-orange-300"
            disabled={sendStatus === "sending" || isSaving || !quoteId || !items.length || !hasValidItems}
            onClick={sendQuote}
            type="button"
          >
            <Send size={14} /> {sendStatus === "sending" ? "Sending…" : "Send quote to customer"}
          </button>
          {quoteId ? <a className="text-sm font-semibold text-teal-700 hover:underline" href={`/quote/${quoteId}`} rel="noopener noreferrer" target="_blank">Preview</a> : null}
        </div>

        {(sendStatus === "success" || sendStatus === "error" || generalError) && (
          <div className="mt-3">
            {sendStatus === "success" && <StatusDot tone="green">Quote sent to customer.</StatusDot>}
            {sendStatus === "error" && <StatusDot tone="red">Quote was not sent. Check SMS consent or phone number.</StatusDot>}
            {generalError && sendStatus === "idle" && <StatusDot tone="red">{generalError}</StatusDot>}
          </div>
        )}
      </div>
    </div>
  );
}
