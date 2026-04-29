"use client";

import { useState } from "react";
import type { CloseStatus } from "@/types/db";

const statuses: { value: CloseStatus; label: string }[] = [
  { value: "not_contacted", label: "Not contacted" },
  { value: "contacted", label: "Contacted" },
  { value: "demo_done", label: "Demo done" },
  { value: "interested", label: "Interested" },
  { value: "closed_won", label: "Closed won" },
  { value: "closed_lost", label: "Closed lost" },
];

export default function CloseStatusSelect({
  initialStatus,
}: {
  initialStatus: CloseStatus;
}) {
  const [value, setValue] = useState(initialStatus);

  async function update(nextValue: CloseStatus) {
    setValue(nextValue);
    await fetch("/api/company", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ close_status: nextValue }),
    });
  }

  return (
    <label className="block min-w-48">
      <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">
        Close Signal
      </span>
      <select
        className="w-full rounded-md border border-slate-300 bg-white px-3 py-3 text-base"
        value={value}
        onChange={(event) => update(event.target.value as CloseStatus)}
      >
        {statuses.map((status) => (
          <option key={status.value} value={status.value}>
            {status.label}
          </option>
        ))}
      </select>
    </label>
  );
}
