import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Simple pricing tiers for HVAC teams adopting SwiftDispatch.",
  alternates: { canonical: "/pricing" },
};

export default function PricingPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="text-4xl font-semibold tracking-tight text-slate-950">SwiftDispatch Pricing</h1>
      <p className="mt-4 text-slate-600">Straightforward tiers for small HVAC teams. Book a demo for final fit and rollout details.</p>
      <div className="mt-8">
        <Link className="rounded-full bg-teal-700 px-5 py-3 font-semibold text-white" href="/demo">Book a Demo</Link>
      </div>
    </main>
  );
}
