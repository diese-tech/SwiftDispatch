"use client";

import { useState } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

type FailedSms = {
  id: string;
  message_type: string;
  last_error: string | null;
  updated_at: string;
};

const MESSAGE_TYPE_LABELS: Record<string, string> = {
  technician_assignment: "Technician assignment",
  quote_approval: "Quote approval",
  customer_status_assigned: "Customer: Assigned",
  customer_status_en_route: "Customer: En Route",
  customer_status_in_progress: "Customer: In Progress",
  customer_status_completed: "Customer: Completed",
  customer_status_cancelled: "Customer: Cancelled",
  customer_status_no_access: "Customer: No Access",
  customer_invoice_ready: "Customer: Invoice",
};

function fmtTs(ts: string) {
  return new Date(ts).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function SmsFailurePanel({ jobId, initialFailures }: { jobId: string; initialFailures: FailedSms[] }) {
  const [failures, setFailures] = useState(initialFailures);
  const [status, setStatus] = useState<"idle" | "retrying" | "success" | "error">("idle");

  if (failures.length === 0) return null;

  async function retry() {
    setStatus("retrying");
    const res = await fetch(`/api/jobs/${jobId}/retry-sms`, { method: "POST" });
    if (res.ok) {
      setFailures([]);
      setStatus("success");
    } else {
      setStatus("error");
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-red-200 bg-red-50 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
      <div className="flex items-center gap-2 border-b border-red-200 px-6 py-4">
        <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
        <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-red-700">SMS delivery failed</p>
      </div>
      <div className="px-6 py-4 space-y-3">
        {failures.map((f) => (
          <div key={f.id} className="rounded-xl border border-red-200 bg-white px-4 py-3">
            <p className="text-sm font-medium text-slate-800">
              {MESSAGE_TYPE_LABELS[f.message_type] ?? f.message_type}
            </p>
            {f.last_error && (
              <p className="mt-1 font-mono text-[10.5px] text-red-600 break-all">{f.last_error}</p>
            )}
            <p className="mt-1 font-mono text-[10px] text-slate-400">Failed {fmtTs(f.updated_at)}</p>
          </div>
        ))}

        <div className="flex items-center gap-3 pt-1">
          <button
            className="inline-flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-sm font-semibold !text-white disabled:opacity-60 transition hover:bg-red-700"
            disabled={status === "retrying"}
            onClick={retry}
            type="button"
          >
            <RefreshCw size={13} className={status === "retrying" ? "animate-spin" : ""} />
            {status === "retrying" ? "Retrying…" : "Retry SMS"}
          </button>
          {status === "success" && (
            <span className="font-mono text-[10.5px] text-green-700">Queued for retry.</span>
          )}
          {status === "error" && (
            <span className="font-mono text-[10.5px] text-red-600">Retry failed. Try again.</span>
          )}
        </div>

        <p className="font-mono text-[10px] text-red-500">
          If SMS keeps failing, call the customer directly or copy their number above.
        </p>
      </div>
    </div>
  );
}
