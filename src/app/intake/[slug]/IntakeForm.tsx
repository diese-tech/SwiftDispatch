'use client'

import { useState } from 'react'

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
  return <p className="mt-1 text-xs font-medium text-red-600">{errors[0]}</p>
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

  if (success) {
    const statusUrl = `${window.location.origin}/intake/status/${success.statusToken}`
    return (
      <section className="rounded-xl border border-green-200 bg-green-50 p-6 text-center">
        <div className="mb-3 text-4xl">✓</div>
        <h2 className="text-xl font-semibold text-green-900">Request Received!</h2>
        <p className="mt-2 text-sm text-green-800">
          Your service request has been submitted. A dispatcher will contact you shortly.
        </p>
        <div className="mt-4 rounded-lg border border-green-200 bg-white p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Reference Number</p>
          <p className="mt-1 text-2xl font-bold tracking-widest text-slate-900">#{success.jobRef}</p>
        </div>
        <a
          href={statusUrl}
          className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-teal-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-800"
        >
          Track My Request
        </a>
      </section>
    )
  }

  const inputCls = (field: string) =>
    `w-full rounded-lg border px-3 py-2.5 text-base outline-none transition focus:ring-1 ${
      fieldErrors[field]?.length
        ? 'border-red-400 focus:border-red-500 focus:ring-red-400'
        : 'border-slate-300 focus:border-teal-600 focus:ring-teal-600'
    }`

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="space-y-5">
        {/* Full name */}
        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-medium text-slate-700">
            Full Name <span className="text-red-500">*</span>
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

        {/* Phone */}
        <div>
          <label htmlFor="phone" className="mb-1 block text-sm font-medium text-slate-700">
            Phone Number <span className="text-red-500">*</span>
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

        {/* Service address */}
        <div>
          <label htmlFor="address" className="mb-1 block text-sm font-medium text-slate-700">
            Service Address <span className="text-red-500">*</span>
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

        {/* Problem description */}
        <div>
          <label htmlFor="problemDescription" className="mb-1 block text-sm font-medium text-slate-700">
            Problem Description <span className="text-red-500">*</span>
          </label>
          <textarea
            id="problemDescription"
            required
            rows={4}
            className={inputCls('problemDescription')}
            value={problemDescription}
            onChange={(e) => setProblemDescription(e.target.value)}
            placeholder="Describe the issue with your HVAC system…"
          />
          <FieldError errors={fieldErrors.problemDescription} />
        </div>

        {/* Urgency */}
        <div>
          <label htmlFor="urgency" className="mb-1 block text-sm font-medium text-slate-700">
            Urgency <span className="text-red-500">*</span>
          </label>
          <select
            id="urgency"
            required
            className={inputCls('urgency')}
            value={urgency}
            onChange={(e) => setUrgency(e.target.value)}
          >
            <option value="">Select urgency…</option>
            <option value="emergency">Emergency — needs service immediately</option>
            <option value="same_day">Same Day — today if possible</option>
            <option value="scheduled">Scheduled — next available appointment</option>
          </select>
          <FieldError errors={fieldErrors.urgency} />
        </div>

        {/* SMS consent */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              required
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-teal-600 accent-teal-600"
              checked={smsConsent}
              onChange={(e) => setSmsConsent(e.target.checked)}
            />
            <span className="text-sm text-slate-600">
              I agree to receive text message updates about my service request from{' '}
              <strong>{company.name}</strong>.{' '}
              <a href="/privacy" className="text-teal-700 underline-offset-2 hover:underline">
                See our Privacy Policy.
              </a>
            </span>
          </label>
          <FieldError errors={fieldErrors.smsConsent} />
        </div>

        {/* Submit error */}
        {submitError && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
            {submitError}
          </p>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-teal-700 px-4 py-3 text-base font-semibold text-white transition hover:bg-teal-800 disabled:opacity-60"
        >
          {loading ? 'Submitting…' : 'Submit Service Request'}
        </button>
      </div>
    </form>
  )
}
