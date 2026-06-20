"use client";

import { useCallback, useEffect, useState } from "react";
import { MapPin, Phone, Smartphone, X } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { VALID_TRANSITIONS } from "@/lib/stateMachine";
import type { JobStatus } from "@/lib/stateMachine";

type ActiveJob = {
  id: string;
  customer_name: string;
  phone: string;
  address: string;
  issue: string;
  status: string;
  urgency: string | null;
};

type Props = {
  demoTechId: string;
  demoTechName: string;
  companyId: string;
};

const STATUS_LABEL: Record<string, string> = {
  new: "New", assigned: "Assigned", en_route: "En Route",
  in_progress: "In Progress", quote_pending: "Quote Pending",
  completed: "Completed", cancelled: "Cancelled", no_access: "No Access",
};

const URGENCY_BADGE: Record<string, { label: string; cls: string }> = {
  emergency: { label: "Emergency", cls: "border-red-200 bg-red-50 text-red-700" },
  same_day: { label: "Same day", cls: "border-orange-200 bg-orange-50 text-orange-700" },
  scheduled: { label: "Scheduled", cls: "border-slate-200 bg-slate-50 text-slate-600" },
};

function canTransition(current: string, target: JobStatus) {
  const transitions = VALID_TRANSITIONS[current as JobStatus];
  return Array.isArray(transitions) && transitions.includes(target);
}

