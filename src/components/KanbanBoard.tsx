"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { Plus } from "lucide-react";
import KanbanColumn from "@/components/KanbanColumn";
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
    return statuses.reduce(
      (acc, status) => ({
        ...acc,
        [status]: jobs.filter((job) => job.status === status),
      }),
      {} as Record<JobStatus, JobWithTechnician[]>,
    );
  }, [jobs]);

  async function onDragEnd(event: DragEndEvent) {
    const jobId = event.active.id.toString();
    const nextStatus = event.over?.id?.toString() as JobStatus | undefined;
    const job = jobs.find((item) => item.id === jobId);

    if (!nextStatus || !statuses.includes(nextStatus) || !job) return;
    if (job.status === nextStatus) return;

    setJobs((current) =>
      current.map((item) =>
        item.id === jobId ? { ...item, status: nextStatus } : item,
      ),
    );

    const response = await fetch(`/api/jobs/${jobId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });

    if (!response.ok) {
      setJobs((current) =>
        current.map((item) =>
          item.id === jobId ? { ...item, status: job.status } : item,
        ),
      );
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

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <button
          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-teal-700 px-4 py-3 text-base font-semibold text-white sm:w-auto"
          onClick={() => setFormOpen((current) => !current)}
          type="button"
        >
          <Plus size={16} /> New Job
        </button>
        {formOpen ? (
          <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={createJob}>
            <input
              className="rounded-md border border-slate-300 px-3 py-2"
              name="customer_name"
              placeholder="Customer name"
              required
            />
            <input
              className="rounded-md border border-slate-300 px-3 py-2"
              name="phone"
              placeholder="Phone"
              required
            />
            <input
              className="rounded-md border border-slate-300 px-3 py-2 md:col-span-2"
              name="address"
              placeholder="Address"
              required
            />
            <textarea
              className="min-h-24 rounded-md border border-slate-300 px-3 py-2 md:col-span-2"
              name="issue"
              placeholder="Issue"
              required
            />
            <button
              className="rounded-md bg-slate-900 px-4 py-3 text-base font-semibold text-white disabled:opacity-60"
              disabled={saving}
            >
              {saving ? "Saving..." : "Create Job"}
            </button>
          </form>
        ) : null}
      </div>

      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {statuses.map((status) => (
            <KanbanColumn
              jobs={jobsByStatus[status]}
              key={status}
              status={status}
              technicians={technicians}
            />
          ))}
        </div>
      </DndContext>
    </div>
  );
}
