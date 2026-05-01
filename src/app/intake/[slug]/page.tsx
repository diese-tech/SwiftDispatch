import { notFound } from 'next/navigation'
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
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-md">
        <div className="mb-8 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-teal-700">
            {typedCompany.name}
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
            Request HVAC Service
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Fill out the form below and we'll be in touch shortly.
          </p>
        </div>

        <IntakeForm company={typedCompany} />
      </div>
    </main>
  )
}
