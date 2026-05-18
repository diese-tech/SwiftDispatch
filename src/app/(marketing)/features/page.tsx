import type { Metadata } from "next";
import Link from "next/link";
import {
  BarChart3,
  CheckCircle2,
  ClipboardList,
  FileCheck,
  LayoutGrid,
  MessageSquare,
  Shield,
  Smartphone,
  Users,
} from "lucide-react";
import { SectionEyebrow, SectionHeading, SurfaceCard, StatusPill } from "@/components/DesignSystem";
import Reveal from "@/components/Reveal";

export const metadata: Metadata = {
  title: "Features",
  description: "Explore every feature in SwiftDispatch — dispatch board, SMS updates, quote approvals, technician portal, and operational analytics built for small HVAC teams.",
  alternates: { canonical: "/features" },
};

const pillars = [
  {
    icon: LayoutGrid,
    title: "Real-time dispatch board",
    tagline: "For the office and dispatchers",
    description:
      "A Kanban-style board showing every open job, its status, and which technician owns it. Drag to reassign, filter by status, and see the full picture without calling anyone.",
    details: [
      "Job columns: New, Assigned, En Route, In Progress, Quote Sent, Completed",
      "Drag-and-drop technician assignment",
      "Live status updates as technicians move jobs forward",
      "Board filtered by your company — no cross-tenant data",
    ],
  },
  {
    icon: Smartphone,
    title: "No-install technician portal",
    tagline: "For field technicians",
    description:
      "Technicians access their jobs through a mobile-optimized web portal. No app store, no MDM policy, no forcing a tool install on someone else's phone.",
    details: [
      "Secure login with handle and PIN — no email account required",
      "View assigned jobs and customer details",
      "Update job status from the field",
      "Add notes and request parts without calling the office",
    ],
  },
  {
    icon: MessageSquare,
    title: "SMS-first customer communication",
    tagline: "For keeping customers informed",
    description:
      "Customers get text updates at each stage of the job — dispatch, en route, and completion — without the office needing to make a single call.",
    details: [
      "Automated status texts triggered by technician updates",
      "Quote approval links sent by SMS",
      "Customer confirms or declines with one tap — no account needed",
      "Powered by Twilio with your own phone number",
    ],
  },
  {
    icon: FileCheck,
    title: "Quote builder and digital approvals",
    tagline: "For faster revenue closeout",
    description:
      "Build a quote while the technician is still on-site, send it by text, and let the customer approve before the tech packs up. No follow-up calls, no lost paperwork.",
    details: [
      "Line-item quote builder inside the job detail",
      "One-click send by SMS with a secure approval link",
      "Quote status updates live on the dispatch board",
      "Accepted and rejected quotes tracked with timestamps",
    ],
  },
  {
    icon: ClipboardList,
    title: "Customer intake portal",
    tagline: "For capturing requests without the phone tag",
    description:
      "A public-facing intake URL your customers can use to request service. Submissions become active jobs on the board immediately — no manual re-entry.",
    details: [
      "Embeddable or shareable intake link per company",
      "Captures name, phone, address, and issue description",
      "Rate-limited and validated at submission",
      "New jobs appear on the dispatch board instantly",
    ],
  },
  {
    icon: BarChart3,
    title: "Operational analytics",
    tagline: "For understanding performance",
    description:
      "See how your team is performing without stitching together spreadsheets. Response time, quote conversion, and revenue momentum in one view.",
    details: [
      "Average response time from intake to dispatch",
      "Quote sent rate and approval conversion",
      "Revenue by period and technician",
      "Job volume trends over time",
    ],
  },
  {
    icon: Users,
    title: "Role-based access",
    tagline: "For managing a mixed team",
    description:
      "Owners, dispatchers, and technicians each get the view and controls appropriate to their role. Nothing more, nothing less.",
    details: [
      "Admin role: full access including user management and settings",
      "Dispatcher role: board access, job management, quote sending",
      "Technician role: field portal only — no back-office access",
      "Role enforcement at the API layer, not just the UI",
    ],
  },
  {
    icon: Shield,
    title: "Built for multi-company operations",
    tagline: "For companies managing growth",
    description:
      "Every record is isolated to your company. Row-level security at the database layer ensures one tenant never sees another's data.",
    details: [
      "Supabase Row Level Security on every table",
      "Company ID enforced server-side on all reads and writes",
      "Separate technician pools, job boards, and customers per company",
      "Demo mode keeps sandbox data clearly separated from live jobs",
    ],
  },
];

export default function FeaturesPage() {
  return (
    <main>
      <section className="px-6 pb-16 pt-16 sm:pt-20">
        <div className="mx-auto max-w-7xl">
          <SectionEyebrow>Features</SectionEyebrow>
          <SectionHeading
            title="Everything your dispatch operation needs. Nothing it doesn't."
            description="SwiftDispatch is built around the real workflow of a 3 to 15 technician HVAC team — intake, dispatch, field updates, quotes, and closeout in one operating flow."
          />
          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <Link className="inline-flex items-center justify-center rounded-full bg-teal-700 px-7 py-3.5 text-base font-semibold !text-white transition hover:bg-teal-800" href="/demo">
              Request a Demo
            </Link>
            <Link className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-7 py-3.5 text-base font-semibold text-slate-800 transition hover:bg-slate-50" href="/pricing">
              View pricing
            </Link>
          </div>
        </div>
      </section>

      <section className="px-6 pb-24">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8">
            {pillars.map(({ icon: Icon, title, tagline, description, details }, index) => (
              <Reveal key={title} delay={index * 60}>
                <SurfaceCard accent className="grid gap-8 lg:grid-cols-[1fr_1.4fr]">
                  <div>
                    <div className="mb-5 inline-flex rounded-2xl bg-teal-50 p-3 text-teal-700">
                      <Icon className="h-6 w-6" />
                    </div>
                    <StatusPill tone="neutral">{tagline}</StatusPill>
                    <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">{title}</h2>
                    <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
                  </div>
                  <ul className="space-y-3 self-center">
                    {details.map((detail) => (
                      <li className="flex items-start gap-3" key={detail}>
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" />
                        <span className="text-sm leading-7 text-slate-700">{detail}</span>
                      </li>
                    ))}
                  </ul>
                </SurfaceCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 pb-24">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-[2.6rem] bg-[linear-gradient(135deg,#0b2235_0%,#102f47_58%,#081b2a_100%)] px-8 py-12 text-white shadow-[var(--shadow-lg)] lg:px-12">
          <SectionEyebrow inverse>Ready to see it in action?</SectionEyebrow>
          <h2 className="mt-4 max-w-2xl text-4xl font-semibold tracking-tight">
            A 30-minute walkthrough is worth more than any feature list.
          </h2>
          <p className="mt-4 max-w-xl text-lg leading-8 text-slate-300">
            Book a demo and we will walk through the exact workflow for your team size and current dispatch setup.
          </p>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <Link className="inline-flex items-center justify-center rounded-full bg-orange-400 px-7 py-3.5 text-base font-semibold !text-slate-950 transition hover:bg-orange-300" href="/demo">
              Book a Demo
            </Link>
            <Link className="inline-flex items-center justify-center rounded-full border border-white/18 px-7 py-3.5 text-base font-semibold !text-white transition hover:bg-white/10" href="/pricing">
              See pricing
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
