"use client";

import { useMemo, useState } from "react";
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { Plus } from "lucide-react";
import KanbanColumn from "@/components/KanbanColumn";
import { MetricTile, StatusPill, SurfaceCard } from "@/components/DesignSystem";
import type { JobStatus, JobWithTechnician, Technician } from "@/types/db";

const statuses: JobStatus[] = ["New", "Assigned", "En Route", "Completed"];

type Props = {
  initialJobs: JobWithTechnician[];
  readOnly?: boolean;
  technicians: Technician[];
};

export default function KanbanBoard({ initialJobs, readOnly = false, technicians }: Props) {
  const [jobs, setJobs] = useState(initialJobs);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mobileStatus, setMobileStatus] = useState<JobStatus>("New");
  const sensors = useSensors(useSensor(PointerSensor));

  const jobsByStatus = useMemo(() => {
    return statuses.reduce((acc, status) => ({ ...acc, [status]: jobs.filter((job) => job.status === status) }), {} as Record<JobStatus, JobWithTechnician[]>);
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
    if (!response.ok) return;
    const { job } = (await response.json()) as { job: JobWithTechnician };
    setJobs((current) => [job, ...current]);
    event.currentTarget.reset();
    setFormOpen(false);
  }

  const unassignedCount = jobs.filter((job) => !job.technician_id).length;
  const enRouteCount = jobs.filter((job) => job.status === "En Route").length;
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
            <StatusPill tone="warm">Read only</StatusPill>
          ) : (
            <button className="inline-flex items-center justify-center gap-2 rounded-full bg-orange-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-orange-300" onClick={() => setFormOpen((current) => !current)} type="button">
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
            <input className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100" name="customer_name" placeholder="Customer name" required />
            <input className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100" name="phone" placeholder="Phone" required />
            <input className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100 md:col-span-2" name="address" placeholder="Address" required />
            <textarea className="min-h-28 rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100 md:col-span-2" name="issue" placeholder="Issue" required />
            <button className="rounded-full bg-slate-950 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60" disabled={saving}>{saving ? "Saving..." : "Create Job"}</button>
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
              <StatusPill tone="teal">{mobileJobs.length} visible</StatusPill>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
              {statuses.map((status) => (
                <button
                  key={status}
                  className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
                    mobileStatus === status
                      ? "bg-slate-950 text-white"
                      : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                  onClick={() => setMobileStatus(status)}
                  type="button"
                >
                  {status}
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
