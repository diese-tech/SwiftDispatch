export default function JobLoading() {
  return (
    <main className="animate-pulse px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="mx-auto mb-6 max-w-7xl">
        <div className="h-3 w-24 rounded bg-slate-200" />
        <div className="mt-3 flex items-start justify-between">
          <div className="space-y-2">
            <div className="h-7 w-48 rounded bg-slate-200" />
            <div className="h-3 w-24 rounded bg-slate-100" />
          </div>
          <div className="h-6 w-24 rounded-full bg-slate-200" />
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[1fr_420px]">
        {/* Left column */}
        <div className="space-y-5">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-6 py-4">
              <div className="h-3 w-20 rounded bg-slate-200" />
            </div>
            <div className="px-6 py-5">
              <div className="h-6 w-44 rounded bg-slate-200" />
              <div className="mt-2 h-4 w-28 rounded bg-slate-100" />
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="h-28 rounded-xl bg-slate-100" />
                <div className="h-28 rounded-xl bg-slate-100" />
              </div>
              <div className="mt-4 h-9 w-48 rounded-xl bg-slate-100" />
            </div>
          </div>

          {/* Timeline skeleton */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-6 py-4">
              <div className="h-3 w-16 rounded bg-slate-200" />
            </div>
            <div className="divide-y divide-slate-100">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-start gap-4 px-6 py-4">
                  <div className="mt-1 h-2 w-2 rounded-full bg-slate-300" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-28 rounded bg-slate-200" />
                    <div className="h-3 w-20 rounded bg-slate-100" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          <div className="h-32 rounded-xl border border-slate-200 bg-white" />
          <div className="h-64 rounded-xl border border-slate-200 bg-white" />
        </div>
      </div>
    </main>
  );
}
