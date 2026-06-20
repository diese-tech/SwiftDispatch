"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ResetDemoButton() {
  const router = useRouter();
  const [resetting, setResetting] = useState(false);

  async function handleReset() {
    setResetting(true);
    try {
      const res = await fetch("/api/demo/reset", { method: "POST" });
      if (res.ok) router.refresh();
    } finally {
      setResetting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleReset}
      disabled={resetting}
      className="rounded-full border border-[var(--c-line)] px-3 py-1 font-mono text-[10px] text-[var(--c-text-4)] transition hover:border-[var(--c-line-2)] hover:text-[var(--c-text-3)] disabled:opacity-50"
    >
      {resetting ? "Resetting…" : "Reset data"}
    </button>
  );
}
