import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  FileCheck,
  MapPin,
  MessageSquare,
  PhoneCall,
  Send,
  Smartphone,
  UserCheck,
} from "lucide-react";
import { SectionEyebrow, SectionHeading } from "@/components/DesignSystem";
import Reveal from "@/components/Reveal";

export const metadata: Metadata = {
  title: "How It Works",
  description: "Walk through the full SwiftDispatch job lifecycle — from intake to dispatch, field updates, quote approval, and closeout.",
  alternates: { canonical: "/how-it-works" },
};

const steps = [
  {
    icon: PhoneCall,
    number: "01",
    title: "A job enters the system",
    description:
      "Jobs arrive three ways — a phone call you create manually, a web form submission from your intake portal, or a direct entry by a dispatcher. All three land on the board immediately.",
    details: [
      "Manual entry: dispatcher fills in customer name, phone, address, and issue",
      "Intake form: customer submits a request directly — it becomes a job with no re-entry",
      "The new job appears in the New column instantly, visible to every dispatcher",
      "Emergency and urgent issues are flagged automatically based on the job description",
    ],
    tone: "neutral" as const,
  },
  {
    icon: UserCheck,
    number: "02",
    title: "The dispatcher assigns a technician",
    description:
      "The dispatcher picks the right technician for the job — based on location, availability, or skill — and assigns them directly from the board. The technician gets notified by SMS the moment the assignment is made.",
    details: [
      "Drag the job card to a technician, or use the dropdown inside the card",
      "The job moves to Assigned and the tech receives a text with the job details",
      "The SMS contains a secure link — one tap opens the tech's portal directly on the job",
      "The dispatcher sees the assignment reflected on the board in real time",
    ],
    tone: "blue" as const,
  },
  {
    icon: MapPin,
    number: "03",
    title: "The technician heads to the site",
    description:
      "When the technician is on their way, they tap En Route in their portal. The customer receives an automatic text. No call needed, no manual update from the office.",
    details: [
      "Technician opens the link from their assignment SMS — no login friction",
      "One tap updates the job to En Route and sends the customer a notification",
      "The board reflects the new status immediately for all dispatchers",
      "Customer text includes the technician's name so the customer knows who is coming",
    ],
    tone: "amber" as const,
  },
  {
    icon: Smartphone,
    number: "04",
    title: "The technician works the job",
    description:
      "The tech updates the job as they work — marking arrived, adding notes, requesting parts. Everything stays in the job record without a single call to the office.",
    details: [
      "Status moves to In Progress when the tech marks Arrived on site",
      "Notes added in the portal are visible to the dispatcher on the board immediately",
      "The full customer record is available — phone, address, prior job history",
      "If something changes (access issue, rescheduled), the tech updates it from the portal",
    ],
    tone: "amber" as const,
  },
  {
    icon: FileCheck,
    number: "05",
    title: "A quote goes out and comes back",
    description:
      "The dispatcher or technician builds a quote while still on site. It goes to the customer as an SMS with a secure approval link. Most customers respond within minutes.",
    details: [
      "Line-item quote builder: parts, labor, notes — no external tool needed",
      "One click sends the quote by SMS — no email thread, no PDF attachment",
      "Customer taps Approve or Decline on a secure page — no account required",
      "The board updates to Quote Pending while waiting, then reflects the response immediately",
    ],
    tone: "violet" as const,
  },
  {
    icon: CheckCircle2,
    number: "06",
    title: "The job closes and the record is complete",
    description:
      "When the work is done, the technician marks the job complete. The dispatcher sees it close on the board, the customer gets a completion text, and the full job record — status history, quote, notes — is preserved.",
    details: [
      "Technician marks Completed from the portal — the board moves the card to Completed",
      "Customer receives an automated completion confirmation by SMS",
      "The full job record is retained: technician, timestamps, notes, quote status",
      "Completed jobs feed directly into the analytics view — no manual data entry",
    ],
    tone: "green" as const,
  },
];

const toneColors: Record<string, string> = {
  neutral: "bg-slate-100 text-slate-600",
  blue: "bg-blue-50 text-blue-700",
  amber: "bg-amber-50 text-amber-700",
  violet: "bg-violet-50 text-violet-700",
  green: "bg-emerald-50 text-emerald-700",
};

const dotColors: Record<string, string> = {
  neutral: "bg-slate-400",
  blue: "bg-blue-500",
  amber: "bg-amber-600",
  violet: "bg-violet-600",
  green: "bg-emerald-600",
};

