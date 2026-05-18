import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BarChart3, FileCheck, LayoutGrid, MessageSquare, Smartphone } from "lucide-react";
import { SectionEyebrow, SectionHeading } from "@/components/DesignSystem";
import Reveal from "@/components/Reveal";

export const metadata: Metadata = {
  title: "Product",
  description: "See how SwiftDispatch works — the dispatch board, technician portal, quote builder, and SMS communication layer that keep small HVAC teams coordinated.",
  alternates: { canonical: "/product" },
};

const surfaces = [
  {
    icon: LayoutGrid,
    label: "For dispatchers",
    title: "The dispatch board",
    description:
      "A live Kanban board showing every active job, its current status, and which technician owns it. The dispatcher's command surface — one view, no chasing.",
    points: [
      "Columns map to your actual workflow: New, Assigned, En Route, In Progress, Quote Pending, Completed",
      "Drag a card to a different column to move the job forward — the technician gets notified automatically",
      "Each card shows the customer name, issue summary, address, and how long the job has been open",
      "Emergency jobs get a red left border so they stand out at a glance without cluttering the layout",
      "The board updates in real time — two dispatchers see the same state without refreshing",
    ],
    image: "/images/landing-dashboard.jpg",
  },
  {
    icon: Smartphone,
    label: "For field technicians",
    title: "The technician portal",
    description:
      "A mobile-optimized web portal that gives technicians exactly what they need in the field — their current assignment, customer details, and the ability to update job status without calling the office.",
    points: [
      "No app install required — technicians open a link on any phone browser",
      "Login uses a handle and PIN, not an email account the tech may not check",
      "Each job shows the customer name, phone, address, and issue description",
      "Status updates (En Route, Arrived, Completed) are one tap — the board updates instantly",
      "A secure token link from the assignment SMS takes the tech directly into their job",
    ],
    image: "/images/landing-mobile.jpg",
  },
  {
    icon: FileCheck,
    label: "For faster closeout",
    title: "Quote builder and approvals",
    description:
      "Build a quote while the technician is still on-site, send it by text, and get a response before the tech packs up. No follow-up call, no lost paperwork, no waiting.",
    points: [
      "Line-item quote builder inside the job detail — add parts, labor, and notes",
      "One click sends the quote to the customer as an SMS with a secure approval link",
      "The customer taps Approve or Decline — no account, no app, no friction",
      "The board shows the quote status in real time so the dispatcher knows when to follow up",
      "Accepted and rejected quotes are timestamped and kept in the job record",
    ],
    image: "/images/landing-hero.jpg",
  },
  {
    icon: MessageSquare,
    label: "For customers",
    title: "SMS communication layer",
    description:
      "Customers get a text at each stage of the job without the office making a single call. Dispatch confirmation, en route notification, and quote delivery all happen automatically.",
    points: [
      "Automated status texts fire when the technician updates the job — no manual send",
      "Messages go out under your own Twilio number, not a generic shared shortcode",
      "Quote approval is handled entirely by text — the customer never needs to log in anywhere",
      "SMS consent is collected at intake and stored server-side before any message is sent",
      "Delivery failures surface on the board so nothing goes silently undelivered",
    ],
    image: "/images/landing-mobile.jpg",
  },
];

const metrics = [
  { value: "3–15", label: "Technicians", detail: "The team size SwiftDispatch is built around" },
  { value: "< 60s", label: "Job creation", detail: "From call to active job on the board" },
  { value: "1 tap", label: "Quote approval", detail: "Customer approves from the SMS link" },
  { value: "0 apps", label: "For technicians", detail: "Portal runs in the phone browser" },
];

export default function ProductPage() {
  return (
    <main>
      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="px-6 pb-16 pt-16 sm:pt-20">
        <div className="mx-auto max-w-7xl">
          <SectionEyebrow>The Product</SectionEyebrow>
          <SectionHeading
            title="The operating layer your dispatch team actually uses."
            description="SwiftDispatch is not a platform you configure forever. It is a tight loop — intake arrives, dispatch assigns, the tech updates from the field, the customer approves the quote — and the office can see all of it without making a single call."
          />
          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <Link
              className="inline-flex items-center justify-center rounded-full bg-teal-700 px-7 py-3.5 text-base font-semibold !text-white transition hover:bg-teal-800"
              href="/demo"
            >
              See it live
            </Link>
            <Link
              className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-7 py-3.5 text-base font-semibold text-slate-800 transition hover:bg-slate-50"
              href="/how-it-works"
            >
              How the workflow runs
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Metrics strip ────────────────────────────────────────── */}
      <section className="border-y border-slate-100 bg-slate-50 px-6 py-8">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px bg-slate-200 overflow-hidden rounded-xl border border-slate-200 lg:grid-cols-4">
          {metrics.map(({ value, label, detail }) => (
            <div key={label} className="bg-white px-6 py-5">
              <p className="text-3xl font-semibold tracking-[-0.03em] text-slate-950">{value}</p>
              <p className="mt-1 text-sm font-medium text-slate-700">{label}</p>
              <p className="mt-1 font-mono text-[11px] text-slate-400">{detail}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Product surfaces ─────────────────────────────────────── */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-7xl space-y-6">
          {surfaces.map(({ icon: Icon, label, title, description, points, image }, index) => (
            <Reveal key={title} delay={index * 60}>
              <div className={`grid gap-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)] lg:grid-cols-2 ${index % 2 === 1 ? "lg:[&>*:first-child]:order-last" : ""}`}>
                <div className="p-8">
                  <div className="mb-4 inline-flex rounded-lg bg-teal-50 p-2.5 text-teal-700">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-teal-700">{label}</span>
                  <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">{title}</h2>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
                  <ul className="mt-6 space-y-3">
                    {points.map((point) => (
                      <li className="flex items-start gap-3 text-sm" key={point}>
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-600" />
                        <span className="leading-7 text-slate-700">{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="border-t border-slate-100 bg-slate-50 lg:border-l lg:border-t-0">
                  <img
                    alt={title}
                    className="h-full w-full object-cover"
                    src={image}
                  />
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Analytics callout ────────────────────────────────────── */}
      <section className="border-t border-slate-100 bg-slate-50 px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <Reveal>
            <div className="grid gap-8 rounded-xl border border-slate-200 bg-white p-8 shadow-[0_1px_3px_rgba(0,0,0,0.06)] lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <div className="mb-4 inline-flex rounded-lg bg-teal-50 p-2.5 text-teal-700">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-teal-700">For operators</span>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">Analytics without the spreadsheet work</h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                  Response time from intake to dispatch, quote sent rate, approval conversion, and revenue by period — all derived automatically from the data your team already generates. No export, no pivot table.
                </p>
              </div>
              <Link
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                href="/features#analytics"
              >
                See all features
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────── */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-2xl bg-[linear-gradient(135deg,#0b2235_0%,#102f47_55%,#081b2a_100%)] px-8 py-12 text-white shadow-[0_28px_80px_rgba(8,26,40,0.14)] lg:px-12">
          <SectionEyebrow inverse>Ready to see it?</SectionEyebrow>
          <h2 className="mt-4 max-w-2xl text-4xl font-semibold tracking-[-0.025em]">
            A 30-minute walkthrough will show you more than this page can.
          </h2>
          <p className="mt-4 max-w-xl text-lg leading-8 text-slate-300">
            We will walk through the exact workflow for your team size and tell you honestly whether SwiftDispatch is the right fit.
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
              href="/pricing"
            >
              View pricing
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
