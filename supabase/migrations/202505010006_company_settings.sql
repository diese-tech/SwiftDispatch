-- Migration 6: Company Settings Extensions
alter table public.companies
  add column if not exists slug text unique,
  add column if not exists timezone text default 'America/New_York',
  add column if not exists sms_sender_name text,
  add column if not exists payment_provider text default 'manual'
    check (payment_provider in ('manual', 'stripe', 'square')),
  add column if not exists payment_config jsonb default '{}';

create unique index if not exists companies_slug_idx on public.companies(slug)
  where slug is not null;

-- Invoices table for payment abstraction layer
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  invoice_number text not null unique,
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  total_amount numeric(10,2) not null default 0,
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'void')),
  external_invoice_id text,
  invoice_url text,
  paid_at timestamptz,
  created_at timestamptz default now()
);

alter table public.invoices enable row level security;

create policy "Company members can view their invoices"
  on public.invoices for all
  using (
    company_id = (
      select company_id from public.users where id = auth.uid()
    )
  );

-- Add total_amount column to quotes if missing
alter table public.quotes add column if not exists total_amount numeric(10,2) default 0;
alter table public.quotes add column if not exists estimated_duration_minutes int default 60;
alter table public.quotes add column if not exists declined_at timestamptz;
alter table public.quotes add column if not exists decline_reason text;

-- Add invoice_sequence for readable invoice numbers
create sequence if not exists public.invoice_seq start 1001;
