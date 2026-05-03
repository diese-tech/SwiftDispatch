import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  FileCheck,
  LayoutGrid,
  MessageSquare,
  PhoneCall,
  Send,
  Smartphone,
} from "lucide-react";

const features = [
  {
    icon: LayoutGrid,
    title: "Real-time Kanban dispatch",
    description:
      "See every open job, drag work to the right technician, and keep the whole team aligned without phone-tag.",
  },
  {
    icon: MessageSquare,
    title: "SMS-first technician workflow",
    description:
      "Technicians get one-tap status links instead of another app to install, learn, and forget to open.",
  },
  {
    icon: FileCheck,
    title: "Fast quote approval",
    description:
      "Send quotes by text, capture customer approval quickly, and keep revenue moving while the job is still hot.",
  },
  {
    icon: BarChart3,
    title: "Operational visibility",
    description:
      "Track response times, completion flow, quote acceptance, and revenue trends without stitching together spreadsheets.",
  },
];

const trustCards = [
  {
    eyebrow: "Built for",
    title: "Small HVAC teams that are outgrowing calls, texts, and memory.",
    description:
      "SwiftDispatch is aimed at the stage where jobs are increasing, coordination is getting messy, and the office needs one cleaner operating view.",
  },
  {
    eyebrow: "Designed for",
    title: "Dispatchers, admins, technicians, and customers in the same workflow.",
    description:
      "The system is not just a board for the office. It keeps the field team responsive and the customer loop moving too.",
  },
  {
    eyebrow: "Helps replace",
    title: "Whiteboards, callback chains, spreadsheet handoffs, and lost quote follow-up.",
    description:
      "The point is not more software for its own sake. It is less friction in the parts of the day that usually create confusion.",
  },
];

