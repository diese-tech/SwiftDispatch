import { money } from "@/lib/format";

export default function SalesBadges({ averageJobValue = 650 }: { averageJobValue?: number }) {
  const dailyRevenuePotential = Math.round(averageJobValue * 0.6);

  const tiles = [
    { label: "Dispatch time saved", value: "32 min", detail: "Average coordination time you can reclaim per dispatch" },
    { label: "Revenue potential", value: `+${money(dailyRevenuePotential)}/day`, detail: "Faster approvals and cleaner flow can open more same-day capacity" },
    { label: "Quote speed", value: "2x faster", detail: "Move from diagnosis to customer-ready quote without rekeying the job" },
  ];

  return (
    <section className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-[var(--c-line)] bg-[var(--c-line)] md:grid-cols-3">
      {tiles.map(({ label, value, detail }) => (
        <div key={label} className="bg-[var(--c-paper)] px-5 py-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.06em] text-[var(--c-text-4)]">{label}</p>
          <p className="mt-1.5 text-xl font-semibold tracking-tight text-[var(--c-text)]">{value}</p>
          <p className="mt-1 text-xs text-[var(--c-text-3)]">{detail}</p>
        </div>
      ))}
    </section>
  );
}
