"use client";

import { useEffect, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Technician } from "@/types/db";

type FeedEvent = {
  id: string;
  job_id: string;
  to_status: string;
  customer_name: string;
  created_at: string;
};

type Props = {
  companyId: string;
  initialTechnicians: Technician[];
};

const STATUS_LABELS: Record<string, string> = {
  new: "New",
  assigned: "Assigned",
  en_route: "En route",
  in_progress: "On site",
  quote_pending: "Quote sent",
  completed: "Done",
  cancelled: "Cancelled",
  no_access: "No access",
};

function availTone(status: string): "green" | "amber" | "neutral" {
  if (status === "available") return "green";
  if (status === "on_job") return "amber";
  return "neutral";
}

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  return `${h}h ${mins % 60}m`;
}

export default function TechRail({ companyId, initialTechnicians }: Props) {
  const [techs, setTechs] = useState<Technician[]>(initialTechnicians);
  const [feed, setFeed] = useState<FeedEvent[]>([]);
  const feedRef = useRef<FeedEvent[]>([]);

  // Fetch initial status events feed
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase
      .from("status_events")
      .select("id, job_id, to_status, created_at, jobs!inner(customer_name, company_id)")
      .eq("jobs.company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (!data) return;
        const events: FeedEvent[] = data.map((e: Record<string, unknown>) => {
          const job = (Array.isArray(e.jobs) ? e.jobs[0] : e.jobs) as { customer_name: string } | null;
          return {
            id: e.id as string,
            job_id: e.job_id as string,
            to_status: e.to_status as string,
            customer_name: job?.customer_name ?? "Unknown",
            created_at: e.created_at as string,
          };
        });
        feedRef.current = events;
        setFeed(events);
      });
  }, [companyId]);

  // Realtime subscriptions
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    const techChannel = supabase
      .channel(`techs:company:${companyId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "technicians", filter: `company_id=eq.${companyId}` },
        (payload) => {
          const updated = payload.new as Technician;
          setTechs((current) =>
            current.map((t) => (t.id === updated.id ? { ...t, ...updated } : t))
          );
        }
      )
      .subscribe();

    // For status_events, no company_id filter available — fetch full job to confirm company
    const feedChannel = supabase
      .channel(`feed:company:${companyId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "status_events" },
        async (payload) => {
          const raw = payload.new as { id: string; job_id: string; to_status: string; created_at: string };
          const { data: job } = await supabase
            .from("jobs")
            .select("customer_name, company_id")
            .eq("id", raw.job_id)
            .single();
          if (!job || job.company_id !== companyId) return;
          const event: FeedEvent = {
            id: raw.id,
            job_id: raw.job_id,
            to_status: raw.to_status,
            customer_name: job.customer_name,
            created_at: raw.created_at,
          };
          feedRef.current = [event, ...feedRef.current].slice(0, 20);
          setFeed([...feedRef.current]);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(techChannel);
      void supabase.removeChannel(feedChannel);
    };
  }, [companyId]);

  return (
    <aside className="flex flex-col gap-4">
      {/* Tech state */}
      <div className="overflow-hidden rounded-xl border border-[var(--c-line)] bg-[var(--c-paper)]">
        <div className="border-b border-[var(--c-line)] px-4 py-3">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.06em] text-[var(--c-text-4)]">
            Technicians · {techs.length}
          </p>
        </div>
        <div className="divide-y divide-[var(--c-line)]">
          {techs.map((tech) => (
            <div className="flex items-center gap-3 px-4 py-2.5" key={tech.id}>
              <span className={`h-2 w-2 shrink-0 rounded-full ${availTone(tech.availability_status) === "green" ? "bg-[var(--c-green)]" : availTone(tech.availability_status) === "amber" ? "bg-[var(--c-amber)]" : "bg-[var(--c-text-4)]"}`} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[var(--c-text)]">{tech.name}</p>
                <p className="font-mono text-[10px] text-[var(--c-text-4)]">
                  {tech.availability_status === "available"
                    ? "Available"
                    : tech.availability_status === "on_job"
                    ? "On job"
                    : "Offline"}
                </p>
              </div>
            </div>
          ))}
          {techs.length === 0 && (
            <p className="px-4 py-3 font-mono text-[10.5px] text-[var(--c-text-4)]">No technicians</p>
          )}
        </div>
      </div>

      {/* Live event feed */}
      <div className="overflow-hidden rounded-xl border border-[var(--c-line)] bg-[var(--c-paper)]">
        <div className="border-b border-[var(--c-line)] px-4 py-3">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.06em] text-[var(--c-text-4)]">
            Activity feed
          </p>
        </div>
        <div className="divide-y divide-[var(--c-line)]">
          {feed.map((event) => (
            <div className="px-4 py-2.5" key={event.id}>
              <p className="truncate text-xs font-medium text-[var(--c-text)]">{event.customer_name}</p>
              <div className="mt-0.5 flex items-center justify-between gap-2">
                <p className="font-mono text-[10px] text-[var(--c-text-3)]">
                  → {STATUS_LABELS[event.to_status] ?? event.to_status}
                </p>
                <span className="shrink-0 font-mono text-[10px] text-[var(--c-text-4)]">
                  {timeAgo(event.created_at)}
                </span>
              </div>
            </div>
          ))}
          {feed.length === 0 && (
            <p className="px-4 py-3 font-mono text-[10.5px] text-[var(--c-text-4)]">No recent activity</p>
          )}
        </div>
      </div>
    </aside>
  );
}
