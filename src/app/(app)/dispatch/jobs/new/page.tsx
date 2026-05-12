'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

type Tech = { id: string; name: string; availability_status: string | null }
type Template = { id: string; name: string; line_items: unknown[] }

export default function NewJobPage() {
  const router = useRouter()
  const [techs, setTechs] = useState<Tech[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [form, setForm] = useState({
    customerName: '',
    phone: '',
    address: '',
    problemDescription: '',
    urgency: 'scheduled',
    technicianId: '',
    templateId: '',
    smsConsent: false,
  })
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    const supabase = createSupabaseBrowserClient()
    supabase.from('technicians').select('id,name,availability_status').eq('availability_status', 'available').then(({ data }) => setTechs(data ?? []))
    fetch('/api/admin/templates').then(r => r.json()).then(data => setTemplates(data.templates ?? []))
  }, [])

  function set(field: string, value: string | boolean) {
    setForm(f => ({ ...f, [field]: value }))
    setErrors(e => { const n = { ...e }; delete n[field]; return n })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!form.customerName.trim()) errs.customerName = 'Required'
    if (!form.phone.trim()) errs.phone = 'Required'
    if (!form.address.trim()) errs.address = 'Required'
    if (!form.problemDescription.trim()) errs.problemDescription = 'Required'
    if (Object.keys(errs).length) { setErrors(errs); return }

    setSubmitting(true)
    const res = await fetch('/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_name: form.customerName,
        phone: form.phone,
        address: form.address,
        issue: form.problemDescription,
        problem_description: form.problemDescription,
        urgency: form.urgency,
        technician_id: form.technicianId || null,
        template_id: form.templateId || null,
        sms_consent: form.smsConsent,
        sms_consent_type: form.smsConsent ? 'verbal_logged' : 'none',
        source: 'manual',
      }),
    })
    const data = await res.json()
    setSubmitting(false)
    if (!res.ok) {
      setErrors({ _: data.error ?? 'Failed to create job' })
      return
    }
    router.push('/dispatch')
  }

  const inputClass = (field: string) =>
    `w-full rounded-lg border px-3 py-2 text-sm ${errors[field] ? 'border-red-400' : 'border-slate-300'} focus:outline-none focus:ring-1 focus:ring-teal-600`

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">New Job</h1>
        <p className="mt-1 text-sm text-slate-500">Create a dispatch job and optionally pre-assign a technician.</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-slate-200 bg-white p-6">
        <div>
          <label className="mb-1 block text-sm font-medium">Customer Name *</label>
          <input className={inputClass('customerName')} value={form.customerName} onChange={e => set('customerName', e.target.value)} />
          {errors.customerName && <p className="mt-1 text-xs text-red-600">{errors.customerName}</p>}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Customer Phone *</label>
          <input type="tel" className={inputClass('phone')} value={form.phone} onChange={e => set('phone', e.target.value)} />
          {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone}</p>}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Service Address *</label>
          <input className={inputClass('address')} value={form.address} onChange={e => set('address', e.target.value)} />
          {errors.address && <p className="mt-1 text-xs text-red-600">{errors.address}</p>}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Problem Description *</label>
          <textarea rows={3} className={inputClass('problemDescription')} value={form.problemDescription} onChange={e => set('problemDescription', e.target.value)} />
          {errors.problemDescription && <p className="mt-1 text-xs text-red-600">{errors.problemDescription}</p>}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Urgency *</label>
          <select className={inputClass('urgency')} value={form.urgency} onChange={e => set('urgency', e.target.value)}>
            <option value="emergency">Emergency</option>
            <option value="same_day">Same Day</option>
            <option value="scheduled">Scheduled</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Assign Technician <span className="font-normal text-slate-400">(optional)</span></label>
          <select className={inputClass('technicianId')} value={form.technicianId} onChange={e => set('technicianId', e.target.value)}>
            <option value="">- Unassigned -</option>
            {techs.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Quote Template <span className="font-normal text-slate-400">(optional)</span></label>
          <select className={inputClass('templateId')} value={form.templateId} onChange={e => set('templateId', e.target.value)}>
            <option value="">- No template -</option>
            {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-600"
              checked={form.smsConsent}
              onChange={e => set('smsConsent', e.target.checked)}
            />
            <span className="text-sm text-slate-700">
              Customer verbally consented to receive SMS updates about this job.
              {!form.smsConsent && <span className="ml-1 text-slate-400">(SMS notifications disabled until checked)</span>}
            </span>
          </label>
        </div>
        {errors._ && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-600">{errors._}</p>}
        <div className="flex gap-3">
          <button type="submit" disabled={submitting} className="rounded-lg bg-teal-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60">
            {submitting ? 'Creating...' : 'Create Job'}
          </button>
          <a href="/dispatch" className="rounded-lg border border-slate-300 px-6 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Cancel
          </a>
        </div>
      </form>
    </div>
  )
}
