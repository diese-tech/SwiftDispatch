"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to error monitoring when integrated
    console.error("[AppError]", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-16 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-red-200 bg-red-50 text-2xl text-red-600">
        !
      </div>
      <h1 className="mt-5 text-2xl font-semibold tracking-tight text-slate-950">
        Something went wrong
      </h1>
      <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-slate-500">
        An unexpected error occurred. Your data is safe — try refreshing, or go back to the dispatch board.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          className="inline-flex items-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          onClick={reset}
          type="button"
        >
          Try again
        </button>
        <Link
          className="inline-flex items-center rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          href="/dispatch"
        >
          Back to board
        </Link>
      </div>
    </div>
  );
}
