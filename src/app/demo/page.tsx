import { ArrowRight, CalendarDays, CheckCircle2, ClipboardList, MessageSquareText, ShieldCheck, XCircle } from "lucide-react";
import DemoRequestForm from "@/components/DemoRequestForm";
import { SectionEyebrow, SectionHeading, SurfaceCard, StatusPill } from "@/components/DesignSystem";

const demoHighlights = [
  "See the dispatch board, quote flow, and technician communication loop in one walkthrough.",
  "Talk through your current operating mess and where callbacks, whiteboards, or spreadsheets are slowing the team down.",
  "Leave with a clear sense of whether SwiftDispatch fits your team right now or later.",
];

const fitCards = [
  {
    title: "Best for small HVAC teams",
    description: "Especially strong for owner-operators and office managers running 3 to 15 technicians and feeling the strain of more job volume.",
  },
  {
    title: "Built around real job flow",
    description: "Jobs move from intake to dispatch to field updates to quote approval without everyone bouncing between disconnected tools.",
  },
  {
    title: "Simple technician adoption",
    description: "Field techs can stay responsive from their phones without a complicated app rollout becoming another project to manage.",
  },
];

const bestFit = [
  "You are dispatching by calls, texts, spreadsheets, or a whiteboard.",
  "You want cleaner office-to-field coordination without enterprise complexity.",
  "You care about quote follow-through and customer communication, not just job assignment.",
];

const notFit = [
  "You need a huge enterprise rollout with deep multi-branch customization on day one.",
  "Your team already has a tightly adopted dispatch and quote workflow that everyone likes.",
  "You are looking for a generic field-service platform without a strong HVAC workflow bias.",
];

const nextSteps = [
  "We review your current workflow and pressure points.",
  "We show the dispatch board, field loop, and quote flow against that reality.",
  "We decide whether the next move is a pilot, a later revisit, or no fit right now.",
];

export default function DemoPage() {
  return (
    <main>
      <section className="px-6 pb-16 pt-16 sm:pt-20">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.88fr_1.12fr] lg:items-start">
          <div>
            <StatusPill tone="warm">Request a Demo</StatusPill>
            <h1 className="mt-5 max-w-2xl text-5xl font-semibold tracking-tight text-slate-950 sm:text-6xl">
              Built for HVAC operators who are tired of running dispatch from memory.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              This intake is intentionally lightweight, but it still gives enough context to make the walkthrough useful instead of generic.
            </p>

            <div className="mt-8 grid gap-4">
              {demoHighlights.map((item, index) => (
                <SurfaceCard accent className="p-4" key={item}>
                  <div className="flex items-start gap-4">
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-950 text-sm font-semibold text-white">0{index + 1}</span>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Demo step</p>
                      <p className="mt-2 text-sm leading-7 text-slate-700">{item}</p>
                    </div>
                  </div>
                </SurfaceCard>
              ))}
            </div>
          </div>

          <SurfaceCard accent className="p-6 sm:p-8">
            <div className="mb-6 flex items-center justify-between gap-3">
              <div>
                <SectionEyebrow>Demo Intake</SectionEyebrow>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Tell us about your operation</h2>
              </div>
              <StatusPill tone="teal">Step 1 of 3</StatusPill>
            </div>
            <p className="mb-6 text-sm leading-7 text-slate-500">
              The request is sent through your email app for now, so there is no extra backend or CRM wiring to manage during this phase.
            </p>
            <DemoRequestForm />
          </SurfaceCard>
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <SectionEyebrow>Good Fit</SectionEyebrow>
          <SectionHeading
            title="The fastest sales process is clarity about who this is for."
            description="This product is meant for HVAC operators who want a more controlled job flow, not teams looking for another generic software layer."
          />
          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {fitCards.map((card) => (
              <SurfaceCard accent className="h-full" key={card.title}>
                <h3 className="text-2xl font-semibold tracking-tight text-slate-950">{card.title}</h3>
                <p className="mt-4 text-sm leading-7 text-slate-600">{card.description}</p>
              </SurfaceCard>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-6 lg:grid-cols-2">
            <SurfaceCard accent className="h-full">
              <div className="flex items-center gap-3 text-teal-700">
                <ShieldCheck className="h-5 w-5" />
                <p className="text-sm font-semibold uppercase tracking-[0.16em]">Best fit</p>
              </div>
              <div className="mt-5 space-y-4">
                {bestFit.map((item) => (
                  <div className="flex items-start gap-3" key={item}>
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-teal-700" />
                    <p className="text-sm leading-7 text-slate-700">{item}</p>
                  </div>
                ))}
              </div>
            </SurfaceCard>

            <SurfaceCard accent className="h-full">
              <div className="flex items-center gap-3 text-orange-600">
                <XCircle className="h-5 w-5" />
                <p className="text-sm font-semibold uppercase tracking-[0.16em]">Probably not a fit</p>
              </div>
              <div className="mt-5 space-y-4">
                {notFit.map((item) => (
                  <div className="flex items-start gap-3" key={item}>
                    <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-orange-500" />
                    <p className="text-sm leading-7 text-slate-700">{item}</p>
                  </div>
                ))}
              </div>
            </SurfaceCard>
          </div>
        </div>
      </section>

      <section className="px-6 pb-24">
        <div className="mx-auto grid max-w-7xl gap-8 rounded-[2.6rem] bg-[linear-gradient(135deg,#0b2235_0%,#102f47_58%,#081b2a_100%)] px-8 py-10 text-white shadow-[var(--shadow-lg)] lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:px-12">
          <div>
            <SectionEyebrow inverse>What Happens Next</SectionEyebrow>
            <SectionHeading
              inverse
              title="A focused walkthrough, not a vague sales call."
              description="The goal is to map SwiftDispatch against the way you already run the business and show where it can remove coordination drag first."
            />
          </div>
          <div className="grid gap-4">
            <SurfaceCard dark className="bg-white/5">
              <div className="flex items-center gap-3 text-teal-300">
                <ClipboardList className="h-5 w-5" />
                <span className="text-sm font-semibold uppercase tracking-[0.16em]">Dispatch review</span>
              </div>
              <p className="mt-3 text-sm leading-7 text-slate-300">{nextSteps[0]}</p>
            </SurfaceCard>
            <SurfaceCard dark className="bg-white/5">
              <div className="flex items-center gap-3 text-teal-300">
                <MessageSquareText className="h-5 w-5" />
                <span className="text-sm font-semibold uppercase tracking-[0.16em]">Workflow walkthrough</span>
              </div>
              <p className="mt-3 text-sm leading-7 text-slate-300">{nextSteps[1]}</p>
            </SurfaceCard>
            <SurfaceCard dark className="bg-white/5">
              <div className="flex items-center gap-3 text-teal-300">
                <CalendarDays className="h-5 w-5" />
                <span className="text-sm font-semibold uppercase tracking-[0.16em]">Fit decision</span>
              </div>
              <p className="mt-3 text-sm leading-7 text-slate-300">{nextSteps[2]}</p>
            </SurfaceCard>
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