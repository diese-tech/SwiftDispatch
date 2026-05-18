"use client";

import { useDroppable } from "@dnd-kit/core";
import JobCard from "@/components/JobCard";
import { StatusDot } from "@/components/DesignSystem";
import type { JobStatus, JobWithTechnician, Technician } from "@/types/db";

type Props = {
  status: JobStatus;
  jobs: JobWithTechnician[];
  readOnly?: boolean;
  smsFailedJobIds?: string[];
  technicians: Technician[];
  compact?: boolean;
};

const STATUS_LABELS: Record<string, string> = {
  new: "New",
  assigned: "Assigned",
  en_route: "En route",
  in_progress: "In progress",
  quote_pending: "Quote pending",
  completed: "Completed",
  cancelled: "Cancelled",
  no_access: "No access",
};

function getStatusTone(status: string): "neutral" | "blue" | "amber" | "red" | "green" | "violet" {
  if (status === "assigned") return "blue";
  if (status === "en_route" || status === "in_progress") return "amber";
  if (status === "quote_pending") return "violet";
  if (status === "completed") return "green";
  if (status === "no_access" || status === "cancelled") return "red";
  return "neutral";
}

export default function KanbanColumn({
  status,
  jobs,
  readOnly = false,
  smsFailedJobIds = [],
  technicians,
  compact = false,
}: Props) {
  const { isOver, setNodeRef } = useDroppable({ id: status });

  return (
    <section
      ref={setNodeRef}
      className={[
        "rounded-xl border transition-colors",
        compact ? "min-h-0" : "min-h-48",
        isOver
          ? "border-[var(--c-signal)] bg-[var(--c-signal-w)]"
          : "border-[var(--c-line)] bg-[var(--c-paper-2)]",
      ].join(" ")}
    >
      <div className="flex items-center justify-between border-b border-[var(--c-line)] px-3 py-2.5">
        <StatusDot tone={getStatusTone(String(status))}>
          {STATUS_LABELS[status] ?? status}
        </StatusDot>
        <span className="font-mono text-[10.5px] text-[var(--c-text-4)]">{jobs.length}</span>
      </div>

      <div className={compact ? "space-y-2 p-2" : "space-y-2 p-2"}>
        {jobs.map((job) => (
          <JobCard
            hasSmsFailure={smsFailedJobIds.includes(job.id)}
            job={job}
            key={job.id}
            readOnly={readOnly}
            technicians={technicians}
          />
        ))}
        {jobs.length === 0 ? (
          <p className="px-3 py-4 font-mono text-[10.5px] text-[var(--c-text-4)]">
            0 jobs · clear
          </p>
        ) : null}
      </div>
    </section>
  );
}
