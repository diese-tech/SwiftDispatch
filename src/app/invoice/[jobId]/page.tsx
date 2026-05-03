import { notFound } from "next/navigation";
import { AppPageIntro, SurfaceCard, StatusPill } from "@/components/DesignSystem";
import { getCurrentProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function InvoicePage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const profile = await getCurrentProfile();
  const supabase = await createSupabaseServerClient();

  const { data: job, error } = await supabase.from("jobs").select("*, technicians(id,name,phone), companies(name,phone,email)").eq("id", jobId).eq("company_id", profile.company_id).single();
  if (error || !job) notFound();

  const { data: quote } = await supabase.from("quotes").select("*, quote_line_items(*)").eq("job_id", jobId).eq("status", "accepted").order("created_at", { ascending: false }).limit(1).single();
  const { data: events } = await supabase.from("status_events").select("from_status, to_status, created_at, actor_role").eq("job_id", jobId).order("created_at", { ascending: true });
  const { data: invoice } = await supabase.from("invoices").select("invoice_number, created_at, total_amount, status").eq("job_id", jobId).limit(1).single();

  const techData = Array.isArray(job.technicians) ? job.technicians[0] : job.technicians;
  const companyData = Array.isArray(job.companies) ? job.companies[0] : job.companies;
  const lineItems = quote?.quote_line_items ?? [];
  const total = lineItems.reduce((s: number, li: { price?: number; unit_price?: number; quantity?: number; qty?: number }) => s + (li.price ?? li.unit_price ?? 0) * (li.quantity ?? li.qty ?? 1), 0);
  const invoiceNumber = invoice?.invoice_number ?? `INV-${new Date().getFullYear()}-${jobId.slice(0, 6).toUpperCase()}`;
  const arrivedEvent = events?.find((e) => e.to_status === "in_progress");
  const completedEvent = events?.find((e) => e.to_status === "completed");

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { font-size: 12px; }
        }
      `}</style>
      <main>
        <AppPageIntro
          eyebrow="Invoice"
          title={companyData?.name ?? "SwiftDispatch"}
          description={`Invoice ${invoiceNumber} for ${job.customer_name}`}
          actions={<StatusPill tone={invoice?.status === "paid" ? "success" : "warm"}>{invoice?.status ?? "pending"}</StatusPill>}
        />

        <div className="mx-auto max-w-4xl">
          <SurfaceCard accent className="p-8">
            <div className="flex flex-col gap-6 border-b border-slate-200 pb-6 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-2xl font-bold text-teal-700">{companyData?.name ?? "SwiftDispatch"}</p>
                {companyData?.phone ? <p className="mt-1 text-sm text-slate-500">{companyData.phone}</p> : null}
              </div>
              <div className="text-left md:text-right">
                <p className="text-xl font-bold text-slate-900">INVOICE</p>
                <p className="mt-1 text-sm text-slate-500">{invoiceNumber}</p>
                <p className="text-sm text-slate-500">{new Date().toLocaleDateString()}</p>
              </div>
            </div>

            <div className="my-8 grid gap-6 md:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Bill to</p>
                <p className="font-semibold text-slate-800">{job.customer_name}</p>
                <p className="text-sm text-slate-600">{job.address}</p>
                <p className="text-sm text-slate-600">{job.phone}</p>
              </div>
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Job details</p>
                <p className="text-sm text-slate-600">Ref: #{jobId.slice(0, 8).toUpperCase()}</p>
                {techData ? <p className="text-sm text-slate-600">Tech: {techData.name}</p> : null}
                {arrivedEvent ? <p className="text-sm text-slate-600">Arrived: {new Date(arrivedEvent.created_at).toLocaleString()}</p> : null}
                {completedEvent ? <p className="text-sm text-slate-600">Completed: {new Date(completedEvent.created_at).toLocaleString()}</p> : null}
              </div>
            </div>

            <table className="mb-6 w-full text-sm">
              <thead className="border-y border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">Description</th>
                  <th className="px-3 py-2 text-right font-semibold text-slate-700">Qty</th>
                  <th className="px-3 py-2 text-right font-semibold text-slate-700">Unit Price</th>
                  <th className="px-3 py-2 text-right font-semibold text-slate-700">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lineItems.length === 0 ? (
                  <tr><td className="px-3 py-4 text-center text-slate-400" colSpan={4}>No line items</td></tr>
                ) : lineItems.map((li: { id: string; name?: string; description?: string; price?: number; unit_price?: number; quantity?: number; qty?: number }, i: number) => (
                  <tr key={li.id ?? i}>
                    <td className="px-3 py-2">{li.name ?? li.description}</td>
                    <td className="px-3 py-2 text-right">{li.quantity ?? li.qty}</td>
                    <td className="px-3 py-2 text-right">${(li.price ?? li.unit_price ?? 0).toFixed(2)}</td>
                    <td className="px-3 py-2 text-right">${((li.price ?? li.unit_price ?? 0) * (li.quantity ?? li.qty ?? 1)).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-end border-t border-slate-200 pt-4">
              <div className="min-w-40 space-y-1 text-sm">
                <div className="flex justify-between gap-8">
                  <span className="text-slate-600">Subtotal</span>
                  <span>${total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between gap-8 text-slate-400">
                  <span>Tax (0%)</span>
                  <span>$0.00</span>
                </div>
                <div className="mt-2 flex justify-between gap-8 border-t border-slate-200 pt-2 text-base font-bold">
                  <span>Total</span>
                  <span className="text-teal-700">${total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {events && events.length > 0 ? (
              <div className="mt-8 border-t border-slate-200 pt-6">
                <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">Job history</p>
                <div className="space-y-2">
                  {events.map((ev, i) => (
                    <div className="flex items-center gap-3 text-sm" key={i}>
                      <span className="w-32 flex-shrink-0 text-xs text-slate-400">{new Date(ev.created_at).toLocaleString()}</span>
                      <span className="capitalize text-slate-600">{ev.to_status.replace(/_/g, " ")}</span>
                      <span className="text-xs text-slate-400">({ev.actor_role})</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mt-8 flex justify-center no-print">
              <button className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50" onClick={() => window.print()}>
                Print Invoice
              </button>
            </div>
          </SurfaceCard>
        </div>
      </main>
    </>
  );
}