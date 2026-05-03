import { notFound } from 'next/navigation'
import { SectionEyebrow, SurfaceCard } from '@/components/DesignSystem'
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
        <section className="overflow-hidden rounded-[2.2rem] border border-slate-200/80 bg-[linear-gradient(135deg,rgba(11,34,53,0.98)_0%,rgba(17,45,65,0.98)_56%,rgba(11,34,53,0.94)_100%)] px-6 py-8 text-white shadow-[var(--shadow-md)] sm:px-8 sm:py-10">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] lg:items-center">
            <div className="max-w-3xl">
              <SectionEyebrow inverse>{typedCompany.name}</SectionEyebrow>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
                Request HVAC service without the back-and-forth.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                Tell us what is happening, how urgent it feels, and where the work needs to happen. The office gets the full request in one clean intake instead of piecing it together from texts and voicemail.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
              <SurfaceCard dark accent className="p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-300">
                  Step 1
                </p>
                <p className="mt-3 text-lg font-semibold text-white">Share the issue</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Give the team the problem, property address, and best callback number.
                </p>
              </SurfaceCard>
              <SurfaceCard dark className="p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-300">
                  Step 2
                </p>
                <p className="mt-3 text-lg font-semibold text-white">Get routed fast</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Your urgency selection helps dispatch triage emergencies versus scheduled work.
                </p>
              </SurfaceCard>
              <SurfaceCard dark className="p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-300">
                  Step 3
                </p>
                <p className="mt-3 text-lg font-semibold text-white">Track the request</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Once submitted, you get a reference number and a status tracking link.
                </p>
              </SurfaceCard>
            </div>
          </div>
        </section>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(360px,0.72fr)]">
          <IntakeForm company={typedCompany} />

          <div className="space-y-6">
            <SurfaceCard accent className="p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Before you submit
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
                The details that help the office move quickly
              </h2>
              <ul className="mt-5 space-y-3 text-sm leading-6 text-slate-600">
                <li className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                  Include the clearest callback number in case dispatch needs a gate code, unit number, or arrival note.
                </li>
                <li className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                  Describe symptoms plainly: no cool air, unusual noise, thermostat issue, leak, or no power.
                </li>
                <li className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                  Mark emergency only for urgent comfort or safety issues that truly need immediate routing.
                </li>
              </ul>
            </SurfaceCard>

            <SurfaceCard className="p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                What happens next
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
                A cleaner handoff into dispatch
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Your request is turned into a structured job for the office team. They can route the call, assign a technician, and follow status without re-entering the same customer details by hand.
              </p>
            </SurfaceCard>
          </div>
        </div>
      </div>
    </main>
  )
}
