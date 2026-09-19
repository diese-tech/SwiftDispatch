"use client";

import { useState } from "react";
import { assignTechnician } from "@/lib/technicianAssignment";
import type { JobWithTechnician, Technician } from "@/types/db";

type Props = {
  jobId: string;
  selectedId: string | null;
  technicians: Technician[];
  onAssigned?: (job: JobWithTechnician) => void;
};

export default function TechnicianDropdown({ jobId, selectedId, technicians, onAssigned }: Props) {
  const [value, setValue] = useState(selectedId ?? "");
  const [error, setError] = useState("");

  async function assign(nextValue: string) {
    const previousValue = value;
    setValue(nextValue);
    setError("");

    const outcome = await assignTechnician(jobId, nextValue || null);

    if (!outcome.ok) {
      setValue(previousValue);
      setError(outcome.error);
      return;
    }

    setValue(outcome.job.technician_id ?? "");
    onAssigned?.(outcome.job);
  }

  return (
    <label className="block">
      <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Assign technician</span>
      <select className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-800 shadow-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100" value={value} onChange={(event) => assign(event.target.value)}>
        <option value="">Unassigned</option>
        {technicians.map((tech) => (
          <option key={tech.id} value={tech.id}>{tech.name}</option>
        ))}
      </select>
      {error ? <p className="mt-1.5 text-[11px] font-medium text-red-600">{error}</p> : null}
    </label>
  );
}
