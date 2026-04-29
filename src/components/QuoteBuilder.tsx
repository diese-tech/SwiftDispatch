"use client";

import { useMemo, useState } from "react";
import { Plus, Send, Trash2 } from "lucide-react";
import { money } from "@/lib/format";

type LineItem = {
  name: string;
  price: number;
  quantity: number;
};

export default function QuoteBuilder({ jobId }: { jobId: string }) {
  const [items, setItems] = useState<LineItem[]>([
    { name: "", price: 0, quantity: 1 },
  ]);
  const [quoteId, setQuoteId] = useState("");
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");

  const total = useMemo(
    () =>
      items.reduce(
        (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0),
        0,
      ),
    [items],
  );

  function updateItem(index: number, item: Partial<LineItem>) {
    setItems((current) =>
      current.map((line, lineIndex) =>
        lineIndex === index ? { ...line, ...item } : line,
      ),
    );
  }

  async function saveQuote() {
    setSaving(true);
    setMessage("");
    const response = await fetch("/api/quotes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        job_id: jobId,
        line_items: items.filter((item) => item.name.trim()),
      }),
    });
    setSaving(false);

    if (!response.ok) {
      setMessage("Quote could not be saved.");
      return;
    }

    const data = (await response.json()) as { quote_id: string };
    setQuoteId(data.quote_id);
    setMessage("Quote saved.");
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
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Create Quote</h2>
        <p className="font-semibold">{money(total)}</p>
      </div>
      <div className="space-y-3">
        {items.map((item, index) => (
          <div
            className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_88px_72px_36px]"
            key={index}
          >
            <input
              className="min-w-0 rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="Line item"
              value={item.name}
              onChange={(event) => updateItem(index, { name: event.target.value })}
            />
            <input
              className="min-w-0 rounded-md border border-slate-300 px-3 py-2 text-sm"
              min="0"
              step="0.01"
              type="number"
              value={item.price}
              onChange={(event) =>
                updateItem(index, { price: Number(event.target.value) })
              }
            />
            <input
              className="min-w-0 rounded-md border border-slate-300 px-3 py-2 text-sm"
              min="1"
              type="number"
              value={item.quantity}
              onChange={(event) =>
                updateItem(index, { quantity: Number(event.target.value) })
              }
            />
            <button
              aria-label="Remove line item"
              className="rounded-md border border-slate-300 p-2"
              onClick={() =>
                setItems((current) =>
                  current.length === 1
                    ? current
                    : current.filter((_, lineIndex) => lineIndex !== index),
                )
              }
              type="button"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
      <button
        className="mt-3 inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold"
        onClick={() =>
          setItems((current) => [
            ...current,
            { name: "", price: 0, quantity: 1 },
          ])
        }
        type="button"
      >
        <Plus size={16} /> Add Line
      </button>
      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        <button
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          disabled={saving || total <= 0}
          onClick={saveQuote}
          type="button"
        >
          {saving ? "Saving..." : "Save Quote"}
        </button>
        <button
          className="inline-flex items-center justify-center gap-2 rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          disabled={sending || !quoteId}
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
          View public quote
        </a>
      ) : null}
      {message ? <p className="mt-3 text-sm text-slate-600">{message}</p> : null}
    </section>
  );
}
