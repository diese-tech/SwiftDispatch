"use client";

import { useDroppable } from "@dnd-kit/core";
import JobCard from "@/components/JobCard";
import { StatusPill } from "@/components/DesignSystem";
import type { JobStatus, JobWithTechnician, Technician } from "@/types/db";

type Props = {
  status: JobStatus;
  jobs: JobWithTechnician[];
  readOnly?: boolean;
  technicians: Technician[];
  compact?: boolean;
};

function getTone(status: string) {
  if (status === "Completed") return "success" as const;
  if (status === "En Route") return "warm" as const;
  return "teal" as const;
}

export default function KanbanColumn({ status, jobs, readOnly = false, technicians, compact = false }: Props) {
  const { isOver, setNodeRef } = useDroppable({ id: status });

  return (
    <section className={`${compact ? "min-h-0" : "min-h-64 sm:min-h-96"} rounded-[1.8rem] border p-4 shadow-[var(--shadow-sm)] ${isOver ? "border-teal-400 bg-teal-50/80" : "border-slate-200 bg-[rgba(255,255,255,0.72)] backdrop-blur-sm"}`} ref={setNodeRef}>
      <div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-3">
          <StatusPill tone={getTone(String(status))}>{status}</StatusPill>
          <span className="text-sm font-medium text-slate-500">{jobs.length} jobs</span>
        </div>
        <span className="rounded-full bg-slate-950 px-2.5 py-1 text-xs font-semibold text-white">{jobs.length}</span>
      </div>
      <div className={`${compact ? "space-y-3" : "space-y-4"}`}>
        {jobs.map((job) => <JobCard job={job} key={job.id} readOnly={readOnly} technicians={technicians} />)}
        {jobs.length === 0 ? (
          <div className="rounded-[1.25rem] border border-dashed border-slate-200 bg-slate-50/80 px-4 py-6 text-sm leading-6 text-slate-500">
            No jobs are sitting in this lane right now.
          </div>
        ) : null}
      </div>
    </section>
  );
}
