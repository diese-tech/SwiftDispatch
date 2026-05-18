import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { SectionEyebrow, SectionHeading, SurfaceCard, StatusPill } from "@/components/DesignSystem";
import Reveal from "@/components/Reveal";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Simple, transparent pricing for small HVAC teams. Starter at $99/month, Growth at $199/month, Pro at $399/month. No per-seat surprises.",
  alternates: { canonical: "/pricing" },
};

const plans = [
  {
    name: "Starter",
    price: "$99",
    detail: "Up to 3 technicians",
    description: "For shops that are just getting the coordination off whiteboards and into one place.",
    features: [
      "Dispatch board",
      "SMS customer updates",
      "Quote builder and approvals",
      "Customer intake portal",
      "Technician portal (no app install)",
      "Email support",
    ],
  },
  {
    name: "Growth",
    price: "$199",
    detail: "Up to 10 technicians",
    description: "For teams that are growing and need visibility into how the operation is actually performing.",
    features: [
      "Everything in Starter",
      "Operational analytics",
      "Job and quote templates",
      "Multi-dispatcher access",
      "Priority email support",
    ],
    featured: true,
  },
  {
    name: "Pro",
    price: "$399",
    detail: "Unlimited technicians",
    description: "For larger shops that need more workflow flexibility and direct support when something matters.",
    features: [
      "Everything in Growth",
      "Unlimited technicians",
      "Custom workflows",
      "Priority support with faster response times",
      "Dedicated onboarding walkthrough",
    ],
  },
];

const faqs = [
  {
    question: "Is there a free trial?",
    answer: "We offer a guided demo instead of a self-serve trial. That way you see the workflow configured for your team size, not a generic sandbox. Book a demo and we will get you set up.",
  },
  {
    question: "What counts as a technician?",
    answer: "A technician is any field user with a portal login. Office staff and dispatchers do not count toward your technician limit.",
  },
  {
    question: "Can I change plans later?",
    answer: "Yes. You can upgrade or downgrade at any time. Upgrades take effect immediately and downgrades take effect at the next billing cycle.",
  },
  {
    question: "Is there a setup fee?",
    answer: "No setup fee. Growth and Pro plans include an onboarding walkthrough at no extra cost.",
  },
  {
    question: "Do you support multiple locations?",
    answer: "Each plan covers one company workspace. If you run multiple independent locations, contact us and we will put together the right setup.",
  },
];

export default function PricingPage() {
  return (
    <main>
      <section className="px-6 pb-16 pt-16 sm:pt-20">
        <div className="mx-auto max-w-7xl">
          <SectionEyebrow>Pricing</SectionEyebrow>
          <SectionHeading
            align="center"
            title="Straightforward plans for small HVAC teams"
            description="Pick the plan that fits your crew today. No per-seat pricing, no surprise add-ons, no enterprise contract required."
          />
        </div>
      </section>

      <section className="px-6 pb-20">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-6 lg:grid-cols-3">
            {plans.map((plan, index) => (
              <Reveal key={plan.name} delay={index * 90}>
                <SurfaceCard
                  accent
                  className={
                    plan.featured
                      ? "flex h-full flex-col bg-[linear-gradient(180deg,#0d6f67_0%,#0b5f58_100%)] text-white"
                      : "flex h-full flex-col"
                  }
                >
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-semibold">{plan.name}</h2>
                    {plan.featured ? <StatusPill tone="warm">Most popular</StatusPill> : null}
                  </div>
                  <div className="mt-6">
                    <span className="text-5xl font-semibold tracking-tight">{plan.price}</span>
                    <span className={plan.featured ? "ml-2 text-sm text-teal-50" : "ml-2 text-sm text-slate-500"}> / month</span>
                  </div>
                  <p className={plan.featured ? "mt-2 text-sm font-medium text-teal-100" : "mt-2 text-sm font-medium text-slate-500"}>
                    {plan.detail}
                  </p>
                  <p className={plan.featured ? "mt-4 text-sm leading-7 text-teal-50" : "mt-4 text-sm leading-7 text-slate-600"}>
                    {plan.description}
                  </p>
                  <ul className="mt-8 flex-1 space-y-3">
                    {plan.features.map((feature) => (
                      <li className="flex items-start gap-3 text-sm" key={feature}>
                        <CheckCircle2
                          className={
                            plan.featured
                              ? "mt-0.5 h-4 w-4 shrink-0 text-white"
                              : "mt-0.5 h-4 w-4 shrink-0 text-teal-700"
                          }
                        />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    className={
                      plan.featured
                        ? "mt-8 inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold !text-teal-800 transition hover:bg-slate-100"
                        : "mt-8 inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold !text-slate-900 transition hover:bg-slate-50"
                    }
                    href="/demo"
                  >
                    Talk to Sales
                  </Link>
                </SurfaceCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 pb-24">
        <div className="mx-auto max-w-3xl">
          <SectionEyebrow>FAQ</SectionEyebrow>
          <SectionHeading title="Common questions" description="" />
          <div className="mt-10 divide-y divide-slate-200">
            {faqs.map(({ question, answer }) => (
              <Reveal key={question}>
                <div className="py-6">
                  <h3 className="text-base font-semibold text-slate-950">{question}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{answer}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 pb-24">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-[2.6rem] bg-[linear-gradient(135deg,#0b2235_0%,#102f47_58%,#081b2a_100%)] px-8 py-12 text-white shadow-[var(--shadow-lg)] lg:px-12">
          <SectionEyebrow inverse>Not sure which plan fits?</SectionEyebrow>
          <h2 className="mt-4 max-w-2xl text-4xl font-semibold tracking-tight">
            Talk to us before you commit. We will tell you if the Starter plan is enough.
          </h2>
          <p className="mt-4 max-w-xl text-lg leading-8 text-slate-300">
            Most teams start on Growth and never need to think about it again. But we would rather you be on the right plan than the most expensive one.
          </p>
          <div className="mt-8">
            <Link className="inline-flex items-center justify-center rounded-full bg-orange-400 px-7 py-3.5 text-base font-semibold !text-slate-950 transition hover:bg-orange-300" href="/demo">
              Book a Demo
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
