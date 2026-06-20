/**
 * Static pixel-faithful mockup of the real dispatch board.
 * Used in marketing pages as a live-coded hero preview instead of a screenshot.
 */

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

type MockColumn = {
  status: string;
  label: string;
  dot: string;
  jobs: MockJob[];
};

const columns: MockColumn[] = [
  {
    status: "new",
    label: "New",
    dot: "bg-zinc-400",
    jobs: [
      {
        customer: "Sarah Chen",
        issue: "Furnace not producing heat — house at 58°",
        address: "412 Briarwood Ct, Austin TX",
        tech: null,
        initials: null,
        age: "8m",
      },
      {
        customer: "Tom Okafor",
        issue: "AC unit tripping breaker repeatedly",
        address: "88 Ridgeline Dr, Austin TX",
        tech: null,
        initials: null,
        age: "34m",
        ageRed: true,
      },
    ],
  },
  {
    status: "assigned",
    label: "Assigned",
    dot: "bg-blue-500",
    jobs: [
      {
        customer: "Marcus Rivera",
        issue: "System not cooling — thermostat reads 79° with AC running",
        address: "903 Elm Creek Blvd, Round Rock TX",
        tech: "Carlos M.",
        initials: "CM",
        age: "21m",
      },
    ],
  },
  {
    status: "en_route",
    label: "En Route",
    dot: "bg-amber-600",
    jobs: [
      {
        customer: "Lisa Park",
        issue: "Heat pump making grinding noise on startup",
        address: "17 Sunridge Way, Cedar Park TX",
        tech: "Jason K.",
        initials: "JK",
        age: "1h 12m",
        ageRed: true,
        emergency: true,
      },
    ],
  },
  {
    status: "in_progress",
    label: "In Progress",
    dot: "bg-amber-600",
    jobs: [
      {
        customer: "David Huang",
        issue: "Annual maintenance — 2-zone Carrier system",
        address: "221 Oak Hollow, Pflugerville TX",
        tech: "Maria S.",
        initials: "MS",
        age: "2h 5m",
        ageRed: true,
      },
    ],
  },
];

function JobCardMock({ job }: { job: MockJob }) {
  return (
    <div
      className={[
        "rounded-xl border bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)] select-none",
        job.emergency
          ? "border-l-[3px] border-l-red-600 border-slate-200"
          : "border-slate-200",
      ].join(" ")}
    >
      <div className="p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          {/* status dot row — omitted in card, shown in column header */}
          <span
            className={`font-mono text-[10px] ${job.ageRed ? "text-red-600" : "text-zinc-400"}`}
          >
            {job.age}
          </span>
          {job.emergency && (
            <span className="rounded border border-red-200 bg-red-50 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.06em] text-red-600">
              Urgent
            </span>
          )}
        </div>
        <p className="text-sm font-semibold text-zinc-900">{job.customer}</p>
        <p className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-500">{job.issue}</p>
        <p className="mt-1.5 text-[11px] text-zinc-400">{job.address}</p>
      </div>
      <div className="flex items-center gap-2 border-t border-slate-100 px-3 py-2">
        {job.initials ? (
          <>
            <div className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#0b2235] font-mono text-[9px] font-bold text-white">
              {job.initials}
            </div>
            <span className="text-[11px] text-zinc-500">{job.tech}</span>
          </>
        ) : (
          <span className="text-[11px] italic text-zinc-400">Unassigned</span>
        )}
      </div>
    </div>
  );
}

function ColumnMock({ col }: { col: MockColumn }) {
  const dotColors: Record<string, string> = {
    new: "bg-zinc-400",
    assigned: "bg-blue-500",
    en_route: "bg-amber-600",
    in_progress: "bg-amber-600",
    quote_pending: "bg-violet-600",
    completed: "bg-green-600",
    no_access: "bg-red-600",
  };

  return (
    <div className="min-w-[180px] flex-1 rounded-xl border border-slate-200 bg-slate-50">
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2.5">
        <span className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-zinc-600">
          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotColors[col.status] ?? "bg-zinc-400"}`} />
          {col.label}
        </span>
        <span className="font-mono text-[10.5px] text-zinc-400">{col.jobs.length}</span>
      </div>
      <div className="space-y-2 p-2">
        {col.jobs.map((job) => (
          <JobCardMock key={job.customer} job={job} />
        ))}
      </div>
    </div>
  );
}

export default function DispatchPreview() {
  return (
    <div className="space-y-3 rounded-xl bg-[#fafafa] p-4 font-sans text-zinc-900">
      {/* Metrics strip */}
      <div className="grid grid-cols-4 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200">
        {[
          { label: "Open jobs", value: 5 },
          { label: "Unassigned", value: 2 },
          { label: "En route", value: 1 },
          { label: "Technicians", value: 4 },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white px-4 py-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.06em] text-zinc-400">{label}</p>
            <p className="mt-1 text-xl font-semibold text-zinc-900">{value}</p>
          </div>
        ))}
      </div>

      {/* Action bar */}
      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-2.5">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-green-600" />
            <span className="font-mono text-[10.5px] text-zinc-400">Live</span>
          </div>
          <div className="flex gap-1">
            {["Active", "Completed", "Cancelled"].map((f, i) => (
              <span
                key={f}
                className={`rounded-full px-3 py-1 font-mono text-[10.5px] font-medium ${
                  i === 0 ? "bg-zinc-950 text-white" : "text-zinc-400"
                }`}
              >
                {f}
              </span>
            ))}
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-400 px-4 py-1.5 text-sm font-semibold text-zinc-950">
          + New Job
        </span>
      </div>

      {/* Kanban columns */}
      <div className="flex gap-3 overflow-hidden">
        {columns.map((col) => (
          <ColumnMock key={col.status} col={col} />
        ))}
      </div>
    </div>
  );
}
