"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function ResetDemoButton() {
  const router = useRouter();
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState("");
  const errorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showError(message: string) {
    setError(message);
    if (errorTimer.current) clearTimeout(errorTimer.current);
    errorTimer.current = setTimeout(() => setError(""), 6000);
  }

  async function handleReset() {
    setResetting(true);
    setError("");
    try {
      const res = await fetch("/api/demo/reset", { method: "POST" });
      if (res.ok) {
        router.refresh();
      } else {
        const body = await res.json().catch(() => null);
        showError(body?.error ?? "Reset failed. Try again.");
      }
    } catch {
      showError("Reset failed. Check your connection and try again.");
    } finally {
      setResetting(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={handleReset}
        disabled={resetting}
        data-tutorial="reset-demo"
        className="rounded-full border border-[var(--c-line)] px-3 py-1 font-mono text-[10px] text-[var(--c-text-4)] transition hover:border-[var(--c-line-2)] hover:text-[var(--c-text-3)] disabled:opacity-50"
      >
        {resetting ? "Resetting…" : "Reset data"}
      </button>
      {error && <span className="font-mono text-[10px] text-red-600">{error}</span>}
    </span>
  );
}
