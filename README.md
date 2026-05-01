# SwiftDispatch

**Dispatch software built for HVAC teams — not spreadsheets.**

**Live app:** https://swift-dispatch-xi.vercel.app

---

## Why it exists

HVAC dispatch runs on phone calls, group texts, and whiteboards. Jobs get lost. Techs don't know what's next. Customers call back because nobody told them what's happening.

SwiftDispatch replaces that with a single system: dispatchers see every job on a live board, techs get SMS links to update their status from the field, and customers get automatic updates without anyone picking up the phone.

---

## What it does

- **Live dispatch board** — drag jobs across columns as they move from new to complete
- **One-tap tech updates** — techs tap a link in their assignment SMS to mark En Route, Arrived, or Complete. No app install.
- **SMS quote approval** — techs build quotes on-site, customers approve by text
- **Customer intake form** — shareable link (`/intake/your-company`) lets customers submit requests directly
- **Analytics** — response times, quote acceptance rate, revenue per tech, no-access rate

---

## Quick start

1. Clone the repo and run `npm install`
2. Copy `.env.example` to `.env.local` and add your Supabase, Twilio, and app URL credentials
3. Run the 6 SQL migrations in Supabase (files in `supabase/migrations/`, run in order)
4. Create your company and first admin user in Supabase
5. `npm run dev` → open `http://localhost:3000`

For full setup, onboarding your team, and day-to-day workflows → see [OPERATIONS.md](./OPERATIONS.md)

---

## Deploying

Standard Vercel deploy. Add all `.env.example` variables in Vercel → Project Settings → Environment Variables. Set `NEXT_PUBLIC_APP_URL` to your Vercel URL.

---

## Not yet available

- Online payments (Stripe/Square stubs are in place, not wired up)
- Email notifications
- Customer accounts
