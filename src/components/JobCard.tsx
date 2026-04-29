"use client";

import Link from "next/link";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import TechnicianDropdown from "@/components/TechnicianDropdown";
import type { JobWithTechnician, Technician } from "@/types/db";

type Props = {
  job: JobWithTechnician;
  technicians: Technician[];
};

export default function JobCard({ job, technicians }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: job.id,
    });

  return (
    <article
      className={`rounded-lg border border-slate-200 bg-white p-3 shadow-sm ${
        isDragging ? "opacity-70" : ""
      }`}
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
    >
      <button
        className="mb-2 w-full cursor-grab text-left active:cursor-grabbing"
        type="button"
        {...listeners}
        {...attributes}
      >
        <h3 className="font-semibold leading-tight">{job.customer_name}</h3>
        <p className="mt-1 line-clamp-2 text-sm text-slate-600">{job.issue}</p>
      </button>
      <p className="mb-3 text-xs text-slate-500">{job.address}</p>
      <TechnicianDropdown
        jobId={job.id}
        selectedId={job.technician_id}
        technicians={technicians}
      />
      <Link
        className="mt-3 block rounded-md border border-slate-300 px-3 py-2 text-center text-sm font-semibold"
        href={`/job/${job.id}`}
      >
        Open
      </Link>
    </article>
  );
}
