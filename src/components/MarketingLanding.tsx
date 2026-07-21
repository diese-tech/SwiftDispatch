import Link from "next/link";
import { ArrowRight, Check, FileCheck, PhoneCall, Route } from "lucide-react";
import BrandMark from "@/components/BrandMark";
import Reveal from "@/components/Reveal";

const routeEvents = [
  { time: "08:42", title: "New emergency call", detail: "14 Pine Street · No heat" },
  { time: "08:46", title: "Marcus assigned", detail: "12 min away · Customer notified", active: true },
  { time: "09:31", title: "Quote sent", detail: "$486 · Awaiting approval" },
];

const workflow = [
  {
    icon: PhoneCall,
    title: "A customer calls",
    description: "Capture the problem, urgency, consent, and address without retyping it later.",
  },
  {
    icon: Route,
    title: "Dispatch sees the whole field",
    description: "Availability and active work stay visible before the assignment is made.",
  },
  {
    icon: FileCheck,
    title: "The quote comes back approved",
    description: "Customers review and approve from their phone while the job keeps moving.",
  },
];

const boardColumns = [
  { label: "New", dot: "bg-zinc-400", age: "8m", customer: "Sarah Chen", issue: "Furnace not heating", status: "Unassigned" },
  { label: "Assigned", dot: "bg-[var(--c-signal)]", age: "21m", customer: "Marcus Rivera", issue: "System not cooling", status: "Assigned" },
  { label: "En route", dot: "bg-[var(--warm)]", age: "1h 12m", customer: "Lisa Park", issue: "Heat pump failure", status: "En route" },
];

