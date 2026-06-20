export default function AnalyticsLoading() {
  return (
    <div className="animate-pulse">
      <div className="mb-6">
        <div className="h-3 w-24 rounded bg-slate-200" />
        <div className="mt-1.5 h-7 w-40 rounded bg-slate-200" />
      </div>

      {/* Metrics grid */}
      <div className="mb-6 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white px-5 py-4">
            <div className="h-2.5 w-28 rounded bg-slate-200" />
            <div className="mt-3 h-7 w-16 rounded bg-slate-200" />
            <div className="mt-2 h-2.5 w-40 rounded bg-slate-100" />
          </div>
        ))}
      </div>

      {/* Revenue by tech card */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-6 py-4">
          <div className="h-3 w-36 rounded bg-slate-200" />
          <div className="mt-1.5 h-5 w-56 rounded bg-slate-200" />
        </div>
        <div className="divide-y divide-slate-100">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between px-6 py-3">
              <div className="h-3 w-28 rounded bg-slate-200" />
              <div className="h-3 w-20 rounded bg-slate-200" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
