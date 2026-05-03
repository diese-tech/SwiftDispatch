"use client";

import { useState } from "react";
import { ArrowRightLeft } from "lucide-react";
import { SurfaceCard, StatusPill } from "@/components/DesignSystem";
import { money } from "@/lib/format";

export default function WorkflowComparison({ averageJobValue = 650 }: { averageJobValue?: number }) {
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
    <div className="mt-6">
      <button className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-5 py-3 text-sm font-semibold text-teal-800 transition hover:bg-teal-100" onClick={() => setOpen((current) => !current)} type="button">
        <ArrowRightLeft className="h-4 w-4" /> {open ? "Hide comparison" : "Compare workflows"}
      </button>
      {open ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr]">
          <SurfaceCard accent>
            <StatusPill tone="warm">Manual workflow</StatusPill>
            <p className="mt-4 text-sm leading-7 text-slate-600">Dispatch delay: {manualDispatch}m</p>
            <p className="text-sm leading-7 text-slate-600">Quote delay: {manualQuote}m</p>
            <p className="mt-3 text-lg font-semibold text-slate-950">Total time to cash: {manualTotal}m</p>
          </SurfaceCard>
          <SurfaceCard accent>
            <StatusPill tone="teal">SwiftDispatch workflow</StatusPill>
            <p className="mt-4 text-sm leading-7 text-slate-600">Dispatch coordination: {swiftDispatch}m</p>
            <p className="text-sm leading-7 text-slate-600">Quote generation: {swiftQuote}m</p>
            <p className="mt-3 text-lg font-semibold text-slate-950">Total time to cash: {swiftTotal}m</p>
          </SurfaceCard>
          <SurfaceCard accent className="lg:col-span-2 bg-[linear-gradient(135deg,#0b2235_0%,#102f47_100%)] text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-300">Impact</p>
            <p className="mt-3 text-2xl font-semibold tracking-tight">{saved} minutes saved per job</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <p className="text-sm text-slate-300">{money(revenueImpact)} revenue capacity impact per job</p>
              <p className="text-sm text-slate-300">{efficiencyGain}% efficiency gain in the dispatch-to-quote cycle</p>
            </div>
          </SurfaceCard>
        </div>
      ) : null}
    </div>
  );
}