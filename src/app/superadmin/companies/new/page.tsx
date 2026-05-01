import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireSuperAdminProfile } from '@/lib/auth'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

async function createCompany(formData: FormData) {
  'use server'
  const name = String(formData.get('name') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim() || null
  const phone = String(formData.get('phone') ?? '').trim() || null
  const slug = String(formData.get('slug') ?? '').trim() || null

  if (!name) return

  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('companies')
    .insert({ name, email, phone, slug })
    .select('id')
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Failed to create company')
  redirect(`/superadmin/companies/${data.id}`)
}

export default async function NewCompanyPage() {
  await requireSuperAdminProfile()

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-lg">
        <div className="mb-6 flex items-center gap-2 text-sm">
          <Link href="/superadmin" className="text-teal-700 hover:underline">Platform</Link>
          <span className="text-slate-400">/</span>
          <span className="text-slate-700 font-medium">New company</span>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="mb-5 text-xl font-semibold text-slate-900">Create company</h1>
          <form action={createCompany} className="grid gap-4">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Company name *</span>
              <input name="name" required className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Slug (for intake form URL)</span>
              <input name="slug" placeholder="e.g. cool-air-hvac" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Email</span>
              <input name="email" type="email" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Phone</span>
              <input name="phone" type="tel" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </label>
            <button type="submit" className="mt-2 rounded-md bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800">
              Create company
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
