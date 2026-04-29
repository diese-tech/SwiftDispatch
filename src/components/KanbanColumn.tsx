"use client";

import { useDroppable } from "@dnd-kit/core";
import JobCard from "@/components/JobCard";
import type { JobStatus, JobWithTechnician, Technician } from "@/types/db";

type Props = {
  status: JobStatus;
  jobs: JobWithTechnician[];
  technicians: Technician[];
};

export default function KanbanColumn({ status, jobs, technicians }: Props) {
  const { isOver, setNodeRef } = useDroppable({ id: status });

  return (
    <section
      className={`min-h-96 rounded-lg border p-3 ${
        isOver ? "border-teal-500 bg-teal-50" : "border-slate-200 bg-slate-100"
      }`}
      ref={setNodeRef}
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">{status}</h2>
        <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-600">
          {jobs.length}
        </span>
      </div>
      <div className="space-y-3">
        {jobs.map((job) => (
          <JobCard job={job} key={job.id} technicians={technicians} />
        ))}
      </div>
    </section>
  );
}
