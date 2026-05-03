import Link from "next/link";
import { AppPageIntro } from "@/components/DesignSystem";
import RoiSimulator from "@/components/RoiSimulator";
import { getCurrentProfile } from "@/lib/auth";

export default async function RoiPage() {
  await getCurrentProfile();
  return (
    <main>
      <AppPageIntro
        eyebrow="ROI simulator"
        title="Pressure-test the business case with your own numbers."
        description="Use the simulator to frame time savings, quote velocity, and revenue impact in terms that make operational sense."
        actions={<Link className="inline-flex items-center rounded-full border border-white/14 bg-white/8 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/12" href="/dashboard">Dispatch Board</Link>}
      />
      <RoiSimulator />
    </main>
  );
}