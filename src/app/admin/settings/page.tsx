'use client'

import { useState, useEffect } from 'react'

const TIMEZONES = [
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Phoenix', 'Pacific/Honolulu', 'America/Anchorage',
]

type Settings = {
  name: string
  slug: string
  timezone: string
  sms_sender_name: string
  payment_provider: string
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({ name: '', slug: '', timezone: 'America/New_York', sms_sender_name: '', payment_provider: 'manual' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/admin/settings').then(r => r.json()).then(data => {
      if (data.company) setSettings({
        name: data.company.name ?? '',
        slug: data.company.slug ?? '',
        timezone: data.company.timezone ?? 'America/New_York',
        sms_sender_name: data.company.sms_sender_name ?? '',
        payment_provider: data.company.payment_provider ?? 'manual',
      })
      setLoading(false)
    })
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess(false)
    const res = await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: settings.name,
        slug: settings.slug,
        timezone: settings.timezone,
        smsSenderName: settings.sms_sender_name,
        paymentProvider: settings.payment_provider,
      }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error ?? 'Failed to save'); return }
    setSuccess(true)
  }

  if (loading) return <div className="px-6 py-16 text-center text-slate-400">Loading…</div>

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Company Settings</h1>
          <p className="text-sm text-slate-500 mt-1">Configure your SwiftDispatch account.</p>
        </div>
        <a href="/admin" className="text-sm text-teal-700 hover:underline">← Admin</a>
      </div>

      <form onSubmit={handleSave} className="rounded-xl border border-slate-200 bg-white p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium mb-1">Company Name</label>
          <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={settings.name} onChange={e => setSettings(s => ({ ...s, name: e.target.value }))} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Intake URL Slug</label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">/intake/</span>
            <input
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
              placeholder="your-company"
              value={settings.slug}
              onChange={e => setSettings(s => ({ ...s, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
            />
          </div>
          <p className="text-xs text-slate-400 mt-1">Lowercase letters, numbers, hyphens only.</p>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Timezone</label>
          <select className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={settings.timezone} onChange={e => setSettings(s => ({ ...s, timezone: e.target.value }))}>
            {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">SMS Sender Name <span className="font-normal text-slate-400">(max 20 chars)</span></label>
          <input maxLength={20} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={settings.sms_sender_name} onChange={e => setSettings(s => ({ ...s, sms_sender_name: e.target.value }))} placeholder="e.g. ABC HVAC" />
          <p className="text-xs text-slate-400 mt-1">Appears at the start of every customer SMS.</p>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Payment Provider</label>
          <select className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={settings.payment_provider} onChange={e => setSettings(s => ({ ...s, payment_provider: e.target.value }))}>
            <option value="manual">Manual (internal invoicing)</option>
            <option value="stripe">Stripe (coming soon)</option>
            <option value="square">Square (coming soon)</option>
          </select>
        </div>
        {error && <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{error}</p>}
        {success && <p className="text-sm text-green-700 bg-green-50 rounded px-3 py-2">Settings saved.</p>}
        <button type="submit" disabled={saving} className="rounded-lg bg-teal-700 px-5 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60">
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </form>
    </div>
  )
}

