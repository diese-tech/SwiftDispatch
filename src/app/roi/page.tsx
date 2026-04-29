import Link from "next/link";
import RoiSimulator from "@/components/RoiSimulator";
import { getCurrentProfile } from "@/lib/auth";

export default async function RoiPage() {
  await getCurrentProfile();

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
            SwiftDispatch
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            ROI Simulator
          </h1>
        </div>
        <Link
          className="rounded-md border border-slate-300 bg-white px-4 py-3 text-center text-base font-semibold"
          href="/dashboard"
        >
          Dispatch Board
        </Link>
      </div>
      <RoiSimulator />
    </main>
  );
}
