import RoiSimulator from "@/components/RoiSimulator";
import { getCurrentProfile } from "@/lib/auth";

export default async function RoiPage() {
  await getCurrentProfile();

  return (
    <main className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
            SwiftDispatch
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            ROI Simulator
          </h1>
        </div>
      </div>
      <RoiSimulator />
    </main>
  );
}
