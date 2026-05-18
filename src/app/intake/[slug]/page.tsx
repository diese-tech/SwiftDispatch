import { notFound } from 'next/navigation'
import { SectionEyebrow } from '@/components/DesignSystem'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import IntakeForm from './IntakeForm'

type Company = {
  id: string
  name: string
  slug: string
}

export default async function IntakePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = createSupabaseAdminClient()

  const { data: company, error } = await supabase
    .from('companies')
    .select('id, name, slug')
    .eq('slug', slug)
    .single()

  if (error || !company) {
    notFound()
  }

  const typedCompany = company as Company

  return (
    <main className="min-h-screen px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <section className="overflow-hidden rounded-xl border border-white/10 bg-[linear-gradient(135deg,#0b2235_0%,#102f47_58%,#081b2a_100%)] px-6 py-8 shadow-[var(--shadow-md)] sm:px-8 sm:py-10">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] lg:items-center">
            <div className="max-w-3xl">
              <SectionEyebrow inverse>{typedCompany.name}</SectionEyebrow>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                Request HVAC service without the back-and-forth.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                Tell us what is happening, how urgent it feels, and where the work needs to happen. The office gets the full request in one clean intake instead of piecing it together from texts and voicemail.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
              {[
                { step: "Step 1", title: "Share the issue", body: "Give the team the problem, property address, and best callback number." },
                { step: "Step 2", title: "Get routed fast", body: "Your urgency selection helps dispatch triage emergencies versus scheduled work." },
                { step: "Step 3", title: "Track the request", body: "Once submitted, you get a reference number and a status tracking link." },
              ].map(({ step, title, body }) => (
                <div key={step} className="rounded-xl border border-white/10 bg-white/5 p-5">
                  <p className="font-mono text-[10.5px] uppercase tracking-[0.06em] text-teal-300">{step}</p>
                  <p className="mt-2 text-base font-semibold text-white">{title}</p>
                  <p className="mt-1.5 text-sm leading-6 text-slate-300">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(360px,0.72fr)]">
          <IntakeForm company={typedCompany} />

          <div className="space-y-5">
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <p className="font-mono text-[10.5px] uppercase tracking-[0.06em] text-slate-400">
                Before you submit
              </p>
              <h2 className="mt-3 text-xl font-semibold tracking-tight text-slate-950">
                The details that help the office move quickly
              </h2>
              <ul className="mt-5 space-y-2.5 text-sm leading-6 text-slate-600">
                <li className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  Include the clearest callback number in case dispatch needs a gate code, unit number, or arrival note.
                </li>
                <li className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  Describe symptoms plainly: no cool air, unusual noise, thermostat issue, leak, or no power.
                </li>
                <li className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  Mark emergency only for urgent comfort or safety issues that truly need immediate routing.
                </li>
              </ul>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <p className="font-mono text-[10.5px] uppercase tracking-[0.06em] text-slate-400">
                What happens next
              </p>
              <h2 className="mt-3 text-xl font-semibold tracking-tight text-slate-950">
                A cleaner handoff into dispatch
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Your request is turned into a structured job for the office team. They can route the call, assign a technician, and follow status without re-entering the same customer details by hand.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
