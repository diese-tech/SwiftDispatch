"use client";

import Link from "next/link";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import TechnicianDropdown from "@/components/TechnicianDropdown";
import { StatusDot } from "@/components/DesignSystem";
import type { JobWithTechnician, Technician } from "@/types/db";

type Props = {
  job: JobWithTechnician;
  readOnly?: boolean;
  technicians: Technician[];
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

function jobAge(createdAt: string): { label: string; tone: "neutral" | "amber" | "red" } {
  const mins = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
  const hours = Math.floor(mins / 60);
  const label = hours > 0 ? `${hours}h ${mins % 60}m` : `${mins}m`;
  const tone = hours >= 2 ? "red" : mins >= 30 ? "amber" : "neutral";
  return { label, tone };
}

function getStatusTone(status: string): "neutral" | "blue" | "amber" | "red" | "green" | "violet" {
  if (status === "assigned") return "blue";
  if (status === "en_route" || status === "in_progress") return "amber";
  if (status === "quote_pending") return "violet";
  if (status === "completed") return "green";
  if (status === "no_access" || status === "cancelled") return "red";
  return "neutral";
}

export default function JobCard({ job, readOnly = false, technicians }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: job.id,
  });

  const initials = job.technicians?.name
    ?.split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const isEmergency = /emergency|urgent/i.test(job.issue);
  const normalizedStatus = job.status;
  const age = jobAge(job.created_at);

  return (
    <article
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      {...(!readOnly ? listeners : {})}
      {...(!readOnly ? attributes : {})}
      className={[
        "rounded-xl border bg-[var(--c-paper)] transition-shadow select-none",
        isEmergency
          ? "border-l-[3px] border-l-[var(--c-red)] border-[var(--c-line)]"
          : "border-[var(--c-line)]",
        isDragging ? "opacity-70 shadow-lg ring-1 ring-[var(--c-signal)]" : "shadow-[var(--shadow-sm)]",
        !readOnly ? "cursor-grab active:cursor-grabbing" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <StatusDot tone={getStatusTone(normalizedStatus)}>
            {STATUS_LABELS[normalizedStatus] ?? normalizedStatus}
          </StatusDot>
          <span className={`font-mono text-[10px] ${age.tone === "red" ? "text-[var(--c-red)]" : age.tone === "amber" ? "text-[var(--c-amber)]" : "text-[var(--c-text-4)]"}`}>
            {age.label}
          </span>
        </div>

        <Link
          href={`/job/${job.id}`}
          className="block text-sm font-semibold text-[var(--c-text)] transition-colors hover:text-[var(--c-signal)]"
          onClick={(e) => e.stopPropagation()}
        >
          {job.customer_name}
        </Link>

        <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--c-text-3)]">{job.issue}</p>
        <p className="mt-1.5 text-[11px] text-[var(--c-text-4)]">{job.address}</p>
      </div>

      {!readOnly ? (
        <div className="border-t border-[var(--c-line)] px-3 py-2">
          <TechnicianDropdown
            jobId={job.id}
            selectedId={job.technician_id}
            technicians={technicians}
          />
        </div>
      ) : (
        <div className="flex items-center gap-2 border-t border-[var(--c-line)] px-3 py-2">
          <div className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[var(--navy)] font-mono text-[9px] font-bold text-white">
            {initials ?? "—"}
          </div>
          <span className="text-[11px] text-[var(--c-text-3)]">
            {job.technicians?.name ?? "Unassigned"}
          </span>
        </div>
      )}
    </article>
  );
}
