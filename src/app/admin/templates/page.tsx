'use client'

import { useState, useEffect } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

type LineItem = { description: string; unit_price: number; qty: number; unit?: string; optional: boolean }
type Template = { id: string; name: string; line_items: LineItem[]; estimated_duration_minutes: number; is_active: boolean }

const emptyItem = (): LineItem => ({ description: '', unit_price: 0, qty: 1, optional: false })

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDuration, setNewDuration] = useState(60)
  const [newItems, setNewItems] = useState<LineItem[]>([emptyItem()])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    const res = await fetch('/api/admin/templates')
    const data = await res.json()
    setTemplates(data.templates ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    const res = await fetch('/api/admin/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName, lineItems: newItems, estimatedDurationMinutes: newDuration }),
    })
    const data = await res.json()
    setSubmitting(false)
    if (!res.ok) { setError(data.error ?? 'Failed'); return }
    setCreating(false)
    setNewName('')
    setNewItems([emptyItem()])
    await load()
  }

  async function toggleActive(template: Template) {
    await fetch(`/api/admin/templates/${template.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !template.is_active }),
    })
    await load()
  }

  const updateNewItem = (idx: number, field: keyof LineItem, val: string | number | boolean) => {
    setNewItems(items => items.map((item, i) => i === idx ? { ...item, [field]: val } : item))
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quote Templates</h1>
          <p className="text-sm text-slate-500 mt-1">Pre-built line item sets for common jobs.</p>
        </div>
        <div className="flex gap-3">
          <a href="/admin" className="text-sm text-teal-700 hover:underline">← Admin</a>
          <button onClick={() => setCreating(true)} className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800">
            New Template
          </button>
        </div>
      </div>

      {creating && (
        <div className="mb-8 rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold mb-4">New Template</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Template Name *</label>
                <input required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={newName} onChange={e => setNewName(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Est. Duration (min)</label>
                <input type="number" min={15} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={newDuration} onChange={e => setNewDuration(Number(e.target.value))} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Line Items</label>
              <div className="space-y-2">
                {newItems.map((item, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input placeholder="Description" className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" value={item.description} onChange={e => updateNewItem(idx, 'description', e.target.value)} />
                    <input type="number" placeholder="Price" className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm" value={item.unit_price} onChange={e => updateNewItem(idx, 'unit_price', Number(e.target.value))} />
                    <input type="number" placeholder="Qty" className="w-16 rounded-lg border border-slate-300 px-3 py-2 text-sm" value={item.qty} onChange={e => updateNewItem(idx, 'qty', Number(e.target.value))} />
                    <select className="rounded-lg border border-slate-300 px-2 py-2 text-sm" value={item.unit ?? ''} onChange={e => updateNewItem(idx, 'unit', e.target.value)}>
                      <option value="">unit</option>
                      <option value="hour">hour</option>
                      <option value="flat">flat</option>
                    </select>
                    <button type="button" onClick={() => setNewItems(items => items.filter((_, i) => i !== idx))} className="text-red-500 text-sm px-2">✕</button>
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => setNewItems(items => [...items, emptyItem()])} className="mt-2 text-sm text-teal-700 hover:underline">
                + Add line item
              </button>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-3">
              <button type="submit" disabled={submitting} className="rounded-lg bg-teal-700 px-5 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60">
                {submitting ? 'Saving…' : 'Save Template'}
              </button>
              <button type="button" onClick={() => setCreating(false)} className="text-sm text-slate-500 hover:underline">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
        {loading ? (
          <div className="px-6 py-8 text-center text-slate-400">Loading…</div>
        ) : templates.length === 0 ? (
          <div className="px-6 py-8 text-center text-slate-400">No templates yet.</div>
        ) : templates.map(t => (
          <div key={t.id} className="px-6 py-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-900">{t.name}</span>
                {!t.is_active && <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded">Inactive</span>}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{t.line_items.length} line items · {t.estimated_duration_minutes} min</p>
            </div>
            <button onClick={() => toggleActive(t)} className="text-sm text-slate-600 hover:underline">
              {t.is_active ? 'Deactivate' : 'Activate'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

