'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

export default function TechLoginPage() {
  const router = useRouter()
  const [handle, setHandle] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setLoading(true)

    const email = `${handle.trim().toLowerCase()}@internal.swiftdispatch.app`
    const supabase = createSupabaseBrowserClient()

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: pin,
    })

    setLoading(false)

    if (signInError) {
      setError('Invalid username or PIN')
      return
    }

    router.push('/tech')
    router.refresh()
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <section className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-widest text-teal-700">
            SwiftDispatch
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
            Technician Login
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Enter your username and 4-digit PIN.
          </p>
        </div>

        <form className="space-y-5" onSubmit={onSubmit}>
          <div>
            <label
              className="mb-1 block text-sm font-medium text-slate-700"
              htmlFor="handle"
            >
              Username
            </label>
            <input
              autoCapitalize="none"
              autoComplete="username"
              autoCorrect="off"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none transition focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
              id="handle"
              placeholder="e.g. johsmith"
              required
              type="text"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
            />
          </div>

          <div>
            <label
              className="mb-1 block text-sm font-medium text-slate-700"
              htmlFor="pin"
            >
              PIN
            </label>
            <input
              autoComplete="current-password"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base tracking-widest outline-none transition focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
              id="pin"
              inputMode="numeric"
              maxLength={4}
              minLength={4}
              pattern="\d{4}"
              placeholder="••••"
              required
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            />
          </div>

          {error ? (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {error}
            </p>
          ) : null}

          <button
            className="w-full rounded-lg bg-teal-700 px-4 py-3 text-base font-semibold text-white transition hover:bg-teal-800 disabled:opacity-60"
            disabled={loading}
            type="submit"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </section>
    </main>
  )
}
