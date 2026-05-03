"use client";

import { useState } from "react";
import type { Technician } from "@/types/db";

type Props = {
  jobId: string;
  selectedId: string | null;
  technicians: Technician[];
};

export default function TechnicianDropdown({ jobId, selectedId, technicians }: Props) {
  const [value, setValue] = useState(selectedId ?? "");

  async function assign(nextValue: string) {
    setValue(nextValue);
    await fetch(`/api/jobs/${jobId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ technician_id: nextValue || null, status: nextValue ? "Assigned" : undefined }),
    });
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
    </label>
  );
}