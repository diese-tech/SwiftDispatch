'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'
import { VALID_TRANSITIONS } from '@/lib/stateMachine'
import type { JobStatus } from '@/lib/stateMachine'

function canTransition(current: string, target: JobStatus): boolean {
  const transitions = VALID_TRANSITIONS[current as JobStatus]
  return Array.isArray(transitions) && transitions.includes(target)
}

export function SignOutButtonClient() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function handleSignOut() {
    startTransition(async () => {
      const supabase = createSupabaseBrowserClient()
      await supabase.auth.signOut()
      router.push('/tech/login')
      router.refresh()
    })
  }

  return (
    <button
      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
      disabled={pending}
      onClick={handleSignOut}
      type="button"
    >
      {pending ? 'Signing out…' : 'Sign out'}
    </button>
  )
}

export function TechJobActionsClient({
  jobId,
  status,
  hasAcceptedQuote,
}: {
  jobId: string
  status: string
  hasAcceptedQuote: boolean
}) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function postStatus(newStatus: JobStatus) {
    setError('')
    setLoading(newStatus)
    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError((data as { error?: string }).error ?? 'Something went wrong')
      } else {
        router.refresh()
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(null)
    }
  }

  const btnBase =
    'inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition disabled:opacity-40'
  const primaryCls = `${btnBase} bg-teal-700 text-white hover:bg-teal-800`
  const secondaryCls = `${btnBase} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`

  const enRouteEnabled = canTransition(status, 'en_route')
  const arrivedEnabled = canTransition(status, 'in_progress')
  // Build Quote — link button, enabled when status = 'in_progress'
  const buildQuoteEnabled = status === 'in_progress'
  // Mark Complete — enabled when status = 'quote_pending' AND accepted quote
  const markCompleteEnabled =
    canTransition(status, 'completed') && hasAcceptedQuote

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <button
          className={enRouteEnabled ? primaryCls : secondaryCls}
          disabled={!enRouteEnabled || loading !== null}
          onClick={() => postStatus('en_route')}
          type="button"
        >
          {loading === 'en_route' ? 'Updating…' : 'En Route'}
        </button>

        <button
          className={arrivedEnabled ? primaryCls : secondaryCls}
          disabled={!arrivedEnabled || loading !== null}
          onClick={() => postStatus('in_progress')}
          type="button"
        >
          {loading === 'in_progress' ? 'Updating…' : 'Arrived'}
        </button>

        {buildQuoteEnabled ? (
          <Link
            className={`${primaryCls} col-span-1`}
            href={`/tech/job/${jobId}`}
          >
            Build Quote
          </Link>
        ) : (
          <button
            className={secondaryCls}
            disabled
            type="button"
          >
            Build Quote
          </button>
        )}

        <button
          className={markCompleteEnabled ? primaryCls : secondaryCls}
          disabled={!markCompleteEnabled || loading !== null}
          onClick={() => postStatus('completed')}
          type="button"
        >
          {loading === 'completed' ? 'Updating…' : 'Mark Complete'}
        </button>
      </div>

      {error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  )
}
