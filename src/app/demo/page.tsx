import { ArrowRight, CalendarDays, CheckCircle2, ClipboardList, MessageSquareText } from "lucide-react";
import DemoRequestForm from "@/components/DemoRequestForm";

const demoHighlights = [
  "See the dispatch board, quote flow, and customer communication loop in one walkthrough.",
  "Talk through your current process and where callbacks, whiteboards, and spreadsheets are slowing you down.",
  "Leave with a clear view of whether SwiftDispatch fits your team right now.",
];

const fitCards = [
  {
    title: "Best for small HVAC teams",
    description: "Especially strong for owner-operators and office managers juggling dispatch, updates, and approvals across a growing crew.",
  },
  {
    title: "Built around real job flow",
    description: "Jobs move from intake to dispatch to field updates to quote approval without everyone switching between disconnected tools.",
  },
  {
    title: "Simple technician adoption",
    description: "Technicians can stay responsive from their phones without needing a heavyweight app rollout to get started.",
  },
];

export default function DemoPage() {
  return (
    <main>
      <section className="px-6 pb-16 pt-16 sm:pt-20">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <p className="inline-flex rounded-full border border-teal-200 bg-teal-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-teal-800">
              Request a Demo
            </p>
            <h1 className="mt-5 max-w-2xl text-5xl font-semibold tracking-tight text-slate-950 sm:text-6xl">
              Show us your dispatch mess. We will show you the cleaner version.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              Use this page to send a structured demo request. It keeps the process lightweight for now while still giving us the details needed to make the walkthrough relevant.
            </p>

            <div className="mt-8 grid gap-4">
              {demoHighlights.map((item) => (
                <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm" key={item}>
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-teal-700" />
                  <p className="text-sm leading-7 text-slate-600">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:p-8">
            <div className="mb-6">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">Demo Intake</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Tell us about your operation</h2>
              <p className="mt-3 text-sm leading-7 text-slate-500">
                The request is sent through your email app, so there is no external form backend to manage yet.
              </p>
            </div>
            <DemoRequestForm />
          </section>
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-6 lg:grid-cols-3">
            {fitCards.map((card, index) => (
              <article className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm" key={card.title}>
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-teal-600 via-cyan-500 to-sky-500" />
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">0{index + 1}</p>
                <h3 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">{card.title}</h3>
                <p className="mt-4 text-sm leading-7 text-slate-600">{card.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 pb-24">
        <div className="mx-auto grid max-w-7xl gap-8 rounded-[2.5rem] bg-slate-950 px-8 py-10 text-white lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:px-12">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-teal-300">What We Will Cover</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-tight">A focused walkthrough, not a vague sales call.</h2>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-300">
              The goal is to map SwiftDispatch against the job flow you already run today and show where it can remove coordination drag first.
            </p>
          </div>

          <div className="grid gap-4">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <div className="flex items-center gap-3 text-teal-300">
                <ClipboardList className="h-5 w-5" />
                <span className="text-sm font-semibold uppercase tracking-[0.16em]">Dispatch Review</span>
              </div>
              <p className="mt-3 text-sm leading-7 text-slate-300">How jobs come in, who assigns them, and where updates currently get lost.</p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <div className="flex items-center gap-3 text-teal-300">
                <MessageSquareText className="h-5 w-5" />
                <span className="text-sm font-semibold uppercase tracking-[0.16em]">Customer & Tech Communication</span>
              </div>
              <p className="mt-3 text-sm leading-7 text-slate-300">What the technician sees, what the customer receives, and where quote approvals need to speed up.</p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <div className="flex items-center gap-3 text-teal-300">
                <CalendarDays className="h-5 w-5" />
                <span className="text-sm font-semibold uppercase tracking-[0.16em]">Next-Step Fit Check</span>
              </div>
              <p className="mt-3 text-sm leading-7 text-slate-300">Whether the right next move is a pilot, more product fit work, or simply staying in touch until timing is better.</p>
            </div>

            <a className="inline-flex items-center gap-2 self-start text-sm font-semibold text-white transition hover:text-teal-300" href="mailto:hello@swiftdispatch.app?subject=SwiftDispatch%20Demo%20Question">
              Prefer a direct email instead?
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
