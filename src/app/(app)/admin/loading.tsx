export default function AdminLoading() {
  return (
    <div className="animate-pulse">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-3 w-28 rounded bg-slate-200" />
          <div className="h-7 w-48 rounded bg-slate-200" />
        </div>
        <div className="h-8 w-28 rounded-full bg-slate-200" />
      </div>

      {/* Metrics */}
      <div className="mb-6 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white px-5 py-4">
            <div className="h-2.5 w-20 rounded bg-slate-200" />
            <div className="mt-2 h-7 w-12 rounded bg-slate-200" />
          </div>
        ))}
      </div>

      {/* Nav tiles */}
      <div className="mb-6 grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-11 rounded-xl border border-slate-200 bg-white" />
        ))}
      </div>

      {/* Content cards */}
      <div className="grid gap-5 xl:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="h-5 w-40 rounded bg-slate-200" />
            <div className="mt-2 h-3 w-64 rounded bg-slate-100" />
            <div className="mt-5 space-y-3">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="h-10 rounded-xl bg-slate-100" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