export default function TechPhoneModal({ demoTechId, demoTechName, companyId }: Props) {
  const [open, setOpen] = useState(false);
  const [job, setJob] = useState<ActiveJob | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  const fetchJob = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase
      .from("jobs")
      .select("id, customer_name, phone, address, issue, status, urgency")
      .eq("technician_id", demoTechId)
      .not("status", "in", '("completed","cancelled","no_access")')
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    setJob(data as ActiveJob | null);
  }, [demoTechId]);

  useEffect(() => {
    if (!open) return;

    setLoading(true);
    void fetchJob().finally(() => setLoading(false));

    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`demo-tech:${demoTechId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "jobs", filter: `company_id=eq.${companyId}` },
        () => void fetchJob(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [open, fetchJob, demoTechId, companyId]);

  async function postStatus(newStatus: JobStatus) {
    if (!job) return;
    setError("");
    setActionLoading(newStatus);
    try {
      const res = await fetch(`/api/jobs/${job.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        setError(data.error ?? "Something went wrong");
      } else {
        await fetchJob();
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setActionLoading(null);
    }
  }

  const urgencyBadge = URGENCY_BADGE[job?.urgency ?? "scheduled"] ?? URGENCY_BADGE.scheduled;
  const btnBase = "flex-1 rounded-xl py-2.5 text-[11px] font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed";
  const primaryBtn = `${btnBase} bg-slate-950 text-white`;
  const ghostBtn = `${btnBase} border border-slate-200 bg-white text-slate-700`;

  return (
    <>
      {/* Floating button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-[0_8px_32px_rgba(0,0,0,0.28)] transition hover:bg-slate-800 active:scale-95"
      >
        <Smartphone className="h-4 w-4" />
        Tech view
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-end bg-black/30 pb-6 pr-6 backdrop-blur-sm sm:items-center sm:justify-center sm:pb-0 sm:pr-0"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="relative flex flex-col items-center">
            {/* Close button above phone */}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mb-3 flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-md backdrop-blur-sm transition hover:bg-white"
            >
              <X className="h-3.5 w-3.5" />
              Close tech view
            </button>

            {/* Label */}
            <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.06em] text-white/70">
              {demoTechName} · field technician
            </p>

            {/* iPhone frame */}
            <div className="relative w-[300px]">
              {/* Phone body */}
              <div className="relative rounded-[3rem] border-[8px] border-slate-800 bg-slate-800 shadow-[0_32px_80px_rgba(0,0,0,0.5)]">
                {/* Dynamic island */}
                <div className="absolute left-1/2 top-3 z-10 h-[18px] w-[90px] -translate-x-1/2 rounded-full bg-black" />
                {/* Side buttons */}
                <div className="absolute -left-[10px] top-20 h-8 w-[3px] rounded-full bg-slate-600" />
                <div className="absolute -left-[10px] top-32 h-12 w-[3px] rounded-full bg-slate-600" />
                <div className="absolute -left-[10px] top-48 h-12 w-[3px] rounded-full bg-slate-600" />
                <div className="absolute -right-[10px] top-36 h-16 w-[3px] rounded-full bg-slate-600" />

                {/* Screen */}
                <div className="overflow-hidden rounded-[2.4rem] bg-slate-50" style={{ minHeight: 580 }}>
                  {/* Status bar */}
                  <div className="flex items-center justify-between px-6 pb-1 pt-8">
                    <span className="font-mono text-[10px] font-semibold text-zinc-900">9:41</span>
                    <div className="flex items-center gap-1 text-zinc-800">
                      <span className="text-[10px]">●●●●</span>
                    </div>
                  </div>

                  {/* App content */}
                  <div className="px-4 pb-6">
                    {/* Top bar */}
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <p className="font-mono text-[9px] uppercase tracking-[0.06em] text-slate-400">Technician</p>
                        <p className="text-sm font-semibold text-slate-950">{demoTechName}</p>
                      </div>
                      <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] text-slate-500">Sign out</span>
                    </div>

                    {loading ? (
                      <div className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center">
                        <p className="text-xs text-slate-400">Loading…</p>
                      </div>
                    ) : job ? (
                      <>
                        {/* Active job card */}
                        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
                          <div className="border-b border-slate-100 px-4 py-3">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="font-mono text-[9px] uppercase tracking-[0.06em] text-slate-400">Active job</p>
                                <p className="mt-0.5 text-sm font-semibold text-slate-950">{job.customer_name}</p>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <span className={`rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.05em] ${urgencyBadge.cls}`}>
                                  {urgencyBadge.label}
                                </span>
                                <span className="font-mono text-[9px] text-slate-500">
                                  {STATUS_LABEL[job.status] ?? job.status}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="divide-y divide-slate-100">
                            <div className="flex items-center gap-2 px-4 py-2.5">
                              <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                              <div>
                                <p className="font-mono text-[8.5px] uppercase tracking-[0.06em] text-slate-400">Address</p>
                                <p className="text-[11px] font-medium text-slate-950">{job.address}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 px-4 py-2.5">
                              <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                              <div>
                                <p className="font-mono text-[8.5px] uppercase tracking-[0.06em] text-slate-400">Customer</p>
                                <p className="text-[11px] font-medium text-teal-700">{job.phone}</p>
                              </div>
                            </div>
                            <div className="px-4 py-2.5">
                              <p className="font-mono text-[8.5px] uppercase tracking-[0.06em] text-slate-400">Issue</p>
                              <p className="mt-0.5 text-[11px] leading-[1.5] text-slate-700">{job.issue}</p>
                            </div>
                          </div>

                          {/* Action buttons */}
                          <div className="border-t border-slate-100 bg-slate-50 px-4 py-3">
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                className={canTransition(job.status, "en_route") ? primaryBtn : ghostBtn}
                                disabled={!canTransition(job.status, "en_route") || !!actionLoading}
                                onClick={() => void postStatus("en_route")}
                              >
                                {actionLoading === "en_route" ? "…" : "En Route"}
                              </button>
                              <button
                                type="button"
                                className={canTransition(job.status, "in_progress") ? primaryBtn : ghostBtn}
                                disabled={!canTransition(job.status, "in_progress") || !!actionLoading}
                                onClick={() => void postStatus("in_progress")}
                              >
                                {actionLoading === "in_progress" ? "…" : "Arrived"}
                              </button>
                              <button
                                type="button"
                                className={canTransition(job.status, "quote_pending") ? primaryBtn : ghostBtn}
                                disabled={!canTransition(job.status, "quote_pending") || !!actionLoading}
                                onClick={() => void postStatus("quote_pending")}
                              >
                                {actionLoading === "quote_pending" ? "…" : "Build Quote"}
                              </button>
                              <button
                                type="button"
                                className={canTransition(job.status, "completed") ? primaryBtn : ghostBtn}
                                disabled={!canTransition(job.status, "completed") || !!actionLoading}
                                onClick={() => void postStatus("completed")}
                              >
                                {actionLoading === "completed" ? "…" : "Complete"}
                              </button>
                            </div>
                            {error && (
                              <p className="mt-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[10px] text-red-700">
                                {error}
                              </p>
                            )}
                          </div>
                        </div>

                        <p className="mt-3 text-center font-mono text-[9px] text-slate-400">
                          Tap buttons above to update job status live
                        </p>
                      </>
                    ) : (
                      <div className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center">
                        <p className="font-mono text-[9px] uppercase tracking-[0.06em] text-slate-400">Status</p>
                        <p className="mt-2 text-sm font-semibold text-slate-950">No active job</p>
                        <p className="mx-auto mt-1 max-w-[180px] text-[11px] leading-5 text-slate-500">
                          Assign a job to {demoTechName} from the dispatch board.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
