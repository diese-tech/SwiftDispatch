"use client";

import { useState } from "react";

const initialForm = {
  fullName: "",
  companyName: "",
  email: "",
  phone: "",
  teamSize: "",
  notes: "",
};

const fieldClass = "rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-100";

export default function DemoRequestForm() {
  const [form, setForm] = useState(initialForm);

  function updateField(field: keyof typeof initialForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const subjectLine = form.companyName ? `SwiftDispatch demo request - ${form.companyName}` : "SwiftDispatch demo request";
    const bodyLines = [
      `Name: ${form.fullName || ""}`,
      `Company: ${form.companyName || ""}`,
      `Email: ${form.email || ""}`,
      `Phone: ${form.phone || ""}`,
      `Team size: ${form.teamSize || ""}`,
      "",
      "What I want to improve:",
      form.notes || "",
    ];
    const href = `mailto:hello@swiftdispatch.app?subject=${encodeURIComponent(subjectLine)}&body=${encodeURIComponent(bodyLines.join("\n"))}`;
    window.location.href = href;
  }

  return (
    <form className="grid gap-5" onSubmit={handleSubmit}>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Name
          <input className={fieldClass} name="fullName" onChange={(event) => updateField("fullName", event.target.value)} placeholder="Alex Morgan" required value={form.fullName} />
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Company
          <input className={fieldClass} name="companyName" onChange={(event) => updateField("companyName", event.target.value)} placeholder="Morgan Heating & Air" required value={form.companyName} />
        </label>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Work email
          <input className={fieldClass} name="email" onChange={(event) => updateField("email", event.target.value)} placeholder="alex@company.com" required type="email" value={form.email} />
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Phone
          <input className={fieldClass} name="phone" onChange={(event) => updateField("phone", event.target.value)} placeholder="(555) 555-0112" value={form.phone} />
        </label>
      </div>

      <label className="grid gap-2 text-sm font-medium text-slate-700">
        Team size
        <select className={fieldClass} name="teamSize" onChange={(event) => updateField("teamSize", event.target.value)} required value={form.teamSize}>
          <option value="">Select team size</option>
          <option value="1-3 technicians">1-3 technicians</option>
          <option value="4-10 technicians">4-10 technicians</option>
          <option value="11-20 technicians">11-20 technicians</option>
          <option value="20+ technicians">20+ technicians</option>
        </select>
      </label>

      <label className="grid gap-2 text-sm font-medium text-slate-700">
        What are you trying to clean up?
        <textarea className={`${fieldClass} min-h-32`} name="notes" onChange={(event) => updateField("notes", event.target.value)} placeholder="Dispatch coordination, technician updates, quote approvals, customer communication..." value={form.notes} />
      </label>

      <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <p>This opens your email app with a structured demo request. No external form backend needed yet.</p>
        <button className="inline-flex items-center justify-center rounded-full bg-teal-700 px-6 py-3 font-semibold text-white transition hover:bg-teal-800" type="submit">
          Start demo request
        </button>
      </div>
    </form>
  );
}