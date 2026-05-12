import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "ROI Calculator",
  description: "Estimate dispatch and quote-flow ROI improvements with SwiftDispatch.",
  alternates: { canonical: "/roi-calculator" },
};

export default function RoiCalculatorPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="text-4xl font-semibold tracking-tight text-slate-950">ROI Calculator</h1>
      <p className="mt-4 text-slate-600">Use the operator ROI simulator in the authenticated app, or contact us for a guided ROI estimate.</p>
      <div className="mt-8 flex gap-3">
        <Link className="rounded-full bg-teal-700 px-5 py-3 font-semibold text-white" href="/demo">Book a Demo</Link>
        <Link className="rounded-full border border-slate-300 px-5 py-3 font-semibold text-slate-900" href="/login">Sign In</Link>
      </div>
    </main>
  );
}
