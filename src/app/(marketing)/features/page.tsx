import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Features",
  description: "Explore SwiftDispatch features for dispatch, technician coordination, and quote approvals.",
  alternates: { canonical: "/features" },
};

export default function FeaturesPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="text-4xl font-semibold tracking-tight text-slate-950">SwiftDispatch Features</h1>
      <p className="mt-4 text-slate-600">Dispatch board visibility, SMS-first updates, quote approvals, and operational reporting in one flow.</p>
      <div className="mt-8">
        <Link className="rounded-full border border-slate-300 px-5 py-3 font-semibold text-slate-900" href="/#features">View feature highlights</Link>
      </div>
    </main>
  );
}
