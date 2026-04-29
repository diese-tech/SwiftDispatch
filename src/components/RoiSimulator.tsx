"use client";

import { useMemo, useState } from "react";
import { money } from "@/lib/format";

function NumberInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-slate-700">
        {label}
      </span>
      <input
        className="w-full rounded-md border border-slate-300 px-3 py-3 text-base"
        min="0"
        step="0.1"
        type="number"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

export default function RoiSimulator() {
  const [jobsPerDay, setJobsPerDay] = useState(4);
  const [averageJobValue, setAverageJobValue] = useState(650);
  const [dispatchMinutes, setDispatchMinutes] = useState(45);
  const [quoteMinutes, setQuoteMinutes] = useState(30);

  const result = useMemo(() => {
    const timeLostBefore = dispatchMinutes + quoteMinutes;
    const afterDispatch = dispatchMinutes * 0.35;
    const afterQuote = quoteMinutes * 0.45;
    const timeLostAfter = afterDispatch + afterQuote;
    const minutesSaved = Math.max(timeLostBefore - timeLostAfter, 0);
    const extraJobCapacity = minutesSaved / 480;
    const afterJobsPerDay = jobsPerDay * (1 + extraJobCapacity);
    const beforeRevenuePerDay = jobsPerDay * averageJobValue;
    const afterRevenuePerDay = afterJobsPerDay * averageJobValue;
    const additionalDailyRevenue = afterRevenuePerDay - beforeRevenuePerDay;

    return {
      timeLostBefore,
      timeLostAfter,
      minutesSaved,
      afterJobsPerDay,
      beforeRevenuePerDay,
      afterRevenuePerDay,
      additionalWeeklyRevenue: additionalDailyRevenue * 5,
      additionalMonthlyRevenue: additionalDailyRevenue * 22,
    };
  }, [averageJobValue, dispatchMinutes, jobsPerDay, quoteMinutes]);

  return (
    <div className="grid gap-5 lg:grid-cols-[420px_1fr]">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4">
          <NumberInput
            label="Average jobs per day per tech"
            value={jobsPerDay}
            onChange={setJobsPerDay}
          />
          <NumberInput
            label="Average job value"
            value={averageJobValue}
            onChange={setAverageJobValue}
          />
          <NumberInput
            label="Current dispatch time, minutes"
            value={dispatchMinutes}
            onChange={setDispatchMinutes}
          />
          <NumberInput
            label="Current quote time, minutes"
            value={quoteMinutes}
            onChange={setQuoteMinutes}
          />
        </div>
      </section>

      <section className="space-y-4">
        <div className="rounded-lg border border-teal-200 bg-teal-50 p-5">
          <p className="text-sm font-semibold uppercase text-teal-700">
            Estimated additional monthly revenue per technician
          </p>
          <p className="mt-2 text-4xl font-semibold text-teal-950">
            {money(result.additionalMonthlyRevenue)}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Before SwiftDispatch</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Jobs per day</dt>
                <dd className="font-semibold">{jobsPerDay.toFixed(1)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Revenue per day</dt>
                <dd className="font-semibold">
                  {money(result.beforeRevenuePerDay)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Time lost per job</dt>
                <dd className="font-semibold">
                  {Math.round(result.timeLostBefore)}m
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">After SwiftDispatch</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Jobs per day</dt>
                <dd className="font-semibold">
                  {result.afterJobsPerDay.toFixed(1)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Revenue per day</dt>
                <dd className="font-semibold">
                  {money(result.afterRevenuePerDay)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Time lost per job</dt>
                <dd className="font-semibold">
                  {Math.round(result.timeLostAfter)}m
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Weekly upside</dt>
                <dd className="font-semibold">
                  {money(result.additionalWeeklyRevenue)}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>
    </div>
  );
}
