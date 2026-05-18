import { getCurrentProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AnalyticsPage() {
  const profile = await getCurrentProfile();
  const supabase = await createSupabaseServerClient();
  const companyId = profile.company_id;
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data: responseTimes } = await supabase.from("jobs").select("created_at, en_route_at").eq("company_id", companyId).not("en_route_at", "is", null).gte("created_at", thirtyDaysAgo);
  const avgResponseMinutes = (() => {
    const valid = (responseTimes ?? []).filter((j) => j.en_route_at);
    if (!valid.length) return null;
    const sum = valid.reduce((s, j) => s + (new Date(j.en_route_at!).getTime() - new Date(j.created_at).getTime()) / 60000, 0);
    return Math.round(sum / valid.length);
  })();

  const { count: completedCount } = await supabase.from("jobs").select("*", { count: "exact", head: true }).eq("company_id", companyId).eq("status", "completed").gte("completed_at", thirtyDaysAgo);
  const { data: quotesForRate } = await supabase.from("quotes").select("status, jobs!inner(company_id)").eq("jobs.company_id", companyId).gte("created_at", thirtyDaysAgo);
  const acceptanceRate = (() => {
    const all = (quotesForRate ?? []).filter((q) => q.status !== "draft");
    if (!all.length) return null;
    return Math.round((all.filter((q) => q.status === "accepted").length / all.length) * 100);
  })();

  const { data: durations } = await supabase.from("jobs").select("arrived_at, completed_at").eq("company_id", companyId).not("arrived_at", "is", null).not("completed_at", "is", null).gte("completed_at", thirtyDaysAgo);
  const avgDurationMinutes = (() => {
    const valid = (durations ?? []).filter((j) => j.arrived_at && j.completed_at);
    if (!valid.length) return null;
    const sum = valid.reduce((s, j) => s + (new Date(j.completed_at!).getTime() - new Date(j.arrived_at!).getTime()) / 60000, 0);
    return Math.round(sum / valid.length);
  })();

  const { data: revenueData } = await supabase.from("jobs").select("technician_id, quotes!inner(total_amount, total, status), technicians(name)").eq("company_id", companyId).gte("completed_at", thirtyDaysAgo);
  const revenueByTech: Record<string, { name: string; revenue: number }> = {};
  (revenueData ?? []).forEach((job) => {
    if (!job.technician_id) return;
    const techData = Array.isArray(job.technicians) ? job.technicians[0] : job.technicians;
    const techName = (techData as { name?: string } | null)?.name ?? "Unknown";
    const quotes = Array.isArray(job.quotes) ? job.quotes : [job.quotes];
    const revenue = quotes.filter((q: { status: string }) => q?.status === "accepted").reduce((s: number, q: { total_amount?: number; total?: number }) => s + (q?.total_amount ?? q?.total ?? 0), 0);
    if (!revenueByTech[job.technician_id]) revenueByTech[job.technician_id] = { name: techName, revenue: 0 };
    revenueByTech[job.technician_id].revenue += revenue;
  });

  const topTechs = Object.values(revenueByTech).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  const { count: totalJobs } = await supabase.from("jobs").select("*", { count: "exact", head: true }).eq("company_id", companyId).gte("created_at", thirtyDaysAgo);
  const { count: noAccessCount } = await supabase.from("jobs").select("*", { count: "exact", head: true }).eq("company_id", companyId).eq("status", "no_access").gte("created_at", thirtyDaysAgo);
  const noAccessRate = totalJobs ? Math.round(((noAccessCount ?? 0) / totalJobs) * 100) : null;
  const fmt = (v: number | null | undefined, suffix = "") => (v != null ? `${v}${suffix}` : "—");

  const metrics = [
    { label: "Avg response time", value: fmt(avgResponseMinutes, " min"), detail: "From job created to technician en route" },
    { label: "Jobs completed", value: fmt(completedCount), detail: "Completed in the last 30 days" },
    { label: "Quote acceptance", value: fmt(acceptanceRate, "%"), detail: "Healthy teams usually stay above 75%" },
    { label: "Avg job duration", value: fmt(avgDurationMinutes, " min"), detail: "From arrival to completion" },
    { label: "No-access rate", value: fmt(noAccessRate, "%"), detail: "A high rate can signal schedule or address issues" },
    { label: "Jobs created", value: fmt(totalJobs), detail: "All jobs opened in the last 30 days" },
  ];

  return (
    <main>
      <div className="mb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-slate-400">Analytics</p>
        <h1 className="mt-0.5 text-2xl font-semibold tracking-tight text-slate-950">Last 30 days</h1>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 xl:grid-cols-3">
        {metrics.map(({ label, value, detail }) => (
          <div key={label} className="bg-white px-5 py-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-slate-400">{label}</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{value}</p>
            <p className="mt-1 text-xs text-slate-500">{detail}</p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <div className="border-b border-slate-100 px-6 py-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-slate-400">Revenue by technician</p>
          <h2 className="mt-0.5 text-lg font-semibold tracking-tight text-slate-950">Last 30 days · accepted quotes</h2>
        </div>
        {topTechs.length === 0 ? (
          <div className="px-6 py-8 text-sm text-slate-400">No revenue data yet.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {topTechs.map(({ name, revenue }) => (
              <div className="flex items-center justify-between px-6 py-3" key={name}>
                <span className="text-sm font-medium text-slate-700">{name}</span>
                <span className="font-mono text-sm font-semibold text-teal-700">${revenue.toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
