'use client'

import { useState } from 'react'
import { MessageSquare } from 'lucide-react'

type Company = {
  id: string
  name: string
  slug: string
}

type FieldErrors = Record<string, string[]>

type SuccessData = {
  jobRef: string
  statusToken: string
}

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null
  return <p className="mt-1.5 text-xs font-medium text-red-600">{errors[0]}</p>
}

export default function IntakeForm({ company }: { company: Company }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [problemDescription, setProblemDescription] = useState('')
  const [urgency, setUrgency] = useState<string>('')
  const [smsConsent, setSmsConsent] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [submitError, setSubmitError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState<SuccessData | null>(null)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFieldErrors({})
    setSubmitError('')
    setLoading(true)

    try {
      const res = await fetch('/api/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone,
          address,
          problemDescription,
          urgency,
          smsConsent: smsConsent ? true : false,
          companySlug: company.slug,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.fields) {
          setFieldErrors(data.fields as FieldErrors)
        } else {
          setSubmitError(data.error ?? 'Something went wrong. Please try again.')
        }
        return
      }

      setSuccess({ jobRef: data.jobRef, statusToken: data.statusToken })
    } catch {
      setSubmitError('Network error. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  const inputCls = (field: string) =>
    `w-full rounded-xl border bg-white px-4 py-2.5 text-sm outline-none transition focus:ring-2 ${
      fieldErrors[field]?.length
        ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
        : 'border-slate-200 focus:border-[#1f6feb] focus:ring-[#eaf2ff]'
    }`

  if (success) {
    const statusUrl = `${window.location.origin}/intake/status/${success.statusToken}`
    return (
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white p-8 shadow-[0_1px_3px_rgba(0,0,0,0.06)] text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-teal-200 bg-teal-50">
          <span className="font-mono text-sm font-semibold text-teal-700">OK</span>
        </div>
        <span className="mt-4 inline-block rounded border border-teal-200 bg-teal-50 px-2 py-0.5 font-mono text-[10.5px] uppercase tracking-[0.06em] text-teal-700">
          Request received
        </span>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">You are on the board.</h2>
        <p className="mt-2 text-sm leading-7 text-slate-600">
          Your service request has been submitted. The office team can now route it cleanly, and someone will contact you shortly.
        </p>
        <div className="mt-5 rounded-xl border border-teal-200 bg-teal-50 p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.06em] text-slate-500">Reference number</p>
          <p className="mt-2 text-3xl font-semibold tracking-[0.1em] text-slate-950">#{success.jobRef}</p>
        </div>
        <a
          href={statusUrl}
          className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Track my request
        </a>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
      <div className="border-b border-slate-100 px-6 py-5">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.06em] text-slate-400">Service request</p>
        <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">
          Tell {company.name} what is going on
        </h2>
      </div>

      <form onSubmit={onSubmit} className="px-6 py-5 space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-slate-700">
              Full name <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              required
              autoComplete="name"
              className={inputCls('name')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Smith"
            />
            <FieldError errors={fieldErrors.name} />
          </div>

          <div>
            <label htmlFor="phone" className="mb-1.5 block text-sm font-medium text-slate-700">
              Phone number <span className="text-red-500">*</span>
            </label>
            <input
              id="phone"
              type="tel"
              required
              autoComplete="tel"
              className={inputCls('phone')}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 000-0000"
            />
            <FieldError errors={fieldErrors.phone} />
          </div>
        </div>

        <div>
          <label htmlFor="address" className="mb-1.5 block text-sm font-medium text-slate-700">
            Service address <span className="text-red-500">*</span>
          </label>
          <input
            id="address"
            type="text"
            required
            autoComplete="street-address"
            className={inputCls('address')}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="123 Main St, City, State 00000"
          />
          <FieldError errors={fieldErrors.address} />
        </div>

        <div>
          <label htmlFor="problemDescription" className="mb-1.5 block text-sm font-medium text-slate-700">
            Problem description <span className="text-red-500">*</span>
          </label>
          <textarea
            id="problemDescription"
            required
            rows={5}
            className={inputCls('problemDescription')}
            value={problemDescription}
            onChange={(e) => setProblemDescription(e.target.value)}
            placeholder="Describe the HVAC issue as clearly as you can."
          />
          <FieldError errors={fieldErrors.problemDescription} />
        </div>

        <div>
          <label htmlFor="urgency" className="mb-1.5 block text-sm font-medium text-slate-700">
            Urgency <span className="text-red-500">*</span>
          </label>
          <select
            id="urgency"
            required
            className={inputCls('urgency')}
            value={urgency}
            onChange={(e) => setUrgency(e.target.value)}
          >
            <option value="">Select urgency...</option>
            <option value="emergency">Emergency — needs service immediately</option>
            <option value="same_day">Same day — today if possible</option>
            <option value="scheduled">Scheduled — next available appointment</option>
          </select>
          <FieldError errors={fieldErrors.urgency} />
        </div>

        {/* SMS consent — explicit block above submit */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-start gap-3">
            <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-800">Text message updates</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                {company.name} may send you SMS updates about this job — dispatch confirmation, tech arrival, and quote notification. Message and data rates may apply. Reply STOP at any time to opt out.{' '}
                <a href="/privacy" className="font-medium text-teal-700 underline-offset-4 hover:underline">
                  Privacy policy
                </a>
              </p>
              <label className="mt-3 flex cursor-pointer items-center gap-2.5">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-teal-600 accent-teal-600"
                  checked={smsConsent}
                  onChange={(e) => setSmsConsent(e.target.checked)}
                />
                <span className="text-sm font-medium text-slate-700">
                  Yes, send me SMS updates for this request
                </span>
              </label>
              <FieldError errors={fieldErrors.smsConsent} />
            </div>
          </div>
        </div>

        {submitError ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {submitError}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
        >
          {loading ? 'Submitting...' : 'Submit service request'}
        </button>
      </form>
    </div>
  )
}
