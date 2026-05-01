'use client'

import { useState, useEffect } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

type Technician = {
  id: string
  name: string
  phone: string | null
  handle: string | null
  availability_status: string | null
  current_job_id: string | null
  auth_user_id: string | null
}

type Credentials = { handle: string; pin: string; portalUrl: string } | null

export default function TechniciansPage() {
  const [technicians, setTechnicians] = useState<Technician[]>([])
  const [loading, setLoading] = useState(true)
  const [credentials, setCredentials] = useState<Credentials>(null)
  const [regeneratedPin, setRegeneratedPin] = useState<{ id: string; pin: string } | null>(null)
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '', preferredLast: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const supabase = createSupabaseBrowserClient()
    supabase.from('technicians').select('id,name,phone,handle,availability_status,current_job_id,auth_user_id').then(({ data }) => {
      setTechnicians(data ?? [])
      setLoading(false)
    })
  }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    const res = await fetch('/api/admin/technicians', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setSubmitting(false)
    if (!res.ok) { setError(data.error ?? 'Failed'); return }
    setCredentials(data)
    setForm({ firstName: '', lastName: '', phone: '', preferredLast: '' })
    // Refresh list
    const supabase = createSupabaseBrowserClient()
    const { data: techs } = await supabase.from('technicians').select('id,name,phone,handle,availability_status,current_job_id,auth_user_id')
    setTechnicians(techs ?? [])
  }

  async function handleRegenPin(techId: string) {
    const res = await fetch(`/api/admin/technicians/${techId}/regenerate-pin`, { method: 'POST' })
    const data = await res.json()
    if (res.ok) setRegeneratedPin({ id: techId, pin: data.pin })
  }

  const statusBadge = (s: string | null) => {
    const map: Record<string, string> = { available: 'bg-green-100 text-green-800', on_job: 'bg-amber-100 text-amber-800', offline: 'bg-slate-100 text-slate-600' }
    return <span className={`px-2 py-0.5 rounded text-xs font-medium ${map[s ?? 'offline'] ?? map.offline}`}>{s ?? 'offline'}</span>
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Technicians</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your field team and their credentials.</p>
        </div>
        <a href="/admin" className="text-sm text-teal-700 hover:underline">← Admin</a>
      </div>

      {credentials && (
        <div className="mb-8 rounded-xl border-2 border-teal-400 bg-teal-50 p-6">
          <p className="text-sm font-bold text-teal-800 mb-3">✅ Technician created — save these credentials now (shown once only)</p>
          <div className="font-mono text-sm space-y-1 text-slate-800">
            <p><strong>Username:</strong> {credentials.handle}</p>
            <p><strong>PIN:</strong> {credentials.pin}</p>
            <p><strong>Portal:</strong> {credentials.portalUrl}</p>
          </div>
          <button onClick={() => setCredentials(null)} className="mt-3 text-xs text-teal-700 underline">Dismiss</button>
        </div>
      )}

      {regeneratedPin && (
        <div className="mb-8 rounded-xl border-2 border-amber-400 bg-amber-50 p-4">
          <p className="text-sm font-bold text-amber-800 mb-1">New PIN generated (shown once only)</p>
          <p className="font-mono text-lg">{regeneratedPin.pin}</p>
          <button onClick={() => setRegeneratedPin(null)} className="mt-2 text-xs text-amber-700 underline">Dismiss</button>
        </div>
      )}

      <div className="mb-10 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold mb-4">Add Technician</h2>
        <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">First Name *</label>
            <input required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Last Name *</label>
            <input required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Phone *</label>
            <input required type="tel" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Custom Login ID last name <span className="font-normal text-slate-400">(optional, for hyphenated names)</span></label>
            <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="e.g. Rivera" value={form.preferredLast} onChange={e => setForm(f => ({ ...f, preferredLast: e.target.value }))} />
          </div>
          {error && <p className="sm:col-span-2 text-sm text-red-600">{error}</p>}
          <div className="sm:col-span-2">
            <button type="submit" disabled={submitting} className="rounded-lg bg-teal-700 px-5 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60">
              {submitting ? 'Creating…' : 'Create Technician'}
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Handle</th>
              <th className="text-left px-4 py-3 font-medium">Name</th>
              <th className="text-left px-4 py-3 font-medium">Phone</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-left px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">Loading…</td></tr>
            ) : technicians.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">No technicians yet.</td></tr>
            ) : technicians.map(tech => (
              <tr key={tech.id}>
                <td className="px-4 py-3 font-mono text-slate-600">{tech.handle ?? '—'}</td>
                <td className="px-4 py-3">{tech.name}</td>
                <td className="px-4 py-3">{tech.phone ?? '—'}</td>
                <td className="px-4 py-3">{statusBadge(tech.availability_status)}</td>
                <td className="px-4 py-3">
                  {tech.auth_user_id && (
                    <button onClick={() => handleRegenPin(tech.id)} className="text-xs text-teal-700 hover:underline">
                      Regenerate PIN
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
