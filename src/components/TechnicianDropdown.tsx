"use client";

import { useState } from "react";
import type { Technician } from "@/types/db";

type Props = {
  jobId: string;
  selectedId: string | null;
  technicians: Technician[];
};

export default function TechnicianDropdown({
  jobId,
  selectedId,
  technicians,
}: Props) {
  const [value, setValue] = useState(selectedId ?? "");

  async function assign(nextValue: string) {
    setValue(nextValue);
    await fetch(`/api/jobs/${jobId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        technician_id: nextValue || null,
        status: nextValue ? "Assigned" : undefined,
      }),
    });
  }

  return (
    <select
      className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
      value={value}
      onChange={(event) => assign(event.target.value)}
    >
      <option value="">Unassigned</option>
      {technicians.map((tech) => (
        <option key={tech.id} value={tech.id}>
          {tech.name}
        </option>
      ))}
    </select>
  );
}
