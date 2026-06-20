import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  FileCheck,
  LayoutGrid,
  MessageSquare,
  PhoneCall,
  Send,
  Smartphone,
} from "lucide-react";
import { SectionEyebrow, SectionHeading } from "@/components/DesignSystem";
import Reveal from "@/components/Reveal";
import DispatchPreview from "@/components/DispatchPreview";

const features = [
  {
    icon: LayoutGrid,
    title: "Real-time dispatch board",
    description:
      "Run dispatch from one visual board with cleaner ownership, less chasing, and fewer dropped updates.",
  },
  {
    icon: MessageSquare,
    title: "SMS-first field workflow",
    description:
      "Technicians and customers stay in the loop without you forcing another heavyweight app install.",
  },
  {
    icon: FileCheck,
    title: "Quote approvals that move",
    description:
      "Send quotes while the job is still active and reduce the dead time between diagnosis and approval.",
  },
  {
    icon: BarChart3,
    title: "Operational visibility",
    description:
      "See response times, quote performance, and revenue momentum without stitching together spreadsheets.",
  },
];

const trustCards = [
  {
    eyebrow: "Built for",
    title: "Small HVAC teams with 3 to 15 techs that are growing past calls, texts, and memory.",
    description:
      "SwiftDispatch is strongest when the work is increasing, the office is stretched, and coordination has started living in too many places at once.",
  },
  {
    eyebrow: "Designed for",
    title: "Owner-operators, office managers, dispatchers, and techs in one operating flow.",
    description:
      "The office gets a clearer command surface while the field team and customer side keep moving with less friction.",
  },
  {
    eyebrow: "The right tier",
    title: "More structure than whiteboards. Less overhead than ServiceTitan.",
    description:
      "Enterprise dispatch platforms are built for companies with dedicated IT, six-figure contracts, and months of onboarding. SwiftDispatch is built for teams that need to move faster, not heavier.",
  },
];

const proofCards = [
  {
    title: "Dispatch board with live job ownership",
    audience: "For the office",
    outcome: "Know what is open, who owns it, and what is slipping before it turns into another callback chain.",
  },
  {
    title: "Field workflow that stays lightweight",
    audience: "For technicians",
    outcome: "Keep the field responsive without betting adoption on another complicated mobile app rollout.",
  },
  {
    title: "Customer communication and closeout clarity",
    audience: "For revenue follow-through",
    outcome: "Move from intake to quote to completion in a flow that feels like one product instead of five stitched together.",
  },
];

const workflow = [
  {
    icon: PhoneCall,
    title: "Capture the request",
    description: "A call, form, or manual intake becomes an active job right away instead of a note to track later.",
  },
  {
    icon: Send,
    title: "Assign and notify",
    description: "Dispatch the right tech, send the update path, and keep the office and field aligned in seconds.",
  },
  {
    icon: Smartphone,
    title: "Update, quote, and close",
    description: "The technician updates progress from the field while the customer receives cleaner quote and status communication.",
  },
];

const plans = [
  {
    name: "Starter",
    price: "$99",
    detail: "Up to 3 technicians",
    features: ["Dispatch board", "SMS updates", "Quote builder"],
  },
  {
    name: "Growth",
    price: "$199",
    detail: "Up to 10 technicians",
    features: ["Everything in Starter", "Analytics", "Templates"],
    featured: true,
  },
  {
    name: "Pro",
    price: "$399",
    detail: "Unlimited technicians",
    features: ["Everything in Growth", "Priority support", "Custom workflows"],
  },
];

const fitSignals = [
  "You dispatch from calls, texts, and a whiteboard or spreadsheet.",
  "You have enough job volume that follow-through is starting to break down.",
  "You want technicians, office staff, and customers in a cleaner loop without adding operational clutter.",
  "You have looked at platforms like ServiceTitan and decided the cost and complexity are not worth it yet.",
];

/* ── Inline proof thumbs ─────────────────────────────────────────────── */

