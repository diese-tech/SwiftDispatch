import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import QuoteBuilder from "@/components/QuoteBuilder";
import SmsFailurePanel from "@/components/SmsFailurePanel";
import TechnicianDropdown from "@/components/TechnicianDropdown";
import { StatusDot } from "@/components/DesignSystem";
import { getCurrentProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { JobWithTechnician, QuoteWithLineItems, Technician } from "@/types/db";

type FailedSms = {
  id: string;
  message_type: string;
  last_error: string | null;
  updated_at: string;
};

type StatusEvent = {
  id: string;
  from_status: string | null;
  to_status: string;
  actor_role: string | null;
  note: string | null;
  created_at: string;
};

const STATUS_LABEL: Record<string, string> = {
  new: "New",
  assigned: "Assigned",
  en_route: "En Route",
  in_progress: "In Progress",
  quote_pending: "Quote Pending",
  completed: "Completed",
  cancelled: "Cancelled",
  no_access: "No Access",
};

function getStatusTone(status: string): "neutral" | "blue" | "amber" | "red" | "green" | "violet" {
  if (status === "assigned") return "blue";
  if (status === "en_route" || status === "in_progress") return "amber";
  if (status === "quote_pending") return "violet";
  if (status === "completed") return "green";
  if (status === "no_access" || status === "cancelled") return "red";
  return "neutral";
}

function fmtTs(ts: string) {
  return new Date(ts).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  const supabase = await createSupabaseServerClient();

  const [jobResult, techsResult, quoteResult, eventsResult, smsFailResult] = await Promise.all([
    supabase
      .from("jobs")
      .select("*, technicians!jobs_technician_id_fkey(id,name,phone)")
      .eq("id", id)
      .eq("company_id", profile.company_id)
      .eq("is_demo", false)
      .single(),
    supabase.from("technicians").select("*").eq("company_id", profile.company_id).order("name"),
    supabase
      .from("quotes")
      .select("id,job_id,total,status,created_at,quote_sent_at,accepted_at,rejected_at,quote_line_items(id,quote_id,name,price,quantity),jobs!inner(company_id)")
      .eq("job_id", id)
      .eq("jobs.company_id", profile.company_id)
      .eq("is_demo", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("status_events")
      .select("id, from_status, to_status, actor_role, note, created_at")
      .eq("job_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("sms_outbox")
      .select("id, message_type, last_error, updated_at")
      .eq("job_id", id)
      .eq("company_id", profile.company_id)
      .eq("status", "failed")
      .order("updated_at", { ascending: false }),
  ]);

  if (jobResult.error || !jobResult.data) notFound();
  if (techsResult.error) throw new Error(techsResult.error.message);
  if (quoteResult.error) throw new Error(quoteResult.error.message);

  const job = jobResult.data as JobWithTechnician;
  const quote = quoteResult.data as QuoteWithLineItems | null;
  const statusEvents = (eventsResult.data ?? []) as StatusEvent[];
  const failedSms = (smsFailResult.data ?? []) as FailedSms[];
  const isEmergency = /emergency|urgent/i.test(job.issue);

  return (
    <main className="px-4 py-6 sm:px-6">
      {/* Page header */}
      <div className="mx-auto mb-6 max-w-7xl">
        <Link
          className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.06em] text-slate-400 transition hover:text-slate-700"
          href="/dispatch"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Dispatch board
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950">{job.customer_name}</h1>
            <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.06em] text-slate-400">
              Job #{job.id.slice(0, 8).toUpperCase()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isEmergency && (
              <span className="rounded border border-red-200 bg-red-50 px-2 py-0.5 font-mono text-[10.5px] uppercase tracking-[0.06em] text-red-700">
                Emergency
              </span>
            )}
            <StatusDot tone={getStatusTone(job.status)}>
              {STATUS_LABEL[job.status] ?? job.status}
            </StatusDot>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl grid gap-5 lg:grid-cols-[1fr_420px]">
        {/* Left column */}
        <div className="space-y-5">
          {/* Job info card */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
            <div className="border-b border-slate-100 px-6 py-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-slate-400">Customer</p>
            </div>
            <div className="px-6 py-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xl font-semibold tracking-tight text-slate-950">{job.customer_name}</p>
                  <a
                    className="mt-1 inline-block text-sm font-medium text-teal-700 transition hover:underline"
                    href={`tel:${job.phone}`}
                  >
                    {job.phone}
                  </a>
                </div>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.06em] text-slate-400">Address</p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">{job.address}</p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.06em] text-slate-400">Issue</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{job.issue}</p>
                </div>
              </div>
              <div className="mt-4">
                <TechnicianDropdown
                  jobId={job.id}
                  selectedId={job.technician_id}
                  technicians={(techsResult.data ?? []) as Technician[]}
                />
              </div>
            </div>
          </div>

          {/* Status timeline */}
          {statusEvents.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
              <div className="border-b border-slate-100 px-6 py-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-slate-400">Timeline</p>
              </div>
              <ol className="divide-y divide-slate-100">
                {statusEvents.map((event, idx) => (
                  <li key={event.id} className="flex items-start gap-4 px-6 py-4">
                    <div className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${idx === statusEvents.length - 1 ? "bg-teal-600" : "bg-slate-300"}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusDot tone={getStatusTone(event.to_status)}>
                          {STATUS_LABEL[event.to_status] ?? event.to_status}
                        </StatusDot>
                        {event.actor_role && (
                          <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-slate-400">
                            via {event.actor_role}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-slate-500">{fmtTs(event.created_at)}</p>
                      {event.note && (
                        <p className="mt-1 text-sm leading-6 text-slate-600">{event.note}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>

        {/* Right column — SMS failures + quote builder */}
        <div className="space-y-5">
          <SmsFailurePanel jobId={job.id} initialFailures={failedSms} />
          <QuoteBuilder initialQuote={quote} jobId={job.id} />
        </div>
      </div>
    </main>
  );
}
