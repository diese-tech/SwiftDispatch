"use client";

import { useState } from "react";
import { MapPin, Phone } from "lucide-react";

/* ── Shared data ─────────────────────────────────────────────────────────── */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
const JOBS_PER_MONTH = [38, 41, 44, 49, 52, 47];
const MAX_JOBS = 60;

const REVENUE_BY_TECH = [
  { name: "Carlos M.", revenue: 8420 },
  { name: "Maria S.", revenue: 7195 },
  { name: "Jason K.", revenue: 6880 },
  { name: "Tom W.", revenue: 5340 },
];
const MAX_REV = 9000;

/* ── Dispatcher view ─────────────────────────────────────────────────────── */

type MockJob = {
  customer: string;
  issue: string;
  address: string;
  tech: string | null;
  initials: string | null;
  age: string;
  ageRed?: boolean;
  emergency?: boolean;
};

const mockColumns: { status: string; label: string; dotCls: string; jobs: MockJob[] }[] = [
  {
    status: "new",
    label: "New",
    dotCls: "bg-zinc-400",
    jobs: [
      { customer: "Sarah Chen", issue: "Furnace not producing heat — house at 58°", address: "412 Briarwood Ct, Austin TX", tech: null, initials: null, age: "8m" },
      { customer: "Tom Okafor", issue: "AC unit tripping breaker repeatedly", address: "88 Ridgeline Dr, Austin TX", tech: null, initials: null, age: "34m", ageRed: true },
    ],
  },
  {
    status: "assigned",
    label: "Assigned",
    dotCls: "bg-blue-500",
    jobs: [
      { customer: "Marcus Rivera", issue: "System not cooling — thermostat reads 79°", address: "903 Elm Creek Blvd, Round Rock TX", tech: "Carlos M.", initials: "CM", age: "21m" },
    ],
  },
  {
    status: "en_route",
    label: "En Route",
    dotCls: "bg-amber-600",
    jobs: [
      { customer: "Lisa Park", issue: "Heat pump making grinding noise on startup", address: "17 Sunridge Way, Cedar Park TX", tech: "Jason K.", initials: "JK", age: "1h 12m", ageRed: true, emergency: true },
    ],
  },
  {
    status: "in_progress",
    label: "In Progress",
    dotCls: "bg-amber-600",
    jobs: [
      { customer: "David Huang", issue: "Annual maintenance — 2-zone Carrier system", address: "221 Oak Hollow, Pflugerville TX", tech: "Maria S.", initials: "MS", age: "2h 5m", ageRed: true },
    ],
  },
];

