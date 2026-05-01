import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import LoginForm from '@/components/LoginForm'

export default async function LoginPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data } = await supabase.from('users').select('role').eq('id', user.id).single()
    if (data?.role === 'super_admin') redirect('/superadmin')
    else if (data?.role === 'admin') redirect('/admin')
    else if (data?.role === 'technician') redirect('/tech')
    else redirect('/dispatch')
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <section className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-widest text-teal-700">SwiftDispatch</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Sign in</h1>
          <p className="mt-1 text-sm text-slate-500">Dispatcher and admin access.</p>
        </div>
        <LoginForm />
        <p className="mt-6 text-center text-sm text-slate-500">
          Technician?{' '}
          <a href="/tech/login" className="text-teal-700 hover:underline">Tech login</a>
        </p>
      </section>
    </main>
  )
}
