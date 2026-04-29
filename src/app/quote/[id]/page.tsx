import { notFound } from "next/navigation";
import { money } from "@/lib/format";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type { QuoteWithItems } from "@/types/db";

export default async function PublicQuotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("quotes")
    .select(
      "*, quote_line_items(id,quote_id,name,price,quantity), jobs(id,customer_name,phone,address,issue)",
    )
    .eq("id", id)
    .single();

  if (error || !data) notFound();
  const quote = data as QuoteWithItems;

  return (
    <main className="min-h-screen bg-white px-4 py-8">
      <section className="mx-auto max-w-2xl">
        <div className="mb-8 border-b border-slate-200 pb-5">
          <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
            HVAC Quote
          </p>
          <h1 className="mt-2 text-3xl font-semibold">
            {quote.jobs?.customer_name}
          </h1>
          <p className="mt-2 text-slate-600">{quote.jobs?.address}</p>
        </div>
        <div className="divide-y divide-slate-200 rounded-lg border border-slate-200">
          {quote.quote_line_items.map((item) => (
            <div
              className="grid grid-cols-[1fr_auto] gap-3 p-4"
              key={item.id}
            >
              <div>
                <p className="font-semibold">{item.name}</p>
                <p className="text-sm text-slate-600">
                  {item.quantity} x {money(item.price)}
                </p>
              </div>
              <p className="font-semibold">{money(item.price * item.quantity)}</p>
            </div>
          ))}
          <div className="flex items-center justify-between bg-slate-50 p-4 text-xl font-semibold">
            <span>Total</span>
            <span>{money(quote.total)}</span>
          </div>
        </div>
      </section>
    </main>
  );
}
