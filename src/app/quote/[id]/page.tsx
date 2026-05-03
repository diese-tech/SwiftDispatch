import { notFound } from "next/navigation";
import AcceptQuoteButton from "@/components/AcceptQuoteButton";
import { AppPageIntro, SurfaceCard, StatusPill } from "@/components/DesignSystem";
import { getCurrentProfile } from "@/lib/auth";
import { money } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { QuoteWithItems } from "@/types/db";

export default async function PublicQuotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("quotes")
    .select("*, quote_line_items(id,quote_id,name,price,quantity), jobs!inner(id,customer_name,phone,address,issue,company_id)")
    .eq("id", id)
    .eq("is_demo", false)
    .eq("jobs.company_id", profile.company_id)
    .single();

  if (error || !data) notFound();
  const quote = data as QuoteWithItems;

  return (
    <main>
      <AppPageIntro
        eyebrow="Quote review"
        title={quote.jobs?.customer_name ?? "Quote"}
        description="Review the line items, total, and customer context in the same product system as dispatch and closeout."
        actions={<StatusPill tone={quote.status === "accepted" ? "success" : quote.status === "rejected" || quote.status === "declined" ? "danger" : "warm"}>{quote.status}</StatusPill>}
      />

      <div className="mx-auto max-w-3xl">
        <SurfaceCard accent className="p-0 overflow-hidden">
          <div className="border-b border-slate-200 px-6 py-5">
            <p className="text-sm text-slate-500">{quote.jobs?.address}</p>
            <p className="mt-2 text-sm leading-7 text-slate-600">{quote.jobs?.issue}</p>
          </div>
          <div className="divide-y divide-slate-200">
            {quote.quote_line_items.map((item) => (
              <div className="grid grid-cols-[1fr_auto] gap-3 px-6 py-4" key={item.id}>
                <div>
                  <p className="font-semibold text-slate-900">{item.name}</p>
                  <p className="text-sm text-slate-600">{item.quantity} x {money(item.price)}</p>
                </div>
                <p className="font-semibold text-slate-900">{money(item.price * item.quantity)}</p>
              </div>
            ))}
            <div className="flex items-center justify-between bg-slate-50 px-6 py-5 text-xl font-semibold text-slate-950">
              <span>Total</span>
              <span>{money(quote.total)}</span>
            </div>
          </div>
        </SurfaceCard>
        <div className="mt-6"><AcceptQuoteButton quoteId={quote.id} initialStatus={quote.status} /></div>
      </div>
    </main>
  );
}