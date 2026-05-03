"use client";

import { useMemo, useState } from "react";
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { Plus } from "lucide-react";
import KanbanColumn from "@/components/KanbanColumn";
import { MetricTile, SurfaceCard } from "@/components/DesignSystem";
import type { JobStatus, JobWithTechnician, Technician } from "@/types/db";

const statuses: JobStatus[] = ["New", "Assigned", "En Route", "Completed"];

type Props = {
  initialJobs: JobWithTechnician[];
  technicians: Technician[];
};

export default function KanbanBoard({ initialJobs, technicians }: Props) {
  const [jobs, setJobs] = useState(initialJobs);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor));

  const jobsByStatus = useMemo(() => {
    return statuses.reduce((acc, status) => ({ ...acc, [status]: jobs.filter((job) => job.status === status) }), {} as Record<JobStatus, JobWithTechnician[]>);
  }, [jobs]);

  async function onDragEnd(event: DragEndEvent) {
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
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Quick action</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Create and route a new job without leaving the board.</h2>
          </div>
          <button className="inline-flex items-center justify-center gap-2 rounded-full bg-orange-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-orange-300" onClick={() => setFormOpen((current) => !current)} type="button">
            <Plus size={16} /> {formOpen ? "Close form" : "New Job"}
          </button>
        </div>

        {formOpen ? (
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
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {statuses.map((status) => <KanbanColumn jobs={jobsByStatus[status]} key={status} status={status} technicians={technicians} />)}
        </div>
      </DndContext>
    </div>
  );
}