const roles = [
  {
    icon: ClipboardList,
    title: "What the dispatcher sees",
    points: [
      "Every job in one board — column, owner, and age at a glance",
      "New assignments update immediately — no refresh, no polling",
      "Quote status visible without opening the job",
      "Emergency jobs flagged with a red border so nothing gets missed",
    ],
  },
  {
    icon: Smartphone,
    title: "What the technician sees",
    points: [
      "Current assignment with customer details — address, phone, issue",
      "Simple status controls: En Route, Arrived, Completed",
      "Notes field for anything the office needs to know",
      "No app install, no account setup — just the link from the assignment SMS",
    ],
  },
  {
    icon: MessageSquare,
    title: "What the customer gets",
    points: [
      "A text when the job is dispatched — who is coming",
      "A text when the tech is en route — and when they have arrived",
      "A quote link when the diagnosis is done — one tap to approve",
      "A completion confirmation when the job closes",
    ],
  },
  {
    icon: Send,
    title: "What happens automatically",
    points: [
      "Customer notifications on every status change — no manual send",
      "Quote delivery by SMS when the dispatcher clicks Send",
      "Job record updated in real time as the tech works",
      "Analytics updated with every completed job — no data entry",
    ],
  },
];

export default function HowItWorksPage() {
  return (
    <main>
      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="px-6 pb-16 pt-16 sm:pt-20">
        <div className="mx-auto max-w-7xl">
          <SectionEyebrow>How It Works</SectionEyebrow>
          <SectionHeading
            title="From the first call to the closed job — in one flow."
            description="SwiftDispatch connects intake, dispatch, field, and closeout so none of those handoffs turn into a phone call, a lost note, or a missed follow-up. Here is what the workflow actually looks like."
          />
          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <Link
              className="inline-flex items-center justify-center rounded-full bg-teal-700 px-7 py-3.5 text-base font-semibold !text-white transition hover:bg-teal-800"
              href="/demo"
            >
              See it in a demo
            </Link>
            <Link
              className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-7 py-3.5 text-base font-semibold text-slate-800 transition hover:bg-slate-50"
              href="/product"
            >
              See the product surfaces
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Steps ────────────────────────────────────────────────── */}
      <section className="px-6 pb-24">
        <div className="mx-auto max-w-7xl">
          <div className="relative">
            <div className="absolute left-[19px] top-8 hidden h-[calc(100%-4rem)] w-px bg-slate-200 lg:block" />
            <div className="space-y-6">
              {steps.map(({ icon: Icon, number, title, description, details, tone }, index) => (
                <Reveal key={number} delay={index * 60}>
                  <div className="grid gap-6 lg:grid-cols-[40px_1fr]">
                    <div className="hidden lg:flex lg:flex-col lg:items-center lg:pt-6">
                      <div className={`relative z-10 grid h-10 w-10 place-items-center rounded-full ${toneColors[tone]}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
                      <div className="flex items-start gap-4">
                        <div className={`lg:hidden mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full ${toneColors[tone]}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-slate-400">{number}</span>
                            <span className={`h-1.5 w-1.5 rounded-full ${dotColors[tone]}`} />
                          </div>
                          <h2 className="mt-1.5 text-xl font-semibold tracking-tight text-slate-950">{title}</h2>
                          <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
                          <ul className="mt-5 grid gap-2 sm:grid-cols-2">
                            {details.map((detail) => (
                              <li className="flex items-start gap-2.5 text-sm" key={detail}>
                                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" />
                                <span className="leading-6 text-slate-700">{detail}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Role breakdown ───────────────────────────────────────── */}
      <section className="border-y border-slate-100 bg-slate-50 px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <SectionEyebrow>By role</SectionEyebrow>
          <SectionHeading
            title="Everyone sees what they need. Nothing they don't."
            description="The same workflow serves three different users — dispatcher, technician, and customer — without any of them needing to use the same interface."
          />
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {roles.map(({ icon: Icon, title, points }) => (
              <Reveal key={title}>
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                  <div className="mb-4 inline-flex rounded-lg bg-teal-50 p-2.5 text-teal-700">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-semibold tracking-tight text-slate-950">{title}</h3>
                  <ul className="mt-4 space-y-3">
                    {points.map((point) => (
                      <li className="flex items-start gap-3 text-sm" key={point}>
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-600" />
                        <span className="leading-7 text-slate-700">{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────── */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-2xl bg-[linear-gradient(135deg,#0b2235_0%,#102f47_55%,#081b2a_100%)] px-8 py-12 text-white shadow-[0_28px_80px_rgba(8,26,40,0.14)] lg:px-12">
          <SectionEyebrow inverse>See it live</SectionEyebrow>
          <h2 className="mt-4 max-w-2xl text-4xl font-semibold tracking-[-0.025em]">
            Watching it run is worth more than reading about it.
          </h2>
          <p className="mt-4 max-w-xl text-lg leading-8 text-slate-300">
            In a 30-minute demo we will walk through this exact flow for your team size and answer any questions about how it handles your specific setup.
          </p>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <Link
              className="inline-flex items-center justify-center rounded-full bg-orange-400 px-7 py-3.5 text-base font-semibold !text-slate-950 transition hover:bg-orange-300"
              href="/demo"
            >
              Book a Demo
            </Link>
            <Link
              className="inline-flex items-center justify-center rounded-full border border-white/20 px-7 py-3.5 text-base font-semibold !text-white transition hover:bg-white/10"
              href="/features"
            >
              See all features
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
