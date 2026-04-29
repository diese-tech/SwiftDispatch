# SwiftDispatch

Emergency HVAC dispatch and quoting MVP.

## File Structure

```txt
src/app
  admin/page.tsx
  admin/actions.ts
  admin/seed-demo/page.tsx
  analytics/page.tsx
  roi/page.tsx
  api/company/route.ts
  api/jobs/route.ts
  api/jobs/[id]/route.ts
  api/quotes/route.ts
  api/quotes/[id]/accept/route.ts
  api/quotes/[id]/line-items/route.ts
  api/quotes/[id]/line-items/[itemId]/route.ts
  api/send-sms/route.ts
  dashboard/page.tsx
  job/[id]/page.tsx
  quote/[id]/page.tsx
  page.tsx
src/components
  AcceptQuoteButton.tsx
  JobCard.tsx
  KanbanBoard.tsx
  KanbanColumn.tsx
  LoginForm.tsx
  QuoteBuilder.tsx
  RoiSimulator.tsx
  SalesBadges.tsx
  TechnicianDropdown.tsx
  WorkflowComparison.tsx
src/lib
  auth.ts
  demo-data.ts
  format.ts
  twilio.ts
  supabase/admin.ts
  supabase/browser.ts
  supabase/server.ts
src/types/db.ts
supabase/migrations/202604280001_revenue_validation.sql
supabase/migrations/202604280002_sales_roi_demo.sql
supabase/migrations/202604290001_rls_and_quote_persistence.sql
supabase/migrations/202604290002_internal_admin.sql
supabase/schema.sql
.env.example
```

## Supabase Setup

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the SQL editor.
3. Enable email/password auth.
4. Create an auth user.
5. Seed company/profile/technicians:

```sql
insert into public.companies (name) values ('AC Fast Co') returning id;

insert into public.users (id, email, company_id, role)
values ('AUTH_USER_ID', 'dispatcher@example.com', 'COMPANY_ID', 'admin');

insert into public.technicians (name, phone, company_id)
values
  ('Mia Torres', '+15551234567', 'COMPANY_ID'),
  ('Leo Grant', '+15557654321', 'COMPANY_ID');
```

6. Copy project URL, anon key, and service role key into `.env.local`.

## Twilio Setup

1. Create or use a Twilio account.
2. Buy/verify a sending phone number.
3. Add `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_PHONE_NUMBER` to `.env.local`.

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Deploy to Vercel

1. Push this repo to GitHub.
2. Import it in Vercel.
3. Add all `.env.example` variables in Project Settings.
4. Set `NEXT_PUBLIC_APP_URL` to the production URL.
5. Deploy.
