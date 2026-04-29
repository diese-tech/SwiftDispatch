"use client";

import { useState } from "react";
import { money } from "@/lib/format";

export default function WorkflowComparison({
  averageJobValue = 650,
}: {
  averageJobValue?: number;
}) {
  const [open, setOpen] = useState(false);
  const manualDispatch = 45;
  const manualQuote = 30;
  const swiftDispatch = 8;
  const swiftQuote = 10;
  const manualTotal = manualDispatch + manualQuote;
  const swiftTotal = swiftDispatch + swiftQuote;
  const saved = manualTotal - swiftTotal;
  const revenueImpact = averageJobValue * (saved / 480);
  const efficiencyGain = Math.round((saved / manualTotal) * 100);

  return (
    <div className="mt-5">
      <button
        className="w-full rounded-md border border-teal-300 bg-teal-50 px-4 py-3 text-base font-semibold text-teal-900"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        Compare Workflows
      </button>
      {open ? (
        <section className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-md bg-white p-4">
              <h3 className="font-semibold">Manual workflow</h3>
              <p className="mt-2 text-sm text-slate-600">
                Dispatch delay: {manualDispatch}m
              </p>
              <p className="text-sm text-slate-600">
                Quote delay: {manualQuote}m
              </p>
              <p className="mt-2 font-semibold">
                Total time to cash: {manualTotal}m
              </p>
            </div>
            <div className="rounded-md bg-white p-4">
              <h3 className="font-semibold">SwiftDispatch workflow</h3>
              <p className="mt-2 text-sm text-slate-600">
                Instant dispatch: {swiftDispatch}m
              </p>
              <p className="text-sm text-slate-600">
                Instant quote generation: {swiftQuote}m
              </p>
              <p className="mt-2 font-semibold">
                Total time to cash: {swiftTotal}m
              </p>
            </div>
          </div>
          <div className="mt-3 rounded-md bg-teal-700 p-4 text-white">
            <p className="font-semibold">{saved} minutes saved per job</p>
            <p className="text-sm">
              {money(revenueImpact)} revenue capacity impact per job
            </p>
            <p className="text-sm">{efficiencyGain}% efficiency gain</p>
          </div>
        </section>
      ) : null}
    </div>
  );
}
