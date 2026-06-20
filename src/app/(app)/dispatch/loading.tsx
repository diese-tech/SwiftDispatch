export default function DispatchLoading() {
  return (
    <div className="animate-pulse space-y-4 pb-4">
      {/* Page header skeleton */}
      <div className="mb-6 flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-3 w-32 rounded bg-slate-200" />
          <div className="h-7 w-44 rounded bg-slate-200" />
        </div>
        <div className="flex gap-2">
          <div className="h-7 w-20 rounded-full bg-slate-200" />
          <div className="h-7 w-20 rounded-full bg-slate-200" />
          <div className="h-8 w-24 rounded-full bg-slate-200" />
        </div>
      </div>

      {/* Metrics strip */}
      <div className="grid grid-cols-4 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white px-4 py-3">
            <div className="h-2.5 w-20 rounded bg-slate-200" />
            <div className="mt-2 h-6 w-10 rounded bg-slate-200" />
          </div>
        ))}
      </div>

      {/* Action bar */}
      <div className="h-12 rounded-xl border border-slate-200 bg-white" />

      {/* Kanban columns */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, col) => (
          <div key={col} className="rounded-xl border border-slate-200 bg-slate-50">
            <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2.5">
              <div className="h-3 w-20 rounded bg-slate-200" />
              <div className="h-3 w-4 rounded bg-slate-200" />
            </div>
            <div className="space-y-2 p-2">
              {Array.from({ length: col === 0 ? 2 : 1 }).map((_, card) => (
                <div key={card} className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="mb-2 h-3 w-16 rounded bg-slate-200" />
                  <div className="h-4 w-28 rounded bg-slate-200" />
                  <div className="mt-1.5 h-3 w-full rounded bg-slate-100" />
                  <div className="mt-1 h-3 w-3/4 rounded bg-slate-100" />
                  <div className="mt-2 h-3 w-20 rounded bg-slate-100" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