export default function MarketingLanding() {
  return (
    <main id="top">
      <section className="overflow-hidden bg-white">
        <div className="relative mx-auto grid min-h-[680px] max-w-7xl gap-16 px-6 py-24 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:gap-24">
          <div aria-hidden="true" className="absolute inset-y-0 left-[53%] hidden w-0.5 bg-zinc-200 lg:block">
            <span className="absolute inset-x-0 top-0 h-[54%] bg-[var(--c-signal)]" />
            <span className="absolute left-1/2 top-[20%] h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-[var(--c-signal)] bg-white" />
            <span className="absolute left-1/2 top-[54%] h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-[var(--c-signal)] bg-[var(--c-signal)] shadow-[0_0_0_8px_var(--c-signal-w)]" />
            <span className="absolute left-1/2 top-[84%] h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-zinc-200 bg-white" />
          </div>

          <div className="relative z-10">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.12em] text-[var(--c-signal)]">From ring to resolution</p>
            <h1 className="mt-4 max-w-3xl text-[clamp(3.25rem,6vw,5.25rem)] font-extrabold leading-[0.95] tracking-[-0.055em] text-[var(--navy)]">
              Your fastest route through a busy dispatch day.
            </h1>
            <p className="mt-8 max-w-xl text-xl leading-8 text-zinc-500">
              SwiftDispatch turns scattered calls, texts, and whiteboards into one visible path your whole team can follow.
            </p>
            <div className="mt-8 flex flex-col items-start gap-6 sm:flex-row sm:items-center">
              <Link className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[var(--c-signal)] px-6 font-bold text-white shadow-[0_12px_28px_rgb(17_85_245_/_22%)] transition hover:-translate-y-1 hover:bg-[var(--c-signal-hover)] focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-[var(--c-signal)]" href="#workflow">
                Walk through the workflow <ArrowRight className="h-4 w-4" />
              </Link>
              <Link className="brand-link font-bold text-[var(--navy)]" href="#fit">See if it fits your team</Link>
            </div>
          </div>

          <ol className="relative z-10 grid list-none gap-3.5 p-0">
            {routeEvents.map((event) => (
              <li className={`grid grid-cols-[58px_16px_1fr] items-center gap-4 rounded-xl border bg-white/95 p-5 ${event.active ? "border-[var(--c-signal)] shadow-[var(--shadow-lg)] lg:translate-x-5" : "border-zinc-200"}`} key={event.time}>
                <time className="font-mono text-xs text-zinc-500">{event.time}</time>
                <span aria-hidden="true" className={`h-3 w-3 rounded-full border-[3px] border-[var(--c-signal)] ${event.active ? "bg-[var(--c-signal)] shadow-[0_0_0_6px_var(--c-signal-w)]" : ""}`} />
                <span className="grid gap-1"><strong className="text-[17px] text-[var(--navy)]">{event.title}</strong><span className="text-[13px] text-zinc-500">{event.detail}</span></span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-[#f3f6fc] px-6 py-28" id="workflow">
        <div className="mx-auto grid max-w-7xl gap-16 lg:grid-cols-[0.8fr_1.2fr] lg:gap-28">
          <Reveal>
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.12em] text-[var(--c-signal)]">The signal path</p>
            <h2 className="mt-4 text-[clamp(2.25rem,4vw,3.5rem)] font-extrabold leading-none tracking-[-0.04em] text-[var(--navy)]">Nothing important gets lost between the office and the field.</h2>
            <p className="mt-6 text-lg text-zinc-500">One continuous record replaces the handoff gaps that create callbacks and confusion.</p>
          </Reveal>
          <ol className="grid list-none p-0">
            {workflow.map(({ icon: Icon, title, description }, index) => (
              <Reveal as="li" className="grid grid-cols-[48px_1fr_auto] gap-x-6 gap-y-2 border-t border-zinc-200 py-9 last:border-b" delay={index * 100} key={title}>
                <span className="row-span-2 font-mono text-sm text-[var(--c-signal)]">0{index + 1}</span>
                <h3 className="m-0 text-2xl font-bold text-[var(--navy)]">{title}</h3>
                <p className="m-0 max-w-xl text-zinc-500">{description}</p>
                <span aria-hidden="true" className="row-span-2 row-start-1 hidden h-12 w-12 place-items-center rounded-full bg-[var(--c-signal-w)] text-[var(--c-signal)] sm:grid sm:col-start-3"><Icon className="h-5 w-5" /></span>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-white px-6 py-28" id="product">
        <div className="mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-[0.7fr_1.3fr] lg:gap-20">
          <Reveal>
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.12em] text-[var(--c-signal)]">One operating picture</p>
            <h2 className="mt-4 text-[clamp(2.25rem,4vw,3.5rem)] font-extrabold leading-none tracking-[-0.04em] text-[var(--navy)]">See what changed—and what needs you.</h2>
            <p className="mt-6 text-lg text-zinc-500">The live board keeps urgency, ownership, and job context visible without turning dispatch into data entry.</p>
            <ul className="mt-8 grid list-none gap-4 p-0 font-semibold">
              {["Persistent lane names and job counts", "Clear assignment and status history", "Office, field, and customer updates together"].map((item) => <li className="flex items-center gap-3" key={item}><Check className="h-4 w-4 text-green-700" />{item}</li>)}
            </ul>
          </Reveal>

          <Reveal className="overflow-hidden rounded-xl border border-zinc-200 bg-white p-4 shadow-[var(--shadow-lg)] sm:p-6" delay={150}>
            <div className="mb-5 flex items-center justify-between">
              <div><span className="font-mono text-[10px] uppercase tracking-[0.08em] text-zinc-500">Live workspace</span><h3 className="mt-1 text-xl font-bold text-[var(--navy)]">Dispatch overview</h3></div>
              <span className="rounded-full bg-green-50 px-2.5 py-1 font-mono text-[11px] text-green-700">Live</span>
            </div>
            <div className="grid grid-cols-3 overflow-hidden rounded-lg border border-zinc-200">
              {[["Open jobs", "5"], ["Unassigned", "2"], ["En route", "1"]].map(([label, value]) => <div className="grid gap-1 border-r border-zinc-200 p-3 last:border-r-0 sm:p-4" key={label}><span className="font-mono text-[9px] uppercase tracking-wide text-zinc-500 sm:text-[10px]">{label}</span><strong className="text-2xl text-[var(--navy)]">{value}</strong></div>)}
            </div>
            <div className="mt-3 grid snap-x grid-cols-[repeat(3,minmax(190px,1fr))] gap-2.5 overflow-x-auto pb-2">
              {boardColumns.map((column) => <section className="snap-start rounded-lg bg-zinc-100 p-3" key={column.label}><h4 className="mb-2.5 flex items-center gap-2 font-mono text-[10px] uppercase tracking-wide text-zinc-500"><span className={`h-2 w-2 rounded-full ${column.dot}`} />{column.label}</h4><article className="grid min-h-36 gap-1.5 rounded-lg border border-zinc-200 bg-white p-4"><time className="font-mono text-[10px] text-zinc-500">{column.age}</time><strong className="text-sm text-[var(--navy)]">{column.customer}</strong><span className="text-xs text-zinc-500">{column.issue}</span><span className="self-end text-xs text-zinc-500">{column.status}</span></article></section>)}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="bg-[var(--navy)] px-6 py-28 text-white" id="fit">
        <div className="mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-[1fr_0.8fr] lg:gap-24">
          <Reveal>
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.12em]">Purpose-built fit</p>
            <h2 className="mt-4 text-[clamp(2.25rem,4vw,3.5rem)] font-extrabold leading-none tracking-[-0.04em]">Enough structure to stay in control. Not another enterprise rollout.</h2>
            <ul className="mt-8 grid list-none gap-4 p-0 font-semibold">{["3–15 technicians", "Emergency and same-day service", "Office-to-field coordination"].map((item) => <li className="flex items-center gap-3" key={item}><Check className="h-4 w-4 text-green-400" />{item}</li>)}</ul>
          </Reveal>
          <Reveal as="figure" className="m-0 rounded-l-lg border-l-[6px] border-[var(--c-signal)] bg-[#b6b2a5] p-7 text-[var(--navy)] sm:p-10" delay={150}>
            <blockquote className="m-0 text-[clamp(1.5rem,3vw,2.25rem)] font-semibold leading-[1.15] tracking-[-0.025em]">“The value isn’t another dashboard. It’s knowing the next call won’t derail everything already in motion.”</blockquote>
            <figcaption className="mt-6 font-mono text-sm font-bold uppercase tracking-[0.1em] text-zinc-950">The SwiftDispatch promise</figcaption>
          </Reveal>
        </div>
      </section>

      <section className="bg-[var(--c-signal-w)] px-6 py-20" id="demo">
        <div className="mx-auto grid max-w-7xl items-center gap-8 sm:grid-cols-[96px_1fr] lg:grid-cols-[120px_1fr_auto] lg:gap-12">
          <Reveal><BrandMark size="sm" /></Reveal>
          <Reveal delay={100}><p className="font-mono text-xs font-semibold uppercase tracking-[0.12em] text-[var(--navy)]">Ready to see the full path?</p><h2 className="mt-3 max-w-2xl text-[clamp(2rem,4vw,3rem)] font-extrabold leading-none tracking-[-0.04em] text-[var(--navy)]">Bring one real dispatch scenario. We’ll map it together.</h2></Reveal>
          <Reveal className="sm:col-start-2 lg:col-start-auto" delay={200}><Link className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--warm)] px-6 font-bold text-[var(--navy)] shadow-[0_12px_28px_rgb(240_138_36_/_24%)] transition hover:-translate-y-1 hover:bg-orange-500 focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-[var(--c-signal)]" href="/demo">Book a demo <ArrowRight className="h-4 w-4" /></Link></Reveal>
        </div>
      </section>
    </main>
  );
}
