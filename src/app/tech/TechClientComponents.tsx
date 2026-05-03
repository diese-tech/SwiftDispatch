'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import type { JobStatus } from '@/lib/stateMachine'
import { VALID_TRANSITIONS } from '@/lib/stateMachine'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

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
      className="inline-flex items-center justify-center rounded-full border border-white/14 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15 disabled:opacity-60"
      disabled={pending}
      onClick={handleSignOut}
      type="button"
    >
      {pending ? 'Signing out...' : 'Sign out'}
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
    'inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40'
  const primaryCls = `${btnBase} bg-teal-700 text-white hover:bg-teal-800`
  const secondaryCls = `${btnBase} border border-white/12 bg-white/10 text-white hover:bg-white/15`

  const enRouteEnabled = canTransition(status, 'en_route')
  const arrivedEnabled = canTransition(status, 'in_progress')
  const buildQuoteEnabled = status === 'in_progress'
  const markCompleteEnabled = canTransition(status, 'completed') && hasAcceptedQuote

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <button
          className={enRouteEnabled ? primaryCls : secondaryCls}
          disabled={!enRouteEnabled || loading !== null}
          onClick={() => postStatus('en_route')}
          type="button"
        >
          {loading === 'en_route' ? 'Updating...' : 'En Route'}
        </button>

        <button
          className={arrivedEnabled ? primaryCls : secondaryCls}
          disabled={!arrivedEnabled || loading !== null}
          onClick={() => postStatus('in_progress')}
          type="button"
        >
          {loading === 'in_progress' ? 'Updating...' : 'Arrived'}
        </button>

        {buildQuoteEnabled ? (
          <Link className={primaryCls} href={`/tech/job/${jobId}`}>
            Build Quote
          </Link>
        ) : (
          <button className={secondaryCls} disabled type="button">
            Build Quote
          </button>
        )}

        <button
          className={markCompleteEnabled ? primaryCls : secondaryCls}
          disabled={!markCompleteEnabled || loading !== null}
          onClick={() => postStatus('completed')}
          type="button"
        >
          {loading === 'completed' ? 'Updating...' : 'Mark Complete'}
        </button>
      </div>

      {error ? (
        <p className="rounded-2xl border border-red-200/70 bg-red-50 px-4 py-3 text-xs font-medium text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  )
}