const workflow = [
  {
    icon: PhoneCall,
    title: "Call or intake request",
    description:
      "A customer call or form submission becomes an active job immediately.",
  },
  {
    icon: Send,
    title: "Dispatch and notify",
    description:
      "Assign the right technician and send status-ready updates out in seconds.",
  },
  {
    icon: Smartphone,
    title: "Close from the field",
    description:
      "The tech updates progress from their phone while the customer approves quotes by text.",
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
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <p className="mb-5 inline-flex rounded-full border border-teal-200 bg-teal-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-teal-800">
              HVAC Dispatch Platform
            </p>
            <h1 className="max-w-3xl text-5xl font-semibold tracking-tight text-slate-950 sm:text-6xl">
              Dispatch made simple when the day gets chaotic.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              Assign jobs, track technicians in real time, send quotes by SMS, and keep customers informed without duct-taping together calls, texts, and spreadsheets.
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <Link className="inline-flex items-center justify-center rounded-full bg-teal-700 px-7 py-3.5 text-base font-semibold text-white transition hover:bg-teal-800" href="/demo">
                Request a Demo
              </Link>
              <a className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-7 py-3.5 text-base font-semibold text-slate-800 transition hover:bg-slate-50" href="#pricing">
                See Pricing
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>

            <div className="mt-8 flex flex-col gap-3 text-sm text-slate-600 sm:flex-row sm:gap-6">
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-teal-700" />
                No extra app for technicians
              </span>
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-teal-700" />
                Quote approvals by text
              </span>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -left-6 top-10 h-32 w-32 rounded-full bg-teal-200/50 blur-3xl" />
            <div className="absolute -bottom-8 right-0 h-40 w-40 rounded-full bg-sky-200/50 blur-3xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-3 shadow-[0_24px_80px_rgba(15,23,42,0.14)]">
              <img alt="SwiftDispatch marketing hero" className="h-full w-full rounded-[1.4rem] object-cover" src="/images/landing-hero.jpg" />
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 pb-6" id="proof">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-[2.5rem] bg-slate-950 p-6 text-white shadow-[0_28px_90px_rgba(15,23,42,0.18)] sm:p-8 lg:p-10">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-teal-300">Why Teams Pay Attention</p>
              <h2 className="mt-4 text-4xl font-semibold tracking-tight">A tighter operating system for the part of HVAC work that usually turns into noise.</h2>
              <p className="mt-4 text-lg leading-8 text-slate-300">
                SwiftDispatch is strongest when the work is steady, the team is growing, and the old coordination habits are starting to cost time, clarity, and follow-through.
              </p>
            </div>

            <div className="mt-10 grid gap-5 lg:grid-cols-3">
              {trustCards.map((card, index) => (
                <article className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur-sm" key={card.title}>
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-teal-400 via-cyan-400 to-sky-400" />
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">0{index + 1} {card.eyebrow}</p>
                  <h3 className="mt-4 text-2xl font-semibold tracking-tight text-white">{card.title}</h3>
                  <p className="mt-4 text-sm leading-7 text-slate-300">{card.description}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-20" id="features">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-teal-700">Features</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">Everything your dispatch flow actually needs</h2>
            <p className="mt-4 text-lg text-slate-600">
              SwiftDispatch brings dispatch, communication, and visibility into one place so your team can move faster with less friction.
            </p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {features.map(({ icon: Icon, title, description }) => (
              <article className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-lg" key={title}>
                <div className="mb-5 inline-flex rounded-2xl bg-teal-50 p-3 text-teal-700">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-semibold text-slate-950">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
              </article>
            ))}
          </div>

          <div className="mt-14 overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-4 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
            <img alt="SwiftDispatch dashboard preview" className="w-full rounded-[1.4rem] object-cover" src="/images/landing-dashboard.jpg" />
          </div>
        </div>
      </section>

      <section className="bg-white px-6 py-20" id="workflow">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-teal-700">How It Works</p>
              <h2 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">From incoming call to completed job without the usual mess</h2>
              <p className="mt-4 text-lg leading-8 text-slate-600">
                SwiftDispatch helps your team respond faster, coordinate cleanly, and keep jobs moving without adding more operational overhead.
              </p>
            </div>

            <div className="grid gap-6">
              {workflow.map(({ icon: Icon, title, description }, index) => (
                <div className="grid gap-5 rounded-3xl border border-slate-200 bg-slate-50 p-6 sm:grid-cols-[auto_1fr]" key={title}>
                  <div className="flex items-center gap-4">
                    <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-teal-700 shadow-sm">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-sm font-semibold text-slate-400 sm:hidden">Step {index + 1}</span>
                  </div>
                  <div>
                    <p className="hidden text-sm font-semibold text-slate-400 sm:block">Step {index + 1}</p>
                    <h3 className="mt-1 text-xl font-semibold text-slate-950">{title}</h3>
                    <p className="mt-2 text-sm leading-7 text-slate-600">{description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-20" id="pricing">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-teal-700">Pricing</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">Straightforward plans for small HVAC teams</h2>
            <p className="mt-4 text-lg text-slate-600">
              Pick the plan that matches your crew size today, then grow into more automation as your operation gets busier.
            </p>
          </div>

          <div className="mt-14 grid gap-6 lg:grid-cols-3">
            {plans.map((plan) => (
              <article className={plan.featured ? "flex h-full flex-col rounded-[2rem] border border-teal-700 bg-teal-700 p-8 text-white shadow-[0_22px_70px_rgba(13,148,136,0.28)]" : "flex h-full flex-col rounded-[2rem] border border-slate-200 bg-white p-8 text-slate-900 shadow-sm"} key={plan.name}>
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-semibold">{plan.name}</h3>
                  {plan.featured ? <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]">Popular</span> : null}
                </div>

                <div className="mt-6">
                  <span className="text-5xl font-semibold tracking-tight">{plan.price}</span>
                  <span className={plan.featured ? "ml-2 text-sm text-teal-50" : "ml-2 text-sm text-slate-500"}>
                    / month
                  </span>
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
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 pb-24 pt-8">
        <div className="mx-auto grid max-w-7xl gap-10 overflow-hidden rounded-[2.5rem] bg-slate-950 px-8 py-10 text-white lg:grid-cols-[1fr_0.9fr] lg:items-center lg:px-12">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-teal-300">Ready To Move Faster?</p>
            <h2 className="mt-4 max-w-2xl text-4xl font-semibold tracking-tight">Stop running dispatch through scattered texts, callbacks, and sticky-note memory.</h2>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-300">
              Get a live look at how SwiftDispatch can tighten response times, reduce coordination drag, and help your team close jobs cleanly.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link className="inline-flex items-center justify-center rounded-full bg-teal-500 px-7 py-3.5 text-base font-semibold text-slate-950 transition hover:bg-teal-400" href="/demo">
                Schedule a Demo
              </Link>
              <Link className="inline-flex items-center justify-center rounded-full border border-white/20 px-7 py-3.5 text-base font-semibold text-white transition hover:bg-white/10" href="/login">
                Sign In
              </Link>
            </div>
          </div>

          <div className="overflow-hidden rounded-[1.8rem] border border-white/10 bg-white/5 p-3">
            <img alt="SwiftDispatch mobile workflow preview" className="w-full rounded-[1.2rem] object-cover" src="/images/landing-mobile.jpg" />
          </div>
        </div>
      </section>
    </main>
  );
}