function DispatchBoardThumb() {
  return (
    <div className="h-52 overflow-hidden p-3">
      <div className="space-y-2 scale-[0.82] origin-top-left w-[122%]">
        {/* metrics strip */}
        <div className="grid grid-cols-4 gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 text-[10px]">
          {[["Open jobs","5"],["Unassigned","2"],["En route","1"],["Techs","4"]].map(([l, v]) => (
            <div key={l} className="bg-white px-2 py-1.5">
              <p className="font-mono text-[8px] uppercase tracking-wide text-zinc-400">{l}</p>
              <p className="text-base font-semibold text-zinc-900">{v}</p>
            </div>
          ))}
        </div>
        {/* mini columns */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "New", dot: "bg-zinc-400", jobs: ["Sarah Chen","Tom Okafor"] },
            { label: "Assigned", dot: "bg-blue-500", jobs: ["Marcus Rivera"] },
            { label: "En Route", dot: "bg-amber-600", jobs: ["Lisa Park"] },
          ].map((col) => (
            <div key={col.label} className="rounded-lg border border-slate-200 bg-white">
              <div className="flex items-center gap-1.5 border-b border-slate-100 px-2 py-1.5">
                <span className={`h-1.5 w-1.5 rounded-full ${col.dot}`} />
                <span className="text-[10px] font-medium text-zinc-600">{col.label}</span>
              </div>
              <div className="space-y-1.5 p-1.5">
                {col.jobs.map((name) => (
                  <div key={name} className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                    <p className="text-[10px] font-semibold text-zinc-800">{name}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TechSmsThumb() {
  const messages = [
    { from: "system", text: "You have been assigned to: Lisa Park — 17 Sunridge Way" },
    { from: "tech", text: "En route now, ETA 15 min" },
    { from: "system", text: "Status updated to En Route. Customer notified." },
    { from: "tech", text: "On site. Starting diagnosis." },
  ];
  return (
    <div className="flex h-52 flex-col gap-1.5 overflow-hidden bg-slate-100 p-3">
      <div className="flex items-center gap-2 rounded-xl bg-[#0b2235] px-3 py-2">
        <div className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-teal-600 font-mono text-[9px] font-bold text-white">JK</div>
        <div>
          <p className="text-[10px] font-semibold text-white">Jason K.</p>
          <p className="text-[9px] text-slate-400">Field technician</p>
        </div>
      </div>
      <div className="flex-1 space-y-1.5 overflow-hidden">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.from === "tech" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-xl px-2.5 py-1.5 text-[9.5px] leading-4 ${m.from === "tech" ? "bg-teal-700 text-white" : "bg-white text-zinc-700 border border-slate-200"}`}>
              {m.text}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function QuoteThumb() {
  return (
    <div className="h-52 space-y-2 overflow-hidden p-3">
      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <p className="font-mono text-[9px] uppercase tracking-wide text-zinc-400">Quote #A8F3</p>
        <p className="mt-1 text-sm font-semibold text-zinc-900">Marcus Rivera</p>
        <div className="mt-2 space-y-1">
          {[["Refrigerant recharge (2 lbs)", "$180"],["Labor — AC diagnostic","$95"],["Service call fee","$75"]].map(([name, price]) => (
            <div key={name} className="flex items-center justify-between text-[10px]">
              <span className="text-zinc-600">{name}</span>
              <span className="font-semibold text-zinc-900">{price}</span>
            </div>
          ))}
          <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] font-bold">
            <span className="text-zinc-800">Total</span>
            <span className="text-zinc-900">$350.00</span>
          </div>
        </div>
      </div>
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-center">
        <p className="font-mono text-[9px] uppercase tracking-wide text-emerald-700">Customer accepted via SMS link</p>
      </div>
    </div>
  );
}

export default function MarketingLanding() {
  return (
    <main id="top">
      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="px-6 pb-20 pt-16 sm:pt-20">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
          <div>
            <span className="inline-flex items-center rounded border border-teal-200 bg-teal-50 px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.06em] text-teal-700">
              HVAC Dispatch Platform
            </span>
            <h1 className="mt-6 max-w-4xl text-5xl font-semibold tracking-[-0.025em] text-slate-950 sm:text-6xl">
              The dispatch layer between whiteboards and enterprise software.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              SwiftDispatch is built for 3 to 15 technician HVAC teams that have outgrown calls, texts, and spreadsheets — but are not ready for the cost and complexity of platforms like ServiceTitan.
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <Link
                className="inline-flex items-center justify-center rounded-full bg-teal-700 px-7 py-3.5 text-base font-semibold !text-white transition hover:bg-teal-800"
                href="/demo"
              >
                Request a Demo
              </Link>
              <Link
                className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-7 py-3.5 text-base font-semibold text-slate-800 transition hover:bg-slate-50"
                href="/login"
              >
                Try live demo
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Live sandbox · login with <strong>demo@swiftdispatch.app</strong> / <strong>demo</strong> · resets nightly
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                "No extra app for technicians",
                "Quote approvals by text",
                "Starts at $99/mo — not $500+",
              ].map((item, index) => (
                <Reveal key={item} delay={index * 80}>
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-teal-700" />
                      <p className="text-sm leading-6 text-slate-700">{item}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 p-2 shadow-[0_28px_80px_rgba(8,26,40,0.14)]">
              <div className="overflow-hidden rounded-xl">
                <DispatchPreview />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {["Dispatch clarity", "Quote follow-through", "Built for HVAC operators"].map((label) => (
                <span
                  key={label}
                  className="inline-flex items-center rounded border border-slate-200 bg-white px-2.5 py-1 font-mono text-[11px] text-slate-500"
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Why teams pay attention ──────────────────────────────── */}
      <section className="px-6 pb-8" id="proof">
        <div className="mx-auto max-w-7xl rounded-2xl bg-[linear-gradient(135deg,#0b2235_0%,#102f47_58%,#081b2a_100%)] px-6 py-10 text-white shadow-[0_28px_80px_rgba(8,26,40,0.14)] sm:px-8 lg:px-10">
          <SectionEyebrow inverse>Why Teams Pay Attention</SectionEyebrow>
          <SectionHeading
            inverse
            title="A cleaner operating system for the part of HVAC work that usually turns into noise."
            description="This is where SwiftDispatch earns attention: it reduces coordination friction in the office, in the field, and in the customer loop at the same time."
          />

          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {trustCards.map((card, index) => (
              <Reveal key={card.eyebrow} delay={index * 100}>
                <div className="h-full rounded-xl border border-white/10 bg-white/5 p-6">
                  <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-slate-400">
                    0{index + 1} · {card.eyebrow}
                  </p>
                  <h3 className="mt-4 text-xl font-semibold tracking-tight text-white">{card.title}</h3>
                  <p className="mt-4 text-sm leading-7 text-slate-300">{card.description}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────── */}
      <section className="px-6 py-20" id="features">
        <div className="mx-auto max-w-7xl">
          <SectionEyebrow>Features</SectionEyebrow>
          <SectionHeading
            title="Everything your dispatch flow actually needs"
            description="The public story and the product story should match. SwiftDispatch is built around operational speed, field coordination, and revenue follow-through."
          />

          <div className="mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {features.map(({ icon: Icon, title, description }, index) => (
              <Reveal key={title} delay={index * 80}>
                <div className="h-full rounded-xl border border-slate-200 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
                  <div className="mb-5 inline-flex rounded-lg bg-teal-50 p-2.5 text-teal-700">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-semibold tracking-tight text-slate-950">{title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Fit signals ──────────────────────────────────────────── */}
      <section className="border-y border-slate-100 bg-slate-50 px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <SectionEyebrow>If This Sounds Familiar</SectionEyebrow>
          <SectionHeading
            title="The product tends to click fast when the shop already feels a little too manual."
            description="You do not need a six-figure enterprise platform. You need a tighter operating rhythm for the stage of growth you are already in."
          />

          <div className="mt-12 grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
            {fitSignals.map((item, index) => (
              <Reveal key={item} delay={index * 90}>
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-teal-700" />
                    <p className="text-sm leading-7 text-slate-700">{item}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Product proof ────────────────────────────────────────── */}
      <section className="bg-white px-6 py-20" id="product">
        <div className="mx-auto max-w-7xl">
          <SectionEyebrow>See The Product</SectionEyebrow>
          <SectionHeading
            title="Proof that feels like a real operating tool, not a generic SaaS promise."
            description="These guided views show the core workflow: dispatch visibility, technician coordination, and cleaner closeout communication."
          />

          <div className="mt-14 grid gap-6 lg:grid-cols-3">
            {proofCards.map((card, index) => (
              <Reveal key={card.title} delay={index * 100}>
                <div className="h-full rounded-xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
                  <div className="overflow-hidden rounded-t-xl border-b border-slate-100 bg-slate-50">
                    {index === 0 && <DispatchBoardThumb />}
                    {index === 1 && <TechSmsThumb />}
                    {index === 2 && <QuoteThumb />}
                  </div>
                  <div className="p-5">
                    <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-teal-700">
                      {card.audience}
                    </span>
                    <h3 className="mt-2 text-lg font-semibold tracking-tight text-slate-950">{card.title}</h3>
                    <p className="mt-2 text-sm leading-7 text-slate-600">{card.outcome}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────── */}
      <section className="px-6 py-20" id="workflow">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
            <div>
              <SectionEyebrow>How It Works</SectionEyebrow>
              <SectionHeading
                title="From incoming request to completed job without the usual mess."
                description="SwiftDispatch keeps the steps simple, but the coordination stronger. The office sees the board, the field gets a clean path, and the customer stays informed."
              />
            </div>

            <div className="grid gap-4">
              {workflow.map(({ icon: Icon, title, description }, index) => (
                <Reveal key={title} delay={index * 100}>
                  <div className="grid gap-5 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-[auto_1fr]">
                    <div className="flex items-center gap-4">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-slate-200 bg-slate-50 text-teal-700">
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>
                    <div>
                      <p className="font-mono text-[10.5px] uppercase tracking-[0.06em] text-slate-400">
                        Step {index + 1}
                      </p>
                      <h3 className="mt-1 text-lg font-semibold tracking-tight text-slate-950">{title}</h3>
                      <p className="mt-1.5 text-sm leading-7 text-slate-600">{description}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────────── */}
      <section className="border-y border-slate-100 bg-slate-50 px-6 py-20" id="pricing">
        <div className="mx-auto max-w-7xl">
          <SectionEyebrow>Pricing</SectionEyebrow>
          <SectionHeading
            align="center"
            title="Straightforward plans for small HVAC teams"
            description="Pick the plan that fits your crew today, then grow into more visibility and process control as the business gets busier."
          />

          <div className="mt-14 grid gap-6 lg:grid-cols-3">
            {plans.map((plan, index) => (
              <Reveal key={plan.name} delay={index * 90}>
                <div
                  className={[
                    "relative h-full rounded-xl border p-6",
                    plan.featured
                      ? "border-teal-800 bg-[linear-gradient(180deg,#0d6f67_0%,#0b5f58_100%)] text-white shadow-[0_8px_32px_rgba(13,111,103,0.28)]"
                      : "border-slate-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]",
                  ].join(" ")}
                >
                  {plan.featured ? (
                    <span className="absolute right-4 top-4 rounded border border-orange-400/40 bg-orange-400/20 px-2 py-0.5 font-mono text-[10.5px] uppercase tracking-[0.06em] text-orange-200">
                      Popular
                    </span>
                  ) : null}
                  <h3 className="text-xl font-semibold tracking-tight">{plan.name}</h3>
                  <div className="mt-5">
                    <span className="text-4xl font-semibold tracking-tight">{plan.price}</span>
                    <span className={`ml-2 text-sm ${plan.featured ? "text-teal-100" : "text-slate-500"}`}>/ month</span>
                  </div>
                  <p className={`mt-2 text-sm ${plan.featured ? "text-teal-100" : "text-slate-500"}`}>{plan.detail}</p>

                  <ul className="mt-7 space-y-3">
                    {plan.features.map((feature) => (
                      <li className="flex items-start gap-3 text-sm" key={feature}>
                        <CheckCircle2
                          className={`mt-0.5 h-4 w-4 shrink-0 ${plan.featured ? "text-teal-200" : "text-teal-700"}`}
                        />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    className={[
                      "mt-8 inline-flex w-full items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold transition",
                      plan.featured
                        ? "bg-white !text-teal-800 hover:bg-slate-100"
                        : "border border-slate-300 bg-white !text-slate-900 hover:bg-slate-50",
                    ].join(" ")}
                    href="/demo"
                  >
                    Talk to Sales
                  </Link>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────── */}
      <section className="px-6 pb-24 pt-8">
        <div className="mx-auto grid max-w-7xl gap-10 overflow-hidden rounded-2xl bg-[linear-gradient(135deg,#0b2235_0%,#102f47_55%,#081b2a_100%)] px-8 py-10 text-white shadow-[0_28px_80px_rgba(8,26,40,0.14)] lg:grid-cols-[1fr_0.92fr] lg:items-center lg:px-12">
          <div>
            <SectionEyebrow inverse>Ready To Move Faster?</SectionEyebrow>
            <h2 className="mt-4 max-w-2xl text-4xl font-semibold tracking-tight">
              Stop running dispatch through scattered texts, callbacks, and sticky-note memory.
            </h2>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-300">
              Get a focused walkthrough of how SwiftDispatch can tighten response times, reduce coordination drag, and help your team close jobs with more consistency.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link
                className="inline-flex items-center justify-center rounded-full bg-orange-400 px-7 py-3.5 text-base font-semibold !text-slate-950 transition hover:bg-orange-300"
                href="/demo"
              >
                Schedule a Demo
              </Link>
              <Link
                className="inline-flex items-center justify-center rounded-full border border-white/20 px-7 py-3.5 text-base font-semibold !text-white transition hover:bg-white/10"
                href="/login"
              >
                Sign In
              </Link>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="overflow-hidden rounded-lg border border-white/10">
              <TechSmsThumb />
            </div>
            <div className="mt-4 flex items-center gap-3 text-sm text-slate-300">
              <ClipboardList className="h-4 w-4 shrink-0 text-teal-300" />
              Built for small HVAC teams that need cleaner dispatch, field coordination, and quote follow-through.
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