function MiniCard({ job }: { job: MockJob }) {
  return (
    <div className={["rounded-xl border bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]", job.emergency ? "border-l-[3px] border-l-red-600 border-slate-200" : "border-slate-200"].join(" ")}>
      <div className="p-3">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <span className={`font-mono text-[10px] ${job.ageRed ? "text-red-600" : "text-zinc-400"}`}>{job.age}</span>
          {job.emergency && <span className="rounded border border-red-200 bg-red-50 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.06em] text-red-600">Urgent</span>}
        </div>
        <p className="text-[11px] font-semibold text-zinc-900">{job.customer}</p>
        <p className="mt-0.5 line-clamp-1 text-[10px] leading-4 text-zinc-500">{job.issue}</p>
      </div>
      <div className="flex items-center gap-1.5 border-t border-slate-100 px-3 py-1.5">
        {job.initials ? (
          <>
            <div className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-[#0b2235] font-mono text-[8px] font-bold text-white">{job.initials}</div>
            <span className="text-[10px] text-zinc-500">{job.tech}</span>
          </>
        ) : (
          <span className="text-[10px] italic text-zinc-400">Unassigned</span>
        )}
      </div>
    </div>
  );
}

function DispatcherView() {
  return (
    <div className="space-y-3 rounded-xl bg-[#fafafa] p-4">
      {/* Metrics */}
      <div className="grid grid-cols-4 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200">
        {[["Open jobs","5"],["Unassigned","2"],["En route","1"],["Technicians","4"]].map(([l, v]) => (
          <div key={l} className="bg-white px-3 py-2.5">
            <p className="font-mono text-[9px] uppercase tracking-wide text-zinc-400">{l}</p>
            <p className="mt-0.5 text-lg font-semibold text-zinc-900">{v}</p>
          </div>
        ))}
      </div>
      {/* Action bar */}
      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-green-600" />
          <span className="font-mono text-[10px] text-zinc-400">Live</span>
          {["Active","Completed","Cancelled"].map((f, i) => (
            <span key={f} className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] font-medium ${i === 0 ? "bg-zinc-950 text-white" : "text-zinc-400"}`}>{f}</span>
          ))}
        </div>
        <span className="rounded-full bg-orange-400 px-3 py-1 text-[11px] font-semibold text-zinc-950">+ New Job</span>
      </div>
      {/* Kanban columns */}
      <div className="grid grid-cols-4 gap-2">
        {mockColumns.map((col) => (
          <div key={col.status} className="rounded-xl border border-slate-200 bg-slate-50">
            <div className="flex items-center justify-between border-b border-slate-200 px-2.5 py-2">
              <span className="inline-flex items-center gap-1 text-[10.5px] font-medium text-zinc-600">
                <span className={`h-1.5 w-1.5 rounded-full ${col.dotCls}`} />
                {col.label}
              </span>
              <span className="font-mono text-[9.5px] text-zinc-400">{col.jobs.length}</span>
            </div>
            <div className="space-y-1.5 p-1.5">
              {col.jobs.map((job) => <MiniCard key={job.customer} job={job} />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Tech view (iPhone mockup) ───────────────────────────────────────────── */

function TechView() {
  return (
    <div className="flex justify-center rounded-xl bg-slate-100 py-6">
      {/* Phone frame */}
      <div className="relative w-[220px] rounded-[2.5rem] border-[7px] border-slate-800 bg-slate-800 shadow-[0_32px_64px_rgba(0,0,0,0.4)]">
        {/* Dynamic island */}
        <div className="absolute left-1/2 top-2.5 h-4 w-16 -translate-x-1/2 rounded-full bg-black z-10" />
        {/* Side buttons */}
        <div className="absolute -left-[9px] top-20 h-7 w-[3px] rounded-full bg-slate-600" />
        <div className="absolute -left-[9px] top-32 h-10 w-[3px] rounded-full bg-slate-600" />
        <div className="absolute -left-[9px] top-44 h-10 w-[3px] rounded-full bg-slate-600" />
        <div className="absolute -right-[9px] top-32 h-14 w-[3px] rounded-full bg-slate-600" />
        {/* Screen */}
        <div className="overflow-hidden rounded-[2rem] bg-white">
          {/* Status bar */}
          <div className="flex items-center justify-between px-5 pt-7 pb-1">
            <span className="font-mono text-[9px] font-semibold text-zinc-900">9:41</span>
            <div className="flex items-center gap-1">
              <span className="font-mono text-[9px] text-zinc-600">●●●</span>
            </div>
          </div>
          {/* App content */}
          <div className="px-3 pb-5">
            {/* Top bar */}
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="font-mono text-[8px] uppercase tracking-[0.06em] text-slate-400">Technician</p>
                <p className="text-[11px] font-semibold text-slate-950">Jason K.</p>
              </div>
              <span className="rounded-full border border-slate-200 px-2 py-0.5 text-[9px] text-slate-500">Sign out</span>
            </div>
            {/* Active job card */}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
              <div className="border-b border-slate-100 px-3 py-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-mono text-[8px] uppercase tracking-[0.06em] text-slate-400">Active job</p>
                    <p className="mt-0.5 text-[12px] font-semibold text-slate-950">Lisa Park</p>
                  </div>
                  <span className="rounded border border-red-200 bg-red-50 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.05em] text-red-700">Urgent</span>
                </div>
              </div>
              <div className="divide-y divide-slate-100">
                <div className="flex items-center gap-2 px-3 py-2">
                  <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
                  <div>
                    <p className="font-mono text-[7.5px] uppercase tracking-[0.06em] text-slate-400">Address</p>
                    <p className="text-[10px] font-medium text-slate-950">17 Sunridge Way, Cedar Park</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-2">
                  <Phone className="h-3 w-3 shrink-0 text-slate-400" />
                  <div>
                    <p className="font-mono text-[7.5px] uppercase tracking-[0.06em] text-slate-400">Customer</p>
                    <p className="text-[10px] font-medium text-teal-700">(512) 555-0194</p>
                  </div>
                </div>
                <div className="px-3 py-2">
                  <p className="font-mono text-[7.5px] uppercase tracking-[0.06em] text-slate-400">Issue</p>
                  <p className="mt-0.5 text-[10px] leading-4 text-slate-700">Heat pump making grinding noise on startup</p>
                </div>
              </div>
              <div className="space-y-1.5 border-t border-slate-100 bg-slate-50 px-3 py-2.5">
                <button className="w-full rounded-xl bg-slate-950 py-2 text-[11px] font-semibold text-white">
                  Mark Arrived
                </button>
                <button className="w-full rounded-xl border border-slate-200 bg-white py-2 text-[11px] font-medium text-slate-700">
                  Full job detail
                </button>
              </div>
            </div>
            {/* Recent completions */}
            <p className="mb-1.5 mt-3 font-mono text-[8px] uppercase tracking-[0.06em] text-slate-400">Recent completions</p>
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              {[["David Huang","221 Oak Hollow"],["Marcus Rivera","903 Elm Creek Blvd"]].map(([name, addr], i) => (
                <div key={name} className={`flex items-center justify-between px-3 py-2 ${i > 0 ? "border-t border-slate-100" : ""}`}>
                  <div>
                    <p className="text-[10px] font-medium text-slate-950">{name}</p>
                    <p className="text-[9px] text-slate-400">{addr}</p>
                  </div>
                  <span className="rounded-full bg-green-50 px-1.5 py-0.5 font-mono text-[8px] text-green-700">Done</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Admin / Analytics view ──────────────────────────────────────────────── */

function BarChart({ values, labels, max }: { values: number[]; labels: string[]; max: number }) {
  return (
    <div className="flex h-28 items-end gap-1.5 pt-2">
      {values.map((v, i) => (
        <div key={labels[i]} className="flex flex-1 flex-col items-center gap-1">
          <span className="font-mono text-[9px] text-zinc-400">{v}</span>
          <div
            className="w-full rounded-t-md bg-teal-600/80 transition-all"
            style={{ height: `${Math.round((v / max) * 80)}px` }}
          />
          <span className="font-mono text-[9px] text-zinc-400">{labels[i]}</span>
        </div>
      ))}
    </div>
  );
}

function AdminView() {
  const metricTiles = [
    { label: "Avg response time", value: "18 min", detail: "Job created → tech en route" },
    { label: "Jobs completed", value: "47", detail: "Last 30 days" },
    { label: "Quote acceptance", value: "82%", detail: "Accepted / total sent" },
    { label: "Avg job duration", value: "94 min", detail: "Arrival to completion" },
    { label: "No-access rate", value: "4%", detail: "Below 5% is healthy" },
    { label: "Jobs created", value: "52", detail: "All jobs, last 30 days" },
  ];

  return (
    <div className="space-y-3 rounded-xl bg-[#fafafa] p-4">
      {/* Header */}
      <div>
        <p className="font-mono text-[9px] uppercase tracking-[0.06em] text-zinc-400">Analytics</p>
        <p className="text-base font-semibold text-zinc-950">YTD · Jan – Jun 2026</p>
      </div>
      {/* Metrics grid */}
      <div className="grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200">
        {metricTiles.map(({ label, value, detail }) => (
          <div key={label} className="bg-white px-3 py-2.5">
            <p className="font-mono text-[8.5px] uppercase tracking-[0.05em] text-zinc-400">{label}</p>
            <p className="mt-1 text-lg font-semibold tracking-tight text-zinc-950">{value}</p>
            <p className="mt-0.5 text-[9px] text-zinc-500">{detail}</p>
          </div>
        ))}
      </div>
      {/* Charts row */}
      <div className="grid grid-cols-2 gap-3">
        {/* Bar chart — jobs per month */}
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.06em] text-zinc-400">Jobs / month</p>
          <BarChart values={JOBS_PER_MONTH} labels={MONTHS} max={MAX_JOBS} />
        </div>
        {/* Revenue by tech */}
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.06em] text-zinc-400">Revenue by tech · 30d</p>
          <div className="mt-2 space-y-2">
            {REVENUE_BY_TECH.map(({ name, revenue }) => (
              <div key={name}>
                <div className="mb-0.5 flex items-center justify-between">
                  <span className="text-[9.5px] font-medium text-zinc-700">{name}</span>
                  <span className="font-mono text-[9px] font-semibold text-teal-700">${revenue.toLocaleString()}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-teal-600"
                    style={{ width: `${Math.round((revenue / MAX_REV) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main component ──────────────────────────────────────────────────────── */

type Tab = "dispatcher" | "tech" | "admin";

const TABS: { id: Tab; label: string }[] = [
  { id: "dispatcher", label: "Dispatcher" },
  { id: "tech", label: "Technician" },
  { id: "admin", label: "Admin" },
];

export default function DemoPreview() {
  const [tab, setTab] = useState<Tab>("dispatcher");

  return (
    <div className="rounded-xl bg-[#fafafa] font-sans">
      {/* Tab switcher */}
      <div className="flex items-center gap-1 border-b border-slate-200 bg-white px-4 py-2.5 rounded-t-xl">
        <span className="mr-2 font-mono text-[10px] uppercase tracking-[0.06em] text-zinc-400">View</span>
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-full px-3 py-1 font-mono text-[10.5px] font-medium transition ${tab === id ? "bg-zinc-950 text-white" : "text-zinc-400 hover:text-zinc-700"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* View panels */}
      {tab === "dispatcher" && <DispatcherView />}
      {tab === "tech" && <TechView />}
      {tab === "admin" && <AdminView />}
    </div>
  );
}
