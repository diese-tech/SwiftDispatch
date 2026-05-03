"use client";

import { useDroppable } from "@dnd-kit/core";
import JobCard from "@/components/JobCard";
import { StatusPill } from "@/components/DesignSystem";
import type { JobStatus, JobWithTechnician, Technician } from "@/types/db";

type Props = {
  status: JobStatus;
  jobs: JobWithTechnician[];
  technicians: Technician[];
};

function getTone(status: string) {
  if (status === "Completed") return "success" as const;
  if (status === "En Route") return "warm" as const;
  return "teal" as const;
}

export default function KanbanColumn({ status, jobs, technicians }: Props) {
  const { isOver, setNodeRef } = useDroppable({ id: status });

  return (
    <section className={`min-h-64 rounded-[1.8rem] border p-4 shadow-[var(--shadow-sm)] sm:min-h-96 ${isOver ? "border-teal-400 bg-teal-50/80" : "border-slate-200 bg-[rgba(255,255,255,0.72)] backdrop-blur-sm"}`} ref={setNodeRef}>
      <div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-3">
          <StatusPill tone={getTone(String(status))}>{status}</StatusPill>
          <span className="text-sm font-medium text-slate-500">{jobs.length} jobs</span>
        </div>
        <span className="rounded-full bg-slate-950 px-2.5 py-1 text-xs font-semibold text-white">{jobs.length}</span>
      </div>
      <div className="space-y-4">
        {jobs.map((job) => <JobCard job={job} key={job.id} technicians={technicians} />)}
      </div>
    </section>
  );
}