"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DemoModeToggle({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [checked, setChecked] = useState(enabled);
  const [loading, setLoading] = useState(false);

  async function toggle(nextValue: boolean) {
    setChecked(nextValue);
    setLoading(true);
    const response = await fetch("/api/demo-mode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: nextValue }),
    });
    setLoading(false);

    if (!response.ok) {
      setChecked(!nextValue);
      return;
    }

    router.refresh();
  }

  return (
    <label className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 sm:w-auto">
      <span>
        <span className="block text-sm font-semibold text-teal-900">
          Demo Mode {checked ? "ON" : "OFF"}
        </span>
        <span className="block text-xs text-teal-700">
          Seed a 60-second sales walkthrough
        </span>
      </span>
      <input
        checked={checked}
        className="h-6 w-6 accent-teal-700"
        disabled={loading}
        onChange={(event) => toggle(event.target.checked)}
        type="checkbox"
      />
    </label>
  );
}
