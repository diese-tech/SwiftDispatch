import { MetricTile } from "@/components/DesignSystem";
import { money } from "@/lib/format";

export default function SalesBadges({ averageJobValue = 650 }: { averageJobValue?: number }) {
  const dailyRevenuePotential = Math.round(averageJobValue * 0.6);

  return (
    <section className="grid gap-4 md:grid-cols-3">
      <MetricTile label="Dispatch time saved" value="32 min" detail="Average coordination time you can reclaim per dispatch" />
      <MetricTile label="Revenue potential" value={`+${money(dailyRevenuePotential)}/day`} detail="Faster approvals and cleaner flow can open more same-day capacity" />
      <MetricTile label="Quote speed" value="2x faster" detail="Move from diagnosis to customer-ready quote without rekeying the job" />
    </section>
  );
}