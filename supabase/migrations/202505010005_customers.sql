-- Migration 5: Customer Table
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  phone text not null,
  email text,
  sms_consent_type text default 'none'
    check (sms_consent_type in ('intake_form', 'verbal_logged', 'none')),
  created_at timestamptz default now()
);

alter table public.customers enable row level security;

create policy "Company members can manage their customers"
  on public.customers for all
  using (
    company_id = (
      select company_id from public.users where id = auth.uid()
    )
  );

create unique index if not exists customers_company_phone_idx
  on public.customers(company_id, phone);
