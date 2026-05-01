# SwiftDispatch

HVAC dispatch SaaS — real-time job management, technician SMS actions, customer quote approval, and analytics.

**Live app:** https://swift-dispatch-xi.vercel.app

---

## Stack

- **Next.js 16** (App Router, TypeScript)
- **Supabase** (Postgres + Auth + RLS + Realtime)
- **Twilio** (SMS)
- **Vercel** (hosting)

---

## Route Map

| Route | Description | Auth |
|---|---|---|
| `/` | Marketing landing page | Public |
| `/login` | Dispatcher / admin login | Public |
| `/dispatch` | Kanban dispatch board | Dispatcher, Admin |
| `/dispatch/jobs/new` | Create new job | Dispatcher, Admin |
| `/admin` | Admin console | Admin |
| `/admin/technicians` | Manage technicians | Admin |
| `/admin/templates` | Quote templates | Admin |
| `/admin/settings` | Company settings | Admin |
| `/admin/users` | Dispatcher accounts | Admin |
| `/tech/login` | Technician login (handle + PIN) | Public |
| `/tech` | Active job view | Technician |
| `/tech/job/[id]` | Job detail + quote builder | Technician |
| `/intake/[slug]` | Customer job request form | Public |
| `/intake/status/[token]` | Customer job status | Token-gated |
| `/intake/quote/[token]` | Customer quote approval | Token-gated |
| `/invoice/[jobId]` | Printable invoice | Dispatcher, Admin |
| `/analytics` | 30-day metrics dashboard | Dispatcher, Admin |
| `/privacy` | Privacy policy | Public |
| `/terms` | Terms of service | Public |

---

## Job Status Flow

```
new → assigned → en_route → in_progress → quote_pending → completed
 ↓        ↓          ↓            ↓               ↓
cancelled cancelled  no_access   cancelled      in_progress (declined)
                      ↓
                     new
```

Every status change goes through `src/lib/stateMachine.ts`. Invalid transitions return `409 Conflict`.

---

## Supabase Setup

### 1. Run migrations in order

Go to Supabase → SQL Editor and run each file from `supabase/migrations/` in order:

1. `202505010001_job_timestamp_columns.sql`
2. `202505010002_status_events.sql`
3. `202505010003_technician_auth_fields.sql`
4. `202505010004_quote_templates.sql`
5. `202505010005_customers.sql`
6. `202505010006_company_settings.sql`

### 2. Enable email/password auth

Supabase → Authentication → Providers → Email → Enable.

### 3. Seed your first company and admin user

```sql
-- Create company
insert into public.companies (name) values ('Your Company Name') returning id;

-- Create admin user (use the UUID from Supabase Auth after creating the user there first)
insert into public.users (id, email, company_id, role)
values ('AUTH_USER_UUID', 'admin@yourcompany.com', 'COMPANY_UUID', 'admin');
```

### 4. Set your company slug

```sql
update public.companies set slug = 'your-slug' where id = 'COMPANY_UUID';
```

This enables the customer intake form at `/intake/your-slug`.

---

## Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Twilio
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# App
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app

# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
TECH_TOKEN_SECRET=
```

---

## Technician Accounts

Technicians do not use email/password. They log in at `/tech/login` with:
- **Username** — auto-generated handle (e.g. `miatorr`)
- **PIN** — 4-digit code

Create technicians via `/admin/technicians`. Credentials are shown once on creation. Admins can regenerate PINs at any time.

---

## Twilio Setup

1. Create or use a Twilio account
2. Buy a sending phone number
3. Add `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` to env

SMS is only sent to customers who have given consent (`intake_form` or `verbal_logged`). The gate is enforced in `src/lib/smsGate.ts`.

---

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

---

## Tests

```bash
npm test
```

78 tests covering: state machine transitions, technician handle generation, JWT token roundtrip/expiry/tampering, SMS consent gate, payment provider factory.

---

## Deploy to Vercel

1. Push to GitHub
2. Import repo in Vercel
3. Add all env variables under Project Settings → Environment Variables
4. Set `NEXT_PUBLIC_APP_URL` to your Vercel URL
5. Deploy

---

## What's Not Implemented Yet

- Stripe / Square payment processing (stubs exist in `src/lib/payments/`)
- PDF invoice generation (browser print works)
- Email notifications (SMS only)
- Customer accounts / login
