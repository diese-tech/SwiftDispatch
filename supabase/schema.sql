create extension if not exists "pgcrypto";

create type public.quote_status as enum ('draft', 'sent', 'accepted', 'rejected');

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  close_status text not null default 'not_contacted' check (close_status in ('not_contacted', 'contacted', 'demo_done', 'interested', 'closed_won', 'closed_lost')),
  demo_mode_enabled boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  company_id uuid not null references public.companies(id) on delete cascade,
  role text not null default 'dispatcher'
);

create table public.technicians (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  company_id uuid not null references public.companies(id) on delete cascade
);

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  phone text not null,
  address text not null,
  issue text not null,
  status text not null default 'New' check (status in ('New', 'Assigned', 'En Route', 'Completed')),
  technician_id uuid references public.technicians(id) on delete set null,
  company_id uuid not null references public.companies(id) on delete cascade,
  created_at timestamptz not null default now(),
  technician_assigned_at timestamptz
);

create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  total numeric(10,2) not null default 0,
  status public.quote_status not null default 'draft',
  created_at timestamptz not null default now(),
  quote_sent_at timestamptz,
  accepted_at timestamptz,
  rejected_at timestamptz
);

create table public.quote_line_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  name text not null,
  price numeric(10,2) not null default 0,
  quantity integer not null default 1
);

alter table public.companies enable row level security;
alter table public.users enable row level security;
alter table public.technicians enable row level security;
alter table public.jobs enable row level security;
alter table public.quotes enable row level security;
alter table public.quote_line_items enable row level security;

alter table public.companies force row level security;
alter table public.users force row level security;
alter table public.technicians force row level security;
alter table public.jobs force row level security;
alter table public.quotes force row level security;
alter table public.quote_line_items force row level security;

create or replace function public.current_company_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select company_id from public.users where id = auth.uid()
$$;

create policy "users can read own profile"
on public.users for select
using (id = auth.uid());

create policy "users can update own profile"
on public.users for update
using (id = auth.uid() and company_id = public.current_company_id())
with check (id = auth.uid() and company_id = public.current_company_id());

create policy "users can read own company"
on public.companies for select
using (id = public.current_company_id());

create policy "users can update own company sales fields"
on public.companies for update
using (id = public.current_company_id())
with check (id = public.current_company_id());

create policy "company users can read technicians"
on public.technicians for select
using (company_id = public.current_company_id());

create policy "company users can insert technicians"
on public.technicians for insert
with check (company_id = public.current_company_id());

create policy "company users can update technicians"
on public.technicians for update
using (company_id = public.current_company_id())
with check (company_id = public.current_company_id());

create policy "company users can read jobs"
on public.jobs for select
using (company_id = public.current_company_id());

create policy "company users can insert jobs"
on public.jobs for insert
with check (company_id = public.current_company_id());

create policy "company users can update jobs"
on public.jobs for update
using (company_id = public.current_company_id())
with check (company_id = public.current_company_id());

create policy "company users can read quotes"
on public.quotes for select
using (
  exists (
    select 1 from public.jobs
    where jobs.id = quotes.job_id
    and jobs.company_id = public.current_company_id()
  )
);

create policy "company users can insert quotes"
on public.quotes for insert
with check (
  exists (
    select 1 from public.jobs
    where jobs.id = quotes.job_id
    and jobs.company_id = public.current_company_id()
  )
);

create policy "company users can update quotes"
on public.quotes for update
using (
  exists (
    select 1 from public.jobs
    where jobs.id = quotes.job_id
    and jobs.company_id = public.current_company_id()
  )
)
with check (
  exists (
    select 1 from public.jobs
    where jobs.id = quotes.job_id
    and jobs.company_id = public.current_company_id()
  )
);

create policy "company users can read quote line items"
on public.quote_line_items for select
using (
  exists (
    select 1
    from public.quotes
    join public.jobs on jobs.id = quotes.job_id
    where quotes.id = quote_line_items.quote_id
    and jobs.company_id = public.current_company_id()
  )
);

create policy "company users can insert quote line items"
on public.quote_line_items for insert
with check (
  exists (
    select 1
    from public.quotes
    join public.jobs on jobs.id = quotes.job_id
    where quotes.id = quote_line_items.quote_id
    and jobs.company_id = public.current_company_id()
  )
);

create policy "company users can update quote line items"
on public.quote_line_items for update
using (
  exists (
    select 1
    from public.quotes
    join public.jobs on jobs.id = quotes.job_id
    where quotes.id = quote_line_items.quote_id
    and jobs.company_id = public.current_company_id()
  )
)
with check (
  exists (
    select 1
    from public.quotes
    join public.jobs on jobs.id = quotes.job_id
    where quotes.id = quote_line_items.quote_id
    and jobs.company_id = public.current_company_id()
  )
);

create policy "company users can delete quote line items"
on public.quote_line_items for delete
using (
  exists (
    select 1
    from public.quotes
    join public.jobs on jobs.id = quotes.job_id
    where quotes.id = quote_line_items.quote_id
    and jobs.company_id = public.current_company_id()
  )
);

-- Seed shape for first account:
-- 1. Create an Auth user in Supabase.
-- 2. Insert a company, then insert public.users with the auth user id and company id.
-- 3. Insert technicians for that company.
