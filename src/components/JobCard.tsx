"use client";

import Link from "next/link";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import TechnicianDropdown from "@/components/TechnicianDropdown";
import { StatusPill } from "@/components/DesignSystem";
import type { JobWithTechnician, Technician } from "@/types/db";

type Props = {
  job: JobWithTechnician;
  readOnly?: boolean;
  technicians: Technician[];
};

function getTone(issue: string) {
  const text = issue.toLowerCase();
  if (text.includes("emergency") || text.includes("down") || text.includes("urgent")) return "warm" as const;
  return "teal" as const;
}

export default function JobCard({ job, readOnly = false, technicians }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: job.id });
  const initials = job.technicians?.name
    ?.split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <article
      className={`rounded-[1.4rem] border border-slate-200 bg-white p-4 shadow-[var(--shadow-sm)] transition ${isDragging ? "opacity-75" : "hover:-translate-y-0.5"}`}
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <StatusPill tone={getTone(job.issue)}>{job.status}</StatusPill>
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{job.id.slice(0, 8)}</span>
      </div>

      <button className={`w-full text-left ${readOnly ? "cursor-default" : "cursor-grab active:cursor-grabbing"}`} type="button" {...(!readOnly ? listeners : {})} {...(!readOnly ? attributes : {})}>
        <h3 className="font-semibold leading-tight text-slate-950">{job.customer_name}</h3>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{job.issue}</p>
      </button>

      <p className="mt-3 text-xs uppercase tracking-[0.16em] text-slate-400">{job.address}</p>
      <a className="mt-2 inline-flex text-sm font-medium text-teal-700 underline-offset-4 hover:underline" href={`tel:${job.phone}`}>
        {job.phone}
      </a>

      <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Assigned tech</p>
          <p className="mt-1 text-sm font-medium text-slate-700">{job.technicians?.name ?? "Waiting for assignment"}</p>
        </div>
        <div className="grid h-10 w-10 place-items-center rounded-full bg-[linear-gradient(145deg,#0b2235_0%,#133856_100%)] text-xs font-semibold text-white">
          {initials ?? "--"}
        </div>
      </div>

      {readOnly ? (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
          Assignment locked in read-only platform view
        </div>
      ) : (
        <div className="mt-4">
          <TechnicianDropdown jobId={job.id} selectedId={job.technician_id} technicians={technicians} />
        </div>
      )}

      <Link className="mt-4 inline-flex w-full items-center justify-center rounded-full border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50" href={`/job/${job.id}`}>
        Open job
      </Link>
    </article>
  );
}
