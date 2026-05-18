import { notFound } from "next/navigation";
import { redirect } from "next/navigation";
import AcceptQuoteButton from "@/components/AcceptQuoteButton";
import { StatusDot } from "@/components/DesignSystem";
import { money } from "@/lib/format";
import { requireRole } from "@/lib/supabase/withCompany";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { QuoteWithItems } from "@/types/db";

function getQuoteTone(status: string): "neutral" | "blue" | "amber" | "red" | "green" | "violet" {
  if (status === "accepted") return "green";
  if (status === "rejected" || status === "declined") return "red";
  if (status === "sent") return "blue";
  return "neutral";
}

export default async function PublicQuotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  let caller: { companyId: string };
  try {
    caller = await requireRole(supabase, ["admin", "dispatcher"]);
  } catch {
    redirect("/login");
  }

  const { data, error } = await supabase
    .from("quotes")
    .select("*, quote_line_items(id,quote_id,name,price,quantity), jobs!inner(id,customer_name,phone,address,issue,company_id)")
    .eq("id", id)
    .eq("is_demo", false)
    .eq("jobs.company_id", caller.companyId)
    .single();

  if (error || !data) notFound();
  const quote = data as QuoteWithItems;

  return (
    <main className="px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-slate-400">Quote review</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
              {quote.jobs?.customer_name ?? "Quote"}
            </h1>
            <StatusDot tone={getQuoteTone(quote.status)}>{quote.status}</StatusDot>
          </div>
        </div>

        {/* Quote card */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <div className="border-b border-slate-100 px-6 py-4">
            <p className="text-sm text-slate-500">{quote.jobs?.address}</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">{quote.jobs?.issue}</p>
          </div>
          <div className="divide-y divide-slate-100">
            {quote.quote_line_items.map((item) => (
              <div className="grid grid-cols-[1fr_auto] gap-3 px-6 py-4" key={item.id}>
                <div>
                  <p className="font-semibold text-slate-900">{item.name}</p>
                  <p className="text-sm text-slate-600">{item.quantity} × {money(item.price)}</p>
                </div>
                <p className="font-semibold text-slate-900">{money(item.price * item.quantity)}</p>
              </div>
            ))}
            <div className="flex items-center justify-between bg-slate-50 px-6 py-4 text-lg font-semibold text-slate-950">
              <span>Total</span>
              <span>{money(quote.total)}</span>
            </div>
          </div>
        </div>

        <div className="mt-5">
          <AcceptQuoteButton quoteId={quote.id} initialStatus={quote.status} />
        </div>
      </div>
    </main>
  );
}
