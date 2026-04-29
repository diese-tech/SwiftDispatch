import { money } from "@/lib/format";

export default function SalesBadges({
  averageJobValue = 650,
}: {
  averageJobValue?: number;
}) {
  const dailyRevenuePotential = Math.round(averageJobValue * 0.6);

  return (
    <section className="grid gap-3 sm:grid-cols-3">
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 font-semibold text-amber-900">
        32 min saved per dispatch
      </div>
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 font-semibold text-emerald-900">
        +{money(dailyRevenuePotential)}/day revenue potential
      </div>
      <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 font-semibold text-sky-900">
        2x faster quote creation
      </div>
    </section>
  );
}
