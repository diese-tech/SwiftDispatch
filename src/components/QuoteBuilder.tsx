"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Send, Trash2 } from "lucide-react";
import { money } from "@/lib/format";
import type { QuoteLineItem, QuoteWithLineItems } from "@/types/db";

type Props = {
  jobId: string;
  initialQuote: QuoteWithLineItems | null;
};

export default function QuoteBuilder({ jobId, initialQuote }: Props) {
  const [quoteId, setQuoteId] = useState(initialQuote?.id ?? "");
  const [items, setItems] = useState<QuoteLineItem[]>(
    initialQuote?.quote_line_items ?? [],
  );
  const [sending, setSending] = useState(false);
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>(
    {},
  );

  const total = useMemo(
    () =>
      items.reduce(
        (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0),
        0,
      ),
    [items],
  );

  useEffect(() => {
    return () => {
      Object.values(debounceTimers.current).forEach(clearTimeout);
    };
  }, []);

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

    const data = (await response.json()) as {
      quote_id: string;
      quote?: QuoteWithLineItems;
    };
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
    setItems((current) =>
      current.map((item) => (item.id === itemId ? { ...item, ...patch } : item)),
    );

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

      if (!response.ok) {
        setMessage("Line item could not be saved.");
      }
    }, 500);
  }

  async function deleteItem(itemId: string) {
    if (!quoteId) return;
    clearTimeout(debounceTimers.current[itemId]);
    setItems((current) => current.filter((item) => item.id !== itemId));

    const response = await fetch(`/api/quotes/${quoteId}/line-items/${itemId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      setMessage("Line item could not be deleted.");
    }
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
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Create Quote</h2>
          <p className="text-xs text-slate-500">
            {savingIds.size ? "Saving..." : "Saved to Supabase"}
          </p>
        </div>
        <p className="font-semibold">{money(total)}</p>
      </div>
      <div className="space-y-3">
        {items.map((item) => (
          <div
            className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_88px_72px_36px]"
            key={item.id}
          >
            <input
              className="min-w-0 rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="Line item"
              value={item.name}
              onChange={(event) =>
                updateItem(item.id, { name: event.target.value })
              }
            />
            <input
              className="min-w-0 rounded-md border border-slate-300 px-3 py-2 text-sm"
              min="0"
              step="0.01"
              type="number"
              value={item.price}
              onChange={(event) =>
                updateItem(item.id, { price: Number(event.target.value) })
              }
            />
            <input
              className="min-w-0 rounded-md border border-slate-300 px-3 py-2 text-sm"
              min="1"
              type="number"
              value={item.quantity}
              onChange={(event) =>
                updateItem(item.id, { quantity: Number(event.target.value) })
              }
            />
            <button
              aria-label="Remove line item"
              className="rounded-md border border-slate-300 p-2"
              onClick={() => deleteItem(item.id)}
              type="button"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
      <button
        className="mt-3 inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold"
        onClick={addLineItem}
        type="button"
      >
        <Plus size={16} /> Add Line
      </button>
      <div className="mt-5">
        <button
          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-teal-700 px-4 py-3 text-base font-semibold text-white disabled:opacity-60"
          disabled={sending || !quoteId || !items.length || total <= 0}
          onClick={sendSms}
          type="button"
        >
          <Send size={16} /> {sending ? "Sending..." : "Send SMS"}
        </button>
      </div>
      {quoteId ? (
        <a
          className="mt-3 block text-sm font-semibold text-teal-700"
          href={`/quote/${quoteId}`}
          target="_blank"
        >
          View quote
        </a>
      ) : null}
      {message ? <p className="mt-3 text-sm text-slate-600">{message}</p> : null}
    </section>
  );
}
