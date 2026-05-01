'use client'

import { useState } from 'react'

export default function QuoteApprovalForm({
  quoteId,
  jobId,
  token,
}: {
  quoteId: string
  jobId: string
  token: string
}) {
  const [state, setState] = useState<'idle' | 'declining' | 'done_accept' | 'done_decline'>('idle')
  const [declineReason, setDeclineReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleAccept() {
    setLoading(true)
    setError('')
    const res = await fetch(`/api/quotes/${quoteId}/accept`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
    setLoading(false)
    if (res.ok) { setState('done_accept'); return }
    const data = await res.json()
    setError(data.error ?? 'Failed to accept quote')
  }

  async function handleDecline() {
    setLoading(true)
    setError('')
    const res = await fetch(`/api/quotes/${quoteId}/decline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, reason: declineReason }),
    })
    setLoading(false)
    if (res.ok) { setState('done_decline'); return }
    const data = await res.json()
    setError(data.error ?? 'Failed to decline quote')
  }

  if (state === 'done_accept') return (
    <div className="px-6 py-8 text-center">
      <div className="text-4xl mb-3">✅</div>
      <p className="text-green-700 font-semibold text-lg">Quote accepted!</p>
      <p className="text-slate-600 text-sm mt-2">Thank you. Your invoice is being prepared.</p>
    </div>
  )

  if (state === 'done_decline') return (
    <div className="px-6 py-8 text-center">
      <p className="text-slate-700 font-medium">We&apos;ve notified your technician.</p>
      <p className="text-slate-500 text-sm mt-1">They&apos;ll be in touch shortly.</p>
    </div>
  )

  return (
    <div className="px-6 py-6 border-t border-slate-100">
      {error && <p className="mb-4 text-sm text-red-600 bg-red-50 rounded px-3 py-2">{error}</p>}

      {state === 'declining' ? (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-slate-700">
            Let us know why (optional):
          </label>
          <textarea
            rows={3}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-600"
            placeholder="e.g. Price too high, want a second opinion…"
            value={declineReason}
            onChange={e => setDeclineReason(e.target.value)}
          />
          <div className="flex gap-3">
            <button
              onClick={handleDecline}
              disabled={loading}
              className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {loading ? 'Submitting…' : 'Confirm Decline'}
            </button>
            <button
              onClick={() => setState('idle')}
              className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleAccept}
            disabled={loading}
            className="flex-1 rounded-lg bg-teal-700 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
          >
            {loading ? 'Processing…' : '✓ Accept Quote'}
          </button>
          <button
            onClick={() => setState('declining')}
            disabled={loading}
            className="flex-1 rounded-lg border border-red-300 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
          >
            Decline
          </button>
        </div>
      )}
    </div>
  )
}
