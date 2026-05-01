'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'

type StatusData = {
  status: string
  jobRef: string
  techName?: string
  enRouteAt?: string
  quoteToken?: string
  label: string
}

const STATUS_LABELS: Record<string, string> = {
  new: 'Your request has been received. A dispatcher will be in touch shortly.',
  assigned: 'A technician has been assigned to your request.',
  en_route: 'Your technician is on the way.',
  in_progress: 'Your technician is on site.',
  quote_pending: 'Your technician has submitted a quote for your approval.',
  completed: 'Your service is complete. Thank you!',
  cancelled: 'This service request has been cancelled. Please call us to reschedule.',
  no_access: 'Your technician was unable to access the property. We will be in touch to reschedule.',
}

const STATUS_ICONS: Record<string, string> = {
  new: '📋', assigned: '👷', en_route: '🚗', in_progress: '🔧',
  quote_pending: '💰', completed: '✅', cancelled: '❌', no_access: '🚫',
}

export default function StatusPage() {
  const params = useParams()
  const token = params.token as string
  const [data, setData] = useState<StatusData | null>(null)
  const [error, setError] = useState('')

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/intake/status?token=${encodeURIComponent(token)}`)
      if (!res.ok) { setError('Unable to load status.'); return }
      const json = await res.json()
      setData({ ...json, label: STATUS_LABELS[json.status] ?? json.status })
    } catch {
      setError('Network error. Please refresh.')
    }
  }, [token])

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 30_000)
    return () => clearInterval(interval)
  }, [fetchStatus])

  if (error) return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center max-w-sm">
        <p className="text-red-700">{error}</p>
        <a href="/" className="mt-4 block text-sm text-teal-700 hover:underline">Back to home</a>
      </div>
    </main>
  )

  if (!data) return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="text-slate-400 text-sm">Loading…</div>
    </main>
  )

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <p className="text-xs font-bold uppercase tracking-widest text-teal-700">SwiftDispatch</p>
          <h1 className="mt-2 text-xl font-semibold text-slate-900">Job Status</h1>
          <p className="text-sm text-slate-500 mt-1">Reference #{data.jobRef}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="text-4xl">{STATUS_ICONS[data.status] ?? '📋'}</div>
            <div>
              <p className="font-semibold text-slate-900 capitalize">{data.status.replace('_', ' ')}</p>
              <p className="text-sm text-slate-600 mt-1">{data.label}</p>
            </div>
          </div>

          {data.techName && (
            <div className="mt-4 border-t border-slate-100 pt-4">
              <p className="text-sm text-slate-500">Technician: <span className="font-medium text-slate-800">{data.techName}</span></p>
            </div>
          )}

          {data.enRouteAt && (
            <div className="mt-3">
              <p className="text-sm text-slate-500">
                En route since {new Date(data.enRouteAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          )}

          {data.status === 'quote_pending' && data.quoteToken && (
            <div className="mt-6">
              <a
                href={`/intake/quote/${data.quoteToken}`}
                className="block w-full rounded-lg bg-teal-700 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-teal-800 transition"
              >
                Review and Approve Quote
              </a>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-slate-400 mt-4">
          Updates automatically every 30 seconds.
        </p>
      </div>
    </main>
  )
}
