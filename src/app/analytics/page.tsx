import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth";
import { money } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type QuoteMetricRow = {
  id: string;
  total: number;
  status: string;
  created_at: string;
  quote_sent_at: string | null;
  accepted_at: string | null;
  jobs: {
    created_at: string;
    technician_assigned_at: string | null;
  } | null;
};

type QuoteMetricResult = Omit<QuoteMetricRow, "jobs"> & {
  jobs:
    | {
        created_at: string;
        technician_assigned_at: string | null;
      }
    | {
        created_at: string;
        technician_assigned_at: string | null;
      }[]
    | null;
};

function avgMinutes(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function minutesBetween(start?: string | null, end?: string | null) {
  if (!start || !end) return null;
  const diff = new Date(end).getTime() - new Date(start).getTime();
  return diff > 0 ? diff / 60000 : null;
}

function formatDuration(minutes: number) {
  if (!minutes) return "0m";
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hours = minutes / 60;
  return `${hours.toFixed(1)}h`;
}

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

export default async function AnalyticsPage() {
  const profile = await getCurrentProfile();
  const supabase = await createSupabaseServerClient();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [jobsResult, quotesResult] = await Promise.all([
    supabase
      .from("jobs")
      .select("id,created_at,technician_assigned_at")
      .eq("company_id", profile.company_id)
      .gte("created_at", sevenDaysAgo.toISOString()),
    supabase
      .from("quotes")
      .select(
        "id,total,status,created_at,quote_sent_at,accepted_at,jobs!inner(created_at,technician_assigned_at,company_id)",
      )
      .eq("jobs.company_id", profile.company_id)
      .gte("created_at", sevenDaysAgo.toISOString()),
  ]);

  if (jobsResult.error) throw new Error(jobsResult.error.message);
  if (quotesResult.error) throw new Error(quotesResult.error.message);

  const jobs = jobsResult.data ?? [];
  const quotes = ((quotesResult.data ?? []) as unknown as QuoteMetricResult[]).map(
    (quote) => ({
      ...quote,
      jobs: Array.isArray(quote.jobs) ? quote.jobs[0] : quote.jobs,
    }),
  );
  const sentQuotes = quotes.filter(
    (quote) => quote.status !== "draft" || quote.quote_sent_at,
  );
  const acceptedQuotes = quotes.filter((quote) => quote.status === "accepted");

  const dispatchTimes = jobs
    .map((job) => minutesBetween(job.created_at, job.technician_assigned_at))
    .filter((value): value is number => value !== null);
  const quoteTimes = quotes
    .map((quote) => minutesBetween(quote.jobs?.created_at, quote.created_at))
    .filter((value): value is number => value !== null);
  const acceptanceRate = sentQuotes.length
    ? Math.round((acceptedQuotes.length / sentQuotes.length) * 100)
    : 0;
  const estimatedRevenue = acceptedQuotes.reduce(
    (sum, quote) => sum + Number(quote.total || 0),
    0,
  );

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
            SwiftDispatch
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Analytics</h1>
        </div>
        <Link
          className="rounded-md border border-slate-300 bg-white px-4 py-3 text-center text-base font-semibold"
          href="/dashboard"
        >
          Dispatch Board
        </Link>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Jobs created, 7 days" value={jobs.length} />
        <MetricCard label="Quotes sent" value={sentQuotes.length} />
        <MetricCard label="Quotes accepted" value={acceptedQuotes.length} />
        <MetricCard label="Acceptance rate" value={`${acceptanceRate}%`} />
        <MetricCard label="Estimated revenue" value={money(estimatedRevenue)} />
        <MetricCard
          label="Avg. time to dispatch"
          value={formatDuration(avgMinutes(dispatchTimes))}
        />
        <MetricCard
          label="Avg. time to quote"
          value={formatDuration(avgMinutes(quoteTimes))}
        />
      </section>
    </main>
  );
}
