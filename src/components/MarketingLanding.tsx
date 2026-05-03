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
import { SectionEyebrow, SectionHeading, SurfaceCard, StatusPill } from "@/components/DesignSystem";

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
    title: "Small HVAC teams that are growing past calls, texts, and memory.",
    description:
      "SwiftDispatch is strongest when the work is increasing and the old coordination habits are starting to create drag.",
  },
  {
    eyebrow: "Designed for",
    title: "Dispatchers, admins, technicians, and customers in one operating flow.",
    description:
      "The office gets a clearer command surface while the field team and customer side keep moving with less friction.",
  },
  {
    eyebrow: "Helps replace",
    title: "Whiteboards, callback chains, spreadsheet handoffs, and lost quote follow-up.",
    description:
      "The value is not more software. It is more order in the parts of the day that usually turn into noise.",
  },
];

const proofCards = [
  {
    image: "/images/landing-dashboard.jpg",
    title: "Dispatch board with live job ownership",
    description: "See what is open, who owns it, and what is at risk without hunting across tabs or text threads.",
  },
  {
    image: "/images/landing-mobile.jpg",
    title: "Field workflow that stays lightweight",
    description: "Keep technicians responsive from the field with a cleaner mobile-first communication loop.",
  },
  {
    image: "/images/landing-hero.jpg",
    title: "Customer communication and closeout clarity",
    description: "Move from intake to quote to completion in a flow that looks like one product instead of five stitched together.",
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

export default function MarketingLanding() {
  return (
    <main id="top">
      <section className="px-6 pb-20 pt-16 sm:pt-20">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
          <div>
            <StatusPill tone="warm">HVAC Dispatch Platform</StatusPill>
            <h1 className="mt-6 max-w-4xl text-5xl font-semibold tracking-tight text-slate-950 sm:text-6xl">
              Run your HVAC operation with a calmer, tighter dispatch system.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              SwiftDispatch helps growing HVAC teams coordinate jobs, track technician progress, move quotes faster, and keep customers informed without bouncing between disconnected tools.
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <Link className="inline-flex items-center justify-center rounded-full bg-teal-700 px-7 py-3.5 text-base font-semibold text-white transition hover:bg-teal-800" href="/demo">
                Request a Demo
              </Link>
              <a className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-7 py-3.5 text-base font-semibold text-slate-800 transition hover:bg-slate-50" href="#product">
                See the product
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {["No extra app for technicians", "Quote approvals by text", "Built for small HVAC teams"].map((item) => (
                <SurfaceCard key={item} className="p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-teal-700" />
                    <p className="text-sm leading-6 text-slate-700">{item}</p>
                  </div>
                </SurfaceCard>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute -left-8 top-10 h-32 w-32 rounded-full bg-teal-200/70 blur-3xl" />
            <div className="absolute -bottom-8 right-2 h-36 w-36 rounded-full bg-orange-200/70 blur-3xl" />
            <SurfaceCard className="p-4">
              <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-slate-950 p-2">
                <img alt="SwiftDispatch dashboard preview" className="rounded-[1.15rem] object-cover" src="/images/landing-dashboard.jpg" />
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <StatusPill tone="teal">Dispatch clarity</StatusPill>
                <StatusPill tone="warm">Quote follow-through</StatusPill>
              </div>
            </SurfaceCard>
          </div>
        </div>
      </section>

      <section className="px-6 pb-8" id="proof">
        <div className="mx-auto max-w-7xl rounded-[2.6rem] bg-[linear-gradient(135deg,#0b2235_0%,#102f47_58%,#081b2a_100%)] px-6 py-8 text-white shadow-[var(--shadow-lg)] sm:px-8 sm:py-10 lg:px-10">
          <SectionEyebrow inverse>Why Teams Pay Attention</SectionEyebrow>
          <SectionHeading
            inverse
            title="A cleaner operating system for the part of HVAC work that usually turns into noise."
            description="This is where SwiftDispatch earns attention: it reduces coordination friction in the office, in the field, and in the customer loop at the same time."
          />

          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {trustCards.map((card, index) => (
              <SurfaceCard accent dark className="backdrop-blur-sm" key={card.title}>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">0{index + 1} {card.eyebrow}</p>
                <h3 className="mt-4 text-2xl font-semibold tracking-tight text-white">{card.title}</h3>
                <p className="mt-4 text-sm leading-7 text-slate-300">{card.description}</p>
              </SurfaceCard>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-20" id="features">
        <div className="mx-auto max-w-7xl">
          <SectionEyebrow>Features</SectionEyebrow>
          <SectionHeading
            title="Everything your dispatch flow actually needs"
            description="The public story and the product story should match. SwiftDispatch is built around operational speed, field coordination, and revenue follow-through."
          />

          <div className="mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {features.map(({ icon: Icon, title, description }) => (
              <SurfaceCard accent className="h-full" key={title}>
                <div className="mb-5 inline-flex rounded-2xl bg-teal-50 p-3 text-teal-700">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-semibold text-slate-950">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
              </SurfaceCard>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-6 py-20" id="product">
        <div className="mx-auto max-w-7xl">
          <SectionEyebrow>See The Product</SectionEyebrow>
          <SectionHeading
            title="Proof that feels like a real operating tool, not a generic SaaS promise."
            description="These guided views show the core workflow: dispatch visibility, technician coordination, and cleaner closeout communication."
          />

          <div className="mt-14 grid gap-6 lg:grid-cols-3">
            {proofCards.map((card) => (
              <SurfaceCard accent className="h-full p-4" key={card.title}>
                <div className="overflow-hidden rounded-[1.35rem] border border-slate-200 bg-slate-100">
                  <img alt={card.title} className="h-64 w-full object-cover" src={card.image} />
                </div>
                <div className="mt-5 px-2 pb-2">
                  <h3 className="text-xl font-semibold tracking-tight text-slate-950">{card.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{card.description}</p>
                </div>
              </SurfaceCard>
            ))}
          </div>
        </div>
      </section>

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

            <div className="grid gap-6">
              {workflow.map(({ icon: Icon, title, description }, index) => (
                <SurfaceCard accent className="grid gap-5 bg-slate-50 sm:grid-cols-[auto_1fr]" key={title}>
                  <div className="flex items-center gap-4">
                    <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-teal-700 shadow-sm">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-sm font-semibold text-slate-400 sm:hidden">Step {index + 1}</span>
                  </div>
                  <div>
                    <p className="hidden text-sm font-semibold uppercase tracking-[0.18em] text-slate-400 sm:block">Step {index + 1}</p>
                    <h3 className="mt-1 text-xl font-semibold text-slate-950">{title}</h3>
                    <p className="mt-2 text-sm leading-7 text-slate-600">{description}</p>
                  </div>
                </SurfaceCard>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-20" id="pricing">
        <div className="mx-auto max-w-7xl">
          <SectionEyebrow>Pricing</SectionEyebrow>
          <SectionHeading
            align="center"
            title="Straightforward plans for small HVAC teams"
            description="Pick the plan that fits your crew today, then grow into more visibility and process control as the business gets busier."
          />

          <div className="mt-14 grid gap-6 lg:grid-cols-3">
            {plans.map((plan) => (
              <SurfaceCard accent className={plan.featured ? "h-full bg-[linear-gradient(180deg,#0d6f67_0%,#0b5f58_100%)] text-white" : "h-full"} key={plan.name}>
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-semibold">{plan.name}</h3>
                  {plan.featured ? <StatusPill tone="warm">Popular</StatusPill> : null}
                </div>
                <div className="mt-6">
                  <span className="text-5xl font-semibold tracking-tight">{plan.price}</span>
                  <span className={plan.featured ? "ml-2 text-sm text-teal-50" : "ml-2 text-sm text-slate-500"}>/ month</span>
                </div>
                <p className={plan.featured ? "mt-3 text-sm text-teal-50" : "mt-3 text-sm text-slate-500"}>{plan.detail}</p>

                <ul className="mt-8 space-y-3">
                  {plan.features.map((feature) => (
                    <li className="flex items-start gap-3 text-sm" key={feature}>
                      <CheckCircle2 className={plan.featured ? "mt-0.5 h-4 w-4 shrink-0 text-white" : "mt-0.5 h-4 w-4 shrink-0 text-teal-700"} />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link className={plan.featured ? "mt-8 inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-teal-800 transition hover:bg-slate-100" : "mt-8 inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"} href="/demo">
                  Talk to Sales
                </Link>
              </SurfaceCard>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 pb-24 pt-8">
        <div className="mx-auto grid max-w-7xl gap-10 overflow-hidden rounded-[2.6rem] bg-[linear-gradient(135deg,#0b2235_0%,#102f47_55%,#081b2a_100%)] px-8 py-10 text-white shadow-[var(--shadow-lg)] lg:grid-cols-[1fr_0.92fr] lg:items-center lg:px-12">
          <div>
            <SectionEyebrow inverse>Ready To Move Faster?</SectionEyebrow>
            <h2 className="mt-4 max-w-2xl text-4xl font-semibold tracking-tight">Stop running dispatch through scattered texts, callbacks, and sticky-note memory.</h2>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-300">
              Get a focused walkthrough of how SwiftDispatch can tighten response times, reduce coordination drag, and help your team close jobs with more consistency.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link className="inline-flex items-center justify-center rounded-full bg-orange-400 px-7 py-3.5 text-base font-semibold text-slate-950 transition hover:bg-orange-300" href="/demo">
                Schedule a Demo
              </Link>
              <Link className="inline-flex items-center justify-center rounded-full border border-white/18 px-7 py-3.5 text-base font-semibold text-white transition hover:bg-white/10" href="/login">
                Sign In
              </Link>
            </div>
          </div>

          <SurfaceCard dark className="bg-white/5 p-4">
            <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/5 p-2">
              <img alt="SwiftDispatch mobile workflow preview" className="rounded-[1.2rem] object-cover" src="/images/landing-mobile.jpg" />
            </div>
            <div className="mt-4 flex items-center gap-3 text-sm text-slate-300">
              <ClipboardList className="h-4 w-4 text-teal-300" />
              Dispatch, technician updates, and quote communication in one workflow.
            </div>
          </SurfaceCard>
        </div>
      </section>
    </main>
  );
}