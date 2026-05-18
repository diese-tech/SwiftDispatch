"use client";

import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { Plus } from "lucide-react";
import KanbanColumn from "@/components/KanbanColumn";
import { MetricTile, SurfaceCard } from "@/components/DesignSystem";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { JobStatus, JobWithTechnician, Technician } from "@/types/db";

const statuses: JobStatus[] = [
  "new",
  "assigned",
  "en_route",
  "in_progress",
  "quote_pending",
  "no_access",
];

const LEGACY_STATUS_MAP: Record<string, JobStatus> = {
  New: "new",
  Assigned: "assigned",
  "En Route": "en_route",
  Completed: "completed",
};

const STATUS_LABELS: Record<string, string> = {
  new: "New",
  assigned: "Assigned",
  en_route: "En Route",
  in_progress: "In Progress",
  quote_pending: "Quote Pending",
  completed: "Completed",
  cancelled: "Cancelled",
  no_access: "No Access",
};

function normalizeStatus(status: string): JobStatus {
  return (LEGACY_STATUS_MAP[status] ?? status) as JobStatus;
}

type Props = {
  companyId: string;
  initialJobs: JobWithTechnician[];
  readOnly?: boolean;
  technicians: Technician[];
};

export default function KanbanBoard({ companyId, initialJobs, readOnly = false, technicians }: Props) {
  const [jobs, setJobs] = useState(
    initialJobs.map((job) => ({ ...job, status: normalizeStatus(job.status) })),
  );
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [connected, setConnected] = useState(true);
  const [mobileStatus, setMobileStatus] = useState<JobStatus>("new");
  const sensors = useSensors(useSensor(PointerSensor));
  const technicianMap = useRef<Map<string, Pick<Technician, "id" | "name" | "phone">>>(new Map());

  useEffect(() => {
    technicianMap.current = new Map(technicians.map((t) => [t.id, t]));
  }, [technicians]);

  useEffect(() => {
    setJobs(initialJobs.map((job) => ({ ...job, status: normalizeStatus(job.status) })));
  }, [initialJobs]);

  useEffect(() => {
    if (readOnly) return;

    const supabase = createSupabaseBrowserClient();

    async function refetchAll() {
      const { data } = await supabase
        .from("jobs")
        .select("*, technicians!jobs_technician_id_fkey(id,name,phone)")
        .eq("company_id", companyId)
        .eq("is_demo", false)
        .order("created_at", { ascending: false });
      if (data) {
        startTransition(() => {
          setJobs((data as JobWithTechnician[]).map((job) => ({ ...job, status: normalizeStatus(job.status) })));
        });
      }
    }

    const channel = supabase
      .channel(`jobs:company:${companyId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "jobs", filter: `company_id=eq.${companyId}` },
        (payload) => {
          startTransition(() => {
            if (payload.eventType === "INSERT") {
              const raw = payload.new as JobWithTechnician;
              const job: JobWithTechnician = {
                ...raw,
                status: normalizeStatus(raw.status),
                technicians: raw.technician_id ? (technicianMap.current.get(raw.technician_id) ?? null) : null,
              };
              setJobs((current) => {
                if (current.some((j) => j.id === job.id)) return current;
                return [job, ...current];
              });
            } else if (payload.eventType === "UPDATE") {
              const raw = payload.new as JobWithTechnician;
              setJobs((current) =>
                current.map((j) =>
                  j.id === raw.id
                    ? {
                        ...raw,
                        status: normalizeStatus(raw.status),
                        technicians: raw.technician_id ? (technicianMap.current.get(raw.technician_id) ?? j.technicians ?? null) : null,
                      }
                    : j
                )
              );
            } else if (payload.eventType === "DELETE") {
              const id = (payload.old as { id: string }).id;
              setJobs((current) => current.filter((j) => j.id !== id));
            }
          });
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setConnected(true);
        if (status === "CLOSED" || status === "CHANNEL_ERROR") {
          setConnected(false);
          void refetchAll();
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [companyId, readOnly]);

  const jobsByStatus = useMemo(() => {
    return statuses.reduce(
      (acc, status) => ({
        ...acc,
        [status]: jobs.filter((job) => normalizeStatus(job.status) === status),
      }),
      {} as Record<JobStatus, JobWithTechnician[]>,
    );
  }, [jobs]);

  async function onDragEnd(event: DragEndEvent) {
    if (readOnly) return;
    const jobId = event.active.id.toString();
    const nextStatus = event.over?.id?.toString() as JobStatus | undefined;
    const job = jobs.find((item) => item.id === jobId);
    if (!nextStatus || !statuses.includes(nextStatus) || !job || job.status === nextStatus) return;

    setJobs((current) => current.map((item) => (item.id === jobId ? { ...item, status: nextStatus } : item)));

    const response = await fetch(`/api/jobs/${jobId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });

    if (!response.ok) {
      setJobs((current) => current.map((item) => (item.id === jobId ? { ...item, status: job.status } : item)));
    }
  }

  async function createJob(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setSaveError("");
    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer_name: formData.get("customer_name"),
        phone: formData.get("phone"),
        address: formData.get("address"),
        issue: formData.get("issue"),
      }),
    });
    setSaving(false);
    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      setSaveError(data.error ?? "Failed to create job. Please try again.");
      return;
    }
    const { job } = (await response.json()) as { job: JobWithTechnician };
    setJobs((current) => [job, ...current]);
    event.currentTarget.reset();
    setSaveError("");
    setFormOpen(false);
  }

  const unassignedCount = jobs.filter((job) => !job.technician_id).length;
  const enRouteCount = jobs.filter((job) => normalizeStatus(job.status) === "en_route").length;
  const mobileJobs = jobsByStatus[mobileStatus];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile label="Open jobs" value={jobs.length} detail="Everything currently on the live board" />
        <MetricTile label="Unassigned" value={unassignedCount} detail="Jobs that still need technician ownership" />
        <MetricTile label="En route" value={enRouteCount} detail="Active field work already in motion" />
        <MetricTile label="Technicians" value={technicians.length} detail="Available crew members in this workspace" />
      </div>

      <SurfaceCard accent className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{readOnly ? "Platform view" : "Quick action"}</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              {readOnly ? "This board is intentionally view-only in superadmin impersonation mode." : "Create and route a new job without leaving the board."}
            </h2>
          </div>
          {readOnly ? (
            <span className="rounded border border-orange-200 bg-orange-50 px-2 py-0.5 font-mono text-[10.5px] font-medium text-orange-700">Read only</span>
          ) : (
            <button className="inline-flex items-center justify-center gap-2 rounded-full bg-orange-400 px-5 py-3 text-sm font-semibold !text-slate-950 transition hover:bg-orange-300" onClick={() => setFormOpen((current) => !current)} type="button">
              <Plus size={16} /> {formOpen ? "Close form" : "New Job"}
            </button>
          )}
        </div>

        {readOnly ? (
          <p className="mt-4 text-sm leading-7 text-slate-500">
            Open job detail and board state for review, but leave creation, assignment, and status changes to the tenant workspace itself.
          </p>
        ) : formOpen ? (
          <form className="mt-6 grid gap-3 md:grid-cols-2" onSubmit={createJob}>
            <input className="rounded-xl border border-[var(--c-line)] bg-[var(--c-paper)] px-4 py-3 text-sm outline-none transition focus:border-[var(--c-signal)] focus:ring-2 focus:ring-[var(--c-signal-w)]" name="customer_name" placeholder="Customer name" required />
            <input className="rounded-xl border border-[var(--c-line)] bg-[var(--c-paper)] px-4 py-3 text-sm outline-none transition focus:border-[var(--c-signal)] focus:ring-2 focus:ring-[var(--c-signal-w)]" name="phone" placeholder="Phone" required />
            <input className="rounded-xl border border-[var(--c-line)] bg-[var(--c-paper)] px-4 py-3 text-sm outline-none transition focus:border-[var(--c-signal)] focus:ring-2 focus:ring-[var(--c-signal-w)] md:col-span-2" name="address" placeholder="Address" required />
            <textarea className="min-h-28 rounded-xl border border-[var(--c-line)] bg-[var(--c-paper)] px-4 py-3 text-sm outline-none transition focus:border-[var(--c-signal)] focus:ring-2 focus:ring-[var(--c-signal-w)] md:col-span-2" name="issue" placeholder="Issue" required />
            {saveError ? (
              <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 md:col-span-2">{saveError}</p>
            ) : null}
            <button className="rounded-full bg-slate-950 px-4 py-3 text-sm font-semibold !text-white disabled:opacity-60" disabled={saving}>{saving ? "Saving..." : "Create Job"}</button>
          </form>
        ) : null}
      </SurfaceCard>

      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <SurfaceCard className="p-4 md:hidden">
          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Mobile board mode</p>
                <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">Focus on one lane at a time.</h2>
              </div>
              <span className={`font-mono text-[10.5px] ${connected ? "text-[var(--c-green)]" : "text-[var(--c-amber)]"}`}>
                {connected ? `${mobileJobs.length} visible` : "Reconnecting…"}
              </span>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
              {statuses.map((status) => (
                <button
                  key={status}
                  className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
                    mobileStatus === status
                      ? "bg-slate-950 !text-white"
                      : "border border-slate-200 bg-white !text-slate-700 hover:bg-slate-50"
                  }`}
                  onClick={() => setMobileStatus(status)}
                  type="button"
                >
                  {STATUS_LABELS[status]}
                </button>
              ))}
            </div>

            <KanbanColumn jobs={mobileJobs} readOnly={readOnly} status={mobileStatus} technicians={technicians} compact />
          </div>
        </SurfaceCard>

        <div className="hidden gap-4 md:grid md:grid-cols-2 xl:grid-cols-4">
          {statuses.map((status) => <KanbanColumn jobs={jobsByStatus[status]} key={status} readOnly={readOnly} status={status} technicians={technicians} />)}
        </div>
      </DndContext>
    </div>
  );
}
