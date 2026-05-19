"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowRight, Plus } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Result = {
  id: string;
  label: string;
  sublabel: string;
  href: string;
};

type NewJobState = "idle" | "open" | "saving";

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [selected, setSelected] = useState(0);
  const [newJobState, setNewJobState] = useState<NewJobState>("idle");
  const [newJobError, setNewJobError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const newNameRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setResults([]);
    setSelected(0);
    setNewJobState("idle");
    setNewJobError("");
  }, []);

  // ⌘K / Ctrl+K to open
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        if (newJobState === "open") newNameRef.current?.focus();
        else inputRef.current?.focus();
      }, 30);
    }
  }, [open, newJobState]);

  // Search
  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const supabase = createSupabaseBrowserClient();
    const q = query.trim();
    supabase
      .from("jobs")
      .select("id, customer_name, phone, address, status")
      .or(`customer_name.ilike.%${q}%,phone.ilike.%${q}%,address.ilike.%${q}%`)
      .not("status", "in", '("completed","cancelled")')
      .limit(8)
      .then(({ data }) => {
        setResults(
          (data ?? []).map((j: Record<string, string>) => ({
            id: j.id,
            label: j.customer_name,
            sublabel: `${j.address} · ${j.status.replace(/_/g, " ")}`,
            href: `/job/${j.id}`,
          }))
        );
        setSelected(0);
      });
  }, [query]);

  // Keyboard nav within results
  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelected((s) => Math.min(s + 1, results.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setSelected((s) => Math.max(s - 1, 0)); }
    if (e.key === "Enter" && results[selected]) {
      router.push(results[selected].href);
      close();
    }
  }

  async function createJob(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setNewJobError("");
    setNewJobState("saving");
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer_name: fd.get("customer_name"),
        phone: fd.get("phone"),
        address: fd.get("address"),
        issue: fd.get("issue"),
      }),
    });
    if (res.ok) {
      const { job } = await res.json();
      close();
      router.push(`/job/${job.id}`);
    } else {
      const data = await res.json().catch(() => ({}));
      setNewJobError(data.error ?? "Failed to create job.");
      setNewJobState("open");
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[10vh]"
      onClick={close}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" />

      <div
        className="relative w-full max-w-lg overflow-hidden rounded-xl border border-[var(--c-line)] bg-[var(--c-paper)] shadow-[var(--shadow-lg)]"
        onClick={(e) => e.stopPropagation()}
      >
        {newJobState === "open" || newJobState === "saving" ? (
          /* New job inline form */
          <form onSubmit={createJob}>
            <div className="border-b border-[var(--c-line)] px-4 py-3">
              <p className="font-mono text-[10.5px] uppercase tracking-[0.06em] text-[var(--c-text-4)]">New job</p>
            </div>
            <div className="grid gap-3 p-4 sm:grid-cols-2">
              <input ref={newNameRef} className="col-span-2 rounded-xl border border-[var(--c-line)] px-4 py-2.5 text-sm outline-none transition focus:border-[var(--c-signal)] focus:ring-2 focus:ring-[var(--c-signal-w)]" name="customer_name" placeholder="Customer name *" required />
              <input className="rounded-xl border border-[var(--c-line)] px-4 py-2.5 text-sm outline-none transition focus:border-[var(--c-signal)] focus:ring-2 focus:ring-[var(--c-signal-w)]" name="phone" placeholder="Phone *" required type="tel" />
              <input className="rounded-xl border border-[var(--c-line)] px-4 py-2.5 text-sm outline-none transition focus:border-[var(--c-signal)] focus:ring-2 focus:ring-[var(--c-signal-w)]" name="address" placeholder="Address *" required />
              <textarea className="col-span-2 min-h-20 rounded-xl border border-[var(--c-line)] px-4 py-2.5 text-sm outline-none transition focus:border-[var(--c-signal)] focus:ring-2 focus:ring-[var(--c-signal-w)]" name="issue" placeholder="Issue *" required />
              {newJobError && <p className="col-span-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{newJobError}</p>}
            </div>
            <div className="flex items-center justify-between border-t border-[var(--c-line)] px-4 py-3">
              <button className="text-sm text-[var(--c-text-3)] transition hover:text-[var(--c-text)]" onClick={() => setNewJobState("idle")} type="button">Cancel</button>
              <button className="inline-flex items-center gap-2 rounded-full bg-orange-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-orange-300 disabled:opacity-60" disabled={newJobState === "saving"} type="submit">
                {newJobState === "saving" ? "Creating…" : "Create job"}
              </button>
            </div>
          </form>
        ) : (
          /* Search */
          <>
            <div className="flex items-center gap-3 px-4 py-3">
              <Search className="h-4 w-4 shrink-0 text-[var(--c-text-4)]" />
              <input
                ref={inputRef}
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--c-text-4)]"
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Search by name, phone, or address…"
                value={query}
              />
              <kbd className="hidden rounded border border-[var(--c-line)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--c-text-4)] sm:inline">Esc</kbd>
            </div>

            {results.length > 0 && (
              <div className="border-t border-[var(--c-line)]">
                {results.map((r, i) => (
                  <button
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left transition ${i === selected ? "bg-[var(--c-signal-w)]" : "hover:bg-[var(--c-paper-2)]"}`}
                    key={r.id}
                    onClick={() => { router.push(r.href); close(); }}
                    onMouseEnter={() => setSelected(i)}
                    type="button"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[var(--c-text)]">{r.label}</p>
                      <p className="truncate font-mono text-[10.5px] text-[var(--c-text-4)]">{r.sublabel}</p>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[var(--c-text-4)]" />
                  </button>
                ))}
              </div>
            )}

            <div className="border-t border-[var(--c-line)]">
              <button
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-[var(--c-paper-2)]"
                onClick={() => setNewJobState("open")}
                type="button"
              >
                <Plus className="h-4 w-4 shrink-0 text-[var(--c-text-4)]" />
                <span className="text-sm text-[var(--c-text-3)]">Create new job</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
