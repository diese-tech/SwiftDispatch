'use client'

import { useState } from 'react'
import { StatusPill, SurfaceCard } from '@/components/DesignSystem'

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
  return <p className="mt-2 text-xs font-medium text-red-600">{errors[0]}</p>
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
    `w-full rounded-2xl border bg-white px-4 py-3 text-sm outline-none transition focus:ring-4 ${
      fieldErrors[field]?.length
        ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
        : 'border-slate-200 focus:border-teal-500 focus:ring-teal-100'
    }`

  if (success) {
    const statusUrl = `${window.location.origin}/intake/status/${success.statusToken}`
    return (
      <SurfaceCard accent className="p-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-2xl font-semibold text-emerald-700">
          OK
        </div>
        <StatusPill tone="success" >
          Request received
        </StatusPill>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">You are on the board.</h2>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          Your service request has been submitted. The office team can now route it cleanly, and someone will contact you shortly.
        </p>
        <div className="mt-6 rounded-[1.5rem] border border-emerald-200 bg-emerald-50/70 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Reference number</p>
          <p className="mt-3 text-3xl font-semibold tracking-[0.18em] text-slate-950">#{success.jobRef}</p>
        </div>
        <a
          href={statusUrl}
          className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Track my request
        </a>
      </SurfaceCard>
    )
  }

  return (
    <SurfaceCard accent className="p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            Service request
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
            Tell {company.name} what is going on
          </h2>
        </div>
        <StatusPill tone="teal">Customer intake</StatusPill>
      </div>

      <form onSubmit={onSubmit} className="mt-6 space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="name" className="mb-2 block text-sm font-medium text-slate-700">
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
            <label htmlFor="phone" className="mb-2 block text-sm font-medium text-slate-700">
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
          <label htmlFor="address" className="mb-2 block text-sm font-medium text-slate-700">
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
          <label htmlFor="problemDescription" className="mb-2 block text-sm font-medium text-slate-700">
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
          <label htmlFor="urgency" className="mb-2 block text-sm font-medium text-slate-700">
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
            <option value="emergency">Emergency - needs service immediately</option>
            <option value="same_day">Same day - today if possible</option>
            <option value="scheduled">Scheduled - next available appointment</option>
          </select>
          <FieldError errors={fieldErrors.urgency} />
        </div>

        <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-4">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              required
              className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-teal-600 accent-teal-600"
              checked={smsConsent}
              onChange={(e) => setSmsConsent(e.target.checked)}
            />
            <span className="text-sm leading-6 text-slate-600">
              I agree to receive text message updates about my service request from <strong>{company.name}</strong>.{' '}
              <a href="/privacy" className="font-medium text-teal-700 underline-offset-4 hover:underline">
                See the privacy policy.
              </a>
            </span>
          </label>
          <FieldError errors={fieldErrors.smsConsent} />
        </div>

        {submitError ? (
          <p className="rounded-2xl border border-red-200/70 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
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
    </SurfaceCard>
  )
}
