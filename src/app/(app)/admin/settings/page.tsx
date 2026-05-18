"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "Pacific/Honolulu",
  "America/Anchorage",
];

type Settings = {
  name: string;
  slug: string;
  timezone: string;
  sms_sender_name: string;
  payment_provider: string;
  square: {
    connected: boolean;
    environment: string | null;
    merchantId: string | null;
    merchantName: string | null;
    locationId: string | null;
    locationName: string | null;
    connectedAt: string | null;
    oauthConfigured: boolean;
  };
};

const fieldClass = "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-[#1f6feb] focus:ring-2 focus:ring-[#eaf2ff]";

const squareBannerMap: Record<string, { msg: string; cls: string }> = {
  connected: { msg: "Square account connected successfully.", cls: "border-green-200 bg-green-50 text-green-800" },
  denied: { msg: "Square connection was canceled.", cls: "border-orange-200 bg-orange-50 text-orange-800" },
  "not-configured": { msg: "Square OAuth is not configured on the server yet.", cls: "border-red-200 bg-red-50 text-red-800" },
  forbidden: { msg: "Square connection requires an active admin session for this company.", cls: "border-red-200 bg-red-50 text-red-800" },
  "connect-failed": { msg: "Square connection failed. Check server config and try again.", cls: "border-red-200 bg-red-50 text-red-800" },
  "missing-code": { msg: "Square connection failed. Check server config and try again.", cls: "border-red-200 bg-red-50 text-red-800" },
  "invalid-state": { msg: "Square connection failed. Check server config and try again.", cls: "border-red-200 bg-red-50 text-red-800" },
};

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const [settings, setSettings] = useState<Settings>({
    name: "",
    slug: "",
    timezone: "America/New_York",
    sms_sender_name: "",
    payment_provider: "manual",
    square: { connected: false, environment: null, merchantId: null, merchantName: null, locationId: null, locationName: null, connectedAt: null, oauthConfigured: false },
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const squareStatus = searchParams.get("square");

  useEffect(() => {
    fetch("/api/admin/settings").then((r) => r.json()).then((data) => {
      if (data.company) {
        setSettings({
          name: data.company.name ?? "",
          slug: data.company.slug ?? "",
          timezone: data.company.timezone ?? "America/New_York",
          sms_sender_name: data.company.sms_sender_name ?? "",
          payment_provider: data.company.payment_provider ?? "manual",
          square: data.company.square ?? settings.square,
        });
      }
      setLoading(false);
    });
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess(false);
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: settings.name, slug: settings.slug, timezone: settings.timezone, smsSenderName: settings.sms_sender_name, paymentProvider: settings.payment_provider }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error ?? "Failed to save"); return; }
    setSuccess(true);
    setSettings((current) => ({ ...current, square: data.company?.square ?? current.square }));
  }

  if (loading) return <div className="px-6 py-16 text-center text-slate-400">Loading…</div>;

  const squareBanner = squareStatus ? squareBannerMap[squareStatus] : null;

  return (
    <main>
      {/* Page header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-slate-400">Admin settings</p>
          <h1 className="mt-0.5 text-2xl font-semibold tracking-tight text-slate-950">Company settings</h1>
        </div>
        <Link
          className="inline-flex items-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          href="/admin"
        >
          Back to admin
        </Link>
      </div>

      <div className="mx-auto max-w-3xl">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <p className="text-sm text-slate-500">These defaults shape customer-facing intake and internal scheduling behavior.</p>

          <form className="mt-6 space-y-5" onSubmit={handleSave}>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Company name</label>
              <input className={fieldClass} value={settings.name} onChange={(e) => setSettings((s) => ({ ...s, name: e.target.value }))} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Intake URL slug</label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-400">/intake/</span>
                <input className={`${fieldClass} font-mono`} placeholder="your-company" value={settings.slug} onChange={(e) => setSettings((s) => ({ ...s, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))} />
              </div>
              <p className="mt-1.5 text-xs text-slate-400">Lowercase letters, numbers, hyphens only.</p>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Timezone</label>
              <select className={fieldClass} value={settings.timezone} onChange={(e) => setSettings((s) => ({ ...s, timezone: e.target.value }))}>
                {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                SMS sender name <span className="font-normal text-slate-400">(max 20 chars)</span>
              </label>
              <input className={fieldClass} maxLength={20} placeholder="e.g. ABC HVAC" value={settings.sms_sender_name} onChange={(e) => setSettings((s) => ({ ...s, sms_sender_name: e.target.value }))} />
              <p className="mt-1.5 text-xs text-slate-400">Appears at the start of every customer SMS.</p>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Payment provider</label>
              <select className={fieldClass} value={settings.payment_provider} onChange={(e) => setSettings((s) => ({ ...s, payment_provider: e.target.value }))}>
                <option value="manual">Manual (internal invoicing)</option>
                <option value="stripe">Stripe (coming soon)</option>
                <option value="square">Square</option>
              </select>
            </div>

            {/* Square connection block */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="text-base font-semibold text-slate-950">Square connection</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Connect this company&apos;s Square account through OAuth. SwiftDispatch stores a tenant-scoped connection and defaults to the merchant&apos;s main location.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded border px-2 py-0.5 font-mono text-[10.5px] uppercase tracking-[0.06em] ${settings.square.connected ? "border-green-200 bg-green-50 text-green-700" : "border-orange-200 bg-orange-50 text-orange-700"}`}>
                    {settings.square.connected ? "Connected" : "Not connected"}
                  </span>
                  {settings.square.environment ? (
                    <span className="rounded border border-slate-200 bg-white px-2 py-0.5 font-mono text-[10.5px] uppercase tracking-[0.06em] text-slate-500">
                      {settings.square.environment}
                    </span>
                  ) : null}
                </div>
              </div>

              {squareBanner ? (
                <div className={`mt-4 rounded-xl border px-4 py-3 text-sm font-medium ${squareBanner.cls}`}>
                  {squareBanner.msg}
                </div>
              ) : null}

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.06em] text-slate-400">Merchant</p>
                  <p className="mt-1.5 text-sm font-medium text-slate-900">{settings.square.merchantName ?? "Not connected"}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{settings.square.merchantId ?? "No merchant linked yet"}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.06em] text-slate-400">Location</p>
                  <p className="mt-1.5 text-sm font-medium text-slate-900">{settings.square.locationName ?? "Selected on connect"}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{settings.square.locationId ?? "No location linked yet"}</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <a
                  className={`inline-flex items-center rounded-full px-5 py-2.5 text-sm font-semibold transition ${settings.square.oauthConfigured ? "bg-teal-700 text-white hover:bg-teal-800" : "cursor-not-allowed bg-slate-200 text-slate-500"}`}
                  href={settings.square.oauthConfigured ? "/api/admin/square/connect" : undefined}
                >
                  {settings.square.connected ? "Reconnect Square" : "Connect Square"}
                </a>
                {!settings.square.oauthConfigured ? (
                  <p className="text-sm text-slate-500">Add the Square OAuth env vars first.</p>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60" disabled={saving} type="submit">
                {saving ? "Saving…" : "Save settings"}
              </button>
              {error ? <p className="text-sm text-red-600">{error}</p> : null}
              {success ? <p className="text-sm font-medium text-green-700">Settings saved</p> : null}
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
