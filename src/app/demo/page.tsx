import { ArrowRight, CalendarDays, ClipboardList, MessageSquareText } from "lucide-react";
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
    description: "Especially strong for owner-operators and office managers who are trying to tighten dispatch and follow-through as volume grows.",
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

export default function DemoPage() {
  return (
    <main>
      <section className="px-6 pb-16 pt-16 sm:pt-20">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.88fr_1.12fr] lg:items-start">
          <div>
            <StatusPill tone="warm">Request a Demo</StatusPill>
            <h1 className="mt-5 max-w-2xl text-5xl font-semibold tracking-tight text-slate-950 sm:text-6xl">
              Show us the dispatch mess. We will show you the cleaner version.
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

      <section className="px-6 pb-24">
        <div className="mx-auto grid max-w-7xl gap-8 rounded-[2.6rem] bg-[linear-gradient(135deg,#0b2235_0%,#102f47_58%,#081b2a_100%)] px-8 py-10 text-white shadow-[var(--shadow-lg)] lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:px-12">
          <div>
            <SectionEyebrow inverse>What We Will Cover</SectionEyebrow>
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
              <p className="mt-3 text-sm leading-7 text-slate-300">How jobs come in, who assigns them, and where updates usually start falling apart.</p>
            </SurfaceCard>
            <SurfaceCard dark className="bg-white/5">
              <div className="flex items-center gap-3 text-teal-300">
                <MessageSquareText className="h-5 w-5" />
                <span className="text-sm font-semibold uppercase tracking-[0.16em]">Customer and tech communication</span>
              </div>
              <p className="mt-3 text-sm leading-7 text-slate-300">What the technician sees, what the customer receives, and how quote approvals can move faster.</p>
            </SurfaceCard>
            <SurfaceCard dark className="bg-white/5">
              <div className="flex items-center gap-3 text-teal-300">
                <CalendarDays className="h-5 w-5" />
                <span className="text-sm font-semibold uppercase tracking-[0.16em]">Next-step fit check</span>
              </div>
              <p className="mt-3 text-sm leading-7 text-slate-300">Whether the right next move is a pilot, more product fit work, or simply revisiting when timing is better.</p>
